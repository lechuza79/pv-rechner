/**
 * MaStR data refresh — fetches the latest open-mastr Zenodo CSV dump,
 * aggregates per region × energy type × segment × year, and upserts
 * the result into Supabase (mastr_regions, mastr_aggregates, mastr_meta).
 *
 * Phased execution so we can iterate. Current session implements phase 1
 * (inspect) only; phases 2 + 3 follow when the real CSV schema is known.
 *
 *   npm run mastr:refresh -- --inspect        # phase 1: download + schema report
 *   npm run mastr:refresh -- --aggregate      # phase 2: TODO
 *   npm run mastr:refresh -- --upload         # phase 3: TODO
 *
 * Requirements:
 *   - Node 20+ (native fetch, streaming)
 *   - Disk: ~4 GB free under scripts/.cache (1.4 GB ZIP + extracted CSV)
 *   - Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (only for --upload phase)
 */

import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as unzipper from "unzipper";
import { parse as csvParse } from "csv-parse";

// open-mastr Zenodo concept DOI — /versions/latest resolves to the current release
const ZENODO_CONCEPT_ID = "6807425";
const ZENODO_API = `https://zenodo.org/api/records/${ZENODO_CONCEPT_ID}/versions/latest`;

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(SCRIPT_DIR, ".cache");
const SCHEMA_OUT = resolve(SCRIPT_DIR, "mastr-schema.json");
const SAMPLE_ROWS = 3;

type ZenodoFile = {
  key: string;
  size: number;
  links: { self: string };
  checksum: string;
};
type ZenodoRecord = {
  id: number;
  metadata: { version: string; publication_date: string; title: string };
  files: ZenodoFile[];
};

function log(msg: string, kind: "info" | "ok" | "warn" | "err" = "info") {
  const prefix = { info: "•", ok: "✓", warn: "!", err: "✗" }[kind];
  process.stderr.write(`${prefix} ${msg}\n`);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

async function fetchLatestRecord(): Promise<ZenodoRecord> {
  log(`Resolving latest Zenodo version for concept ${ZENODO_CONCEPT_ID}...`);
  const res = await fetch(ZENODO_API, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Zenodo API ${res.status}: ${await res.text().catch(() => "")}`);
  const rec = (await res.json()) as ZenodoRecord;
  log(
    `Record id=${rec.id}, version=${rec.metadata.version}, published=${rec.metadata.publication_date}`,
    "ok",
  );
  return rec;
}

async function downloadFile(file: ZenodoFile, destPath: string): Promise<void> {
  if (existsSync(destPath) && statSync(destPath).size === file.size) {
    log(`Cached: ${file.key} (${formatBytes(file.size)})`, "ok");
    return;
  }

  log(`Downloading ${file.key} (${formatBytes(file.size)})...`);
  const res = await fetch(file.links.self);
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`);

  let received = 0;
  const total = file.size;
  let lastLogPct = 0;
  const reader = res.body.getReader();
  const tapped = new ReadableStream({
    async start(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        const pct = Math.floor((received / total) * 100);
        if (pct >= lastLogPct + 5) {
          lastLogPct = pct;
          process.stderr.write(`\r  ${pct}% (${formatBytes(received)} / ${formatBytes(total)})`);
        }
        controller.enqueue(value);
      }
      controller.close();
    },
  });
  process.stderr.write("\n");

  mkdirSync(dirname(destPath), { recursive: true });
  // @ts-expect-error — ReadableStream → Readable conversion in Node
  await pipeline(Readable.fromWeb(tapped), createWriteStream(destPath));
  log(`Saved to ${destPath}`, "ok");
}

type EntryInfo = {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
};

async function listZipEntries(zipPath: string): Promise<EntryInfo[]> {
  const directory = await unzipper.Open.file(zipPath);
  return directory.files
    .filter((f) => f.type === "File")
    .map((f) => ({
      name: f.path,
      compressedSize: f.compressedSize,
      uncompressedSize: f.uncompressedSize,
    }))
    .sort((a, b) => b.uncompressedSize - a.uncompressedSize);
}

async function sampleCsvEntry(
  zipPath: string,
  entryName: string,
  rows: number,
): Promise<{ headers: string[]; samples: Record<string, string>[] }> {
  const directory = await unzipper.Open.file(zipPath);
  const entry = directory.files.find((f) => f.path === entryName);
  if (!entry) throw new Error(`Entry not found: ${entryName}`);

  return new Promise((resolvePromise, reject) => {
    const stream = entry.stream();
    const parser = csvParse({
      columns: true,
      delimiter: ";",
      quote: '"',
      escape: '"',
      skip_empty_lines: true,
      relax_column_count: true,
      to: rows,
    });

    const samples: Record<string, string>[] = [];
    let headers: string[] = [];

    parser.on("readable", () => {
      let row: Record<string, string> | null;
      while ((row = parser.read()) !== null) {
        if (headers.length === 0) headers = Object.keys(row);
        samples.push(row);
      }
    });
    parser.on("end", () => resolvePromise({ headers, samples }));
    parser.on("error", reject);
    stream.on("error", reject);

    // Stop reading after we have enough rows
    parser.once("end", () => stream.destroy());

    stream.pipe(parser);
  });
}

async function phaseInspect(rec: ZenodoRecord): Promise<void> {
  mkdirSync(CACHE_DIR, { recursive: true });

  log(`Record files: ${rec.files.length}`);
  for (const f of rec.files) {
    log(`  - ${f.key} (${formatBytes(f.size)})`);
  }

  // Download all files (usually just one big ZIP)
  for (const f of rec.files) {
    const dest = resolve(CACHE_DIR, f.key);
    await downloadFile(f, dest);
  }

  // Inspect ZIP contents
  const zipFiles = rec.files.filter((f) => f.key.endsWith(".zip"));
  const schemas: Record<
    string,
    {
      zip: string;
      uncompressedSize: number;
      headers: string[];
      samples: Record<string, string>[];
    }
  > = {};

  for (const zf of zipFiles) {
    const zipPath = resolve(CACHE_DIR, zf.key);
    log(`Listing entries in ${zf.key}...`);
    const entries = await listZipEntries(zipPath);
    log(`  ${entries.length} entries (sorted by size)`);
    for (const e of entries.slice(0, 20)) {
      log(`    - ${e.name} (${formatBytes(e.uncompressedSize)})`);
    }

    // Sample each CSV entry for schema discovery
    const csvs = entries.filter((e) => e.name.toLowerCase().endsWith(".csv"));
    log(`  inspecting ${csvs.length} CSV files...`);
    for (const entry of csvs) {
      try {
        const { headers, samples } = await sampleCsvEntry(zipPath, entry.name, SAMPLE_ROWS);
        schemas[entry.name] = {
          zip: zf.key,
          uncompressedSize: entry.uncompressedSize,
          headers,
          samples,
        };
        log(`    ${entry.name}: ${headers.length} columns, ${samples.length} sample rows`, "ok");
      } catch (err) {
        log(`    ${entry.name}: FAILED — ${(err as Error).message}`, "warn");
      }
    }
  }

  await writeFile(SCHEMA_OUT, JSON.stringify({ record: rec.id, version: rec.metadata.version, schemas }, null, 2));
  log(`Schema written to ${SCHEMA_OUT}`, "ok");
  log(
    `Next: inspect scripts/mastr-schema.json to identify columns for ` +
      `Energietraeger, Bruttoleistung, Gemeindeschluessel, Personenart, Lage, Inbetriebnahme.`,
    "info",
  );
}

async function phaseAggregate(): Promise<void> {
  throw new Error("phase 2 (aggregate): TODO — implement once CSV schema is confirmed from mastr-schema.json");
}

async function phaseUpload(): Promise<void> {
  throw new Error("phase 3 (upload): TODO — requires aggregated output from phase 2");
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const doInspect = args.has("--inspect") || args.size === 0;
  const doAggregate = args.has("--aggregate");
  const doUpload = args.has("--upload");

  if (doInspect) {
    const rec = await fetchLatestRecord();
    await phaseInspect(rec);
  }
  if (doAggregate) await phaseAggregate();
  if (doUpload) await phaseUpload();

  log("Done.", "ok");
}

main().catch((err) => {
  log((err as Error).message, "err");
  process.exit(1);
});
