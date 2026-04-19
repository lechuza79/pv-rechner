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
      delimiter: ",",
      quote: '"',
      escape: '"',
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      bom: true,
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

// ─── Phase 2: Aggregation ─────────────────────────────────────────────────────

const AGGREGATES_OUT = resolve(SCRIPT_DIR, ".cache", "aggregates.json");

const UNIT_FILES: { et: "solar" | "wind" | "biomasse" | "wasser" | "speicher"; csv: string }[] = [
  { et: "solar", csv: "bnetza_mastr_solar_raw.csv" },
  { et: "wind", csv: "bnetza_mastr_wind_raw.csv" },
  { et: "biomasse", csv: "bnetza_mastr_biomass_raw.csv" },
  { et: "wasser", csv: "bnetza_mastr_hydro_raw.csv" },
  { et: "speicher", csv: "bnetza_mastr_storage_raw.csv" },
];
const ACTORS_CSV = "bnetza_mastr_market_actors_raw.csv";

type ActorKind = "privat" | "gewerbe";
type AggregateKey = `${string}|${string}|${string}|${number}`; // region_id|et|segment|year
type AggregateValue = { count: number; kwp: number };
type RegionMeta = { level: "bundesland" | "landkreis"; name: string; parent: string };

function findZipPath(): string {
  // Cache dir has exactly one .zip (the Zenodo dump)
  const entries = require("node:fs").readdirSync(CACHE_DIR) as string[];
  const zip = entries.find((n) => n.endsWith(".zip"));
  if (!zip) throw new Error(`No .zip found in ${CACHE_DIR}. Run --inspect first.`);
  return resolve(CACHE_DIR, zip);
}

function streamCsvEntry<T>(
  zipPath: string,
  entryNameMatcher: (path: string) => boolean,
  onRow: (row: Record<string, string>, rowIdx: number) => void,
): Promise<number> {
  return new Promise(async (resolvePromise, reject) => {
    try {
      const directory = await unzipper.Open.file(zipPath);
      const entry = directory.files.find((f) => f.type === "File" && entryNameMatcher(f.path));
      if (!entry) throw new Error(`CSV entry matching predicate not found in ${zipPath}`);

      const stream = entry.stream();
      const parser = csvParse({
        columns: true,
        delimiter: ",",
        quote: '"',
        escape: '"',
        skip_empty_lines: true,
        relax_column_count: true,
        relax_quotes: true,
        bom: true,
      });

      let idx = 0;
      parser.on("readable", () => {
        let row: Record<string, string> | null;
        while ((row = parser.read()) !== null) {
          onRow(row, idx++);
        }
      });
      parser.on("end", () => resolvePromise(idx));
      parser.on("error", reject);
      stream.on("error", reject);
      stream.pipe(parser);
    } catch (err) {
      reject(err);
    }
  });
}

async function buildActorMap(zipPath: string): Promise<Map<string, ActorKind>> {
  const map = new Map<string, ActorKind>();
  const total = await streamCsvEntry(
    zipPath,
    (p) => p.endsWith(ACTORS_CSV),
    (row, i) => {
      const nr = row.MastrNummer;
      const kind = row.Personenart;
      if (!nr || !kind) return;
      map.set(nr, kind === "Natürliche Person" ? "privat" : "gewerbe");
      if (i > 0 && i % 500_000 === 0) {
        process.stderr.write(`\r  actors: ${i.toLocaleString()} rows, ${map.size.toLocaleString()} classified`);
      }
    },
  );
  process.stderr.write("\n");
  log(`Actor map built: ${map.size.toLocaleString()} entries (${total.toLocaleString()} rows scanned)`, "ok");
  return map;
}

function classifySolarSegment(row: Record<string, string>, actorMap: Map<string, ActorKind>): string {
  const lage = (row.Lage ?? "").toLowerCase();
  if (lage.includes("freifläche") || lage.includes("freiflaeche")) return "freiflaeche";
  const nr = row.AnlagenbetreiberMastrNummer;
  const kind = nr ? actorMap.get(nr) : undefined;
  return kind === "privat" ? "privat_dach" : "gewerbe_dach";
}

function parseYear(s: string | undefined): number | null {
  if (!s || s.length < 4) return null;
  const y = parseInt(s.substring(0, 4), 10);
  if (isNaN(y) || y < 1900 || y > 2100) return null;
  return y;
}

async function aggregateUnit(
  zipPath: string,
  csvBasename: string,
  et: "solar" | "wind" | "biomasse" | "wasser" | "speicher",
  actorMap: Map<string, ActorKind>,
  agg: Map<AggregateKey, AggregateValue>,
  regions: Map<string, RegionMeta>,
): Promise<{ processed: number; accepted: number; skipped: Record<string, number> }> {
  const skipped = { status: 0, gks: 0, year: 0, kwp: 0 };
  let accepted = 0;

  const total = await streamCsvEntry(
    zipPath,
    (p) => p.endsWith(csvBasename),
    (row, i) => {
      if (row.EinheitBetriebsstatus !== "In Betrieb") {
        skipped.status++;
        return;
      }
      const gks = row.Gemeindeschluessel?.trim();
      if (!gks || gks.length < 5) {
        skipped.gks++;
        return;
      }
      const year = parseYear(row.Inbetriebnahmedatum);
      if (!year) {
        skipped.year++;
        return;
      }
      const kwp = parseFloat(row.Bruttoleistung ?? "0");
      if (!kwp || kwp <= 0) {
        skipped.kwp++;
        return;
      }

      const regionId = gks.substring(0, 5);
      const blAgs = gks.substring(0, 2);

      // Collect region metadata (first occurrence wins)
      if (!regions.has(regionId) && row.Landkreis) {
        regions.set(regionId, { level: "landkreis", name: row.Landkreis, parent: blAgs });
      }

      const segment = et === "solar" ? classifySolarSegment(row, actorMap) : "n/a";

      const key: AggregateKey = `${regionId}|${et}|${segment}|${year}`;
      const existing = agg.get(key);
      if (existing) {
        existing.count++;
        existing.kwp += kwp;
      } else {
        agg.set(key, { count: 1, kwp });
      }
      accepted++;
      if (i > 0 && i % 200_000 === 0) {
        process.stderr.write(
          `\r  ${et}: ${i.toLocaleString()} rows, ${accepted.toLocaleString()} accepted, ${agg.size.toLocaleString()} buckets`,
        );
      }
    },
  );
  process.stderr.write("\n");
  return { processed: total, accepted, skipped };
}

async function phaseAggregate(): Promise<void> {
  const zipPath = findZipPath();
  log(`Aggregating from ${basename(zipPath)}`);

  log("Step 1/3: building actor map (~6M rows, ~500 MB RAM)...");
  const actorMap = await buildActorMap(zipPath);

  log("Step 2/3: streaming unit CSVs...");
  const agg = new Map<AggregateKey, AggregateValue>();
  const regions = new Map<string, RegionMeta>();

  for (const { et, csv } of UNIT_FILES) {
    log(`  aggregating ${et} (${csv})...`);
    const r = await aggregateUnit(zipPath, csv, et, actorMap, agg, regions);
    log(
      `    ${et}: ${r.accepted.toLocaleString()} accepted / ${r.processed.toLocaleString()} total ` +
        `(skipped: status=${r.skipped.status}, gks=${r.skipped.gks}, year=${r.skipped.year}, kwp=${r.skipped.kwp})`,
      "ok",
    );
  }

  // Release actor map memory before writing output
  actorMap.clear();

  log(`Step 3/3: writing aggregates.json (${agg.size.toLocaleString()} buckets, ${regions.size} landkreise)`);
  const aggregates = Array.from(agg.entries()).map(([key, val]) => {
    const [region_id, energietraeger, segment, yearStr] = key.split("|");
    return {
      region_id,
      energietraeger,
      segment,
      year: parseInt(yearStr, 10),
      count: val.count,
      kwp: Math.round(val.kwp * 100) / 100,
    };
  });

  const regionsArray = Array.from(regions.entries()).map(([region_id, meta]) => ({
    region_id,
    ...meta,
  }));

  await writeFile(
    AGGREGATES_OUT,
    JSON.stringify({ generated_at: new Date().toISOString(), aggregates, regions: regionsArray }, null, 0),
  );
  log(`Aggregates written to ${AGGREGATES_OUT}`, "ok");
}

// ─── Phase 3: Supabase upload ─────────────────────────────────────────────────

async function phaseUpload(): Promise<void> {
  loadEnvFile();
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env. Put them in .env.local.");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { readFile } = await import("node:fs/promises");
  const payload = JSON.parse(await readFile(AGGREGATES_OUT, "utf8"));
  const { aggregates, regions, generated_at } = payload as {
    aggregates: { region_id: string; energietraeger: string; segment: string; year: number; count: number; kwp: number }[];
    regions: { region_id: string; level: "landkreis"; name: string; parent: string }[];
    generated_at: string;
  };

  // 1. Build region hierarchy: DE + 16 Bundesländer + N Landkreise
  const BUNDESLAND_NAMES: Record<string, string> = {
    "01": "Schleswig-Holstein", "02": "Hamburg", "03": "Niedersachsen", "04": "Bremen",
    "05": "Nordrhein-Westfalen", "06": "Hessen", "07": "Rheinland-Pfalz", "08": "Baden-Württemberg",
    "09": "Bayern", "10": "Saarland", "11": "Berlin", "12": "Brandenburg",
    "13": "Mecklenburg-Vorpommern", "14": "Sachsen", "15": "Sachsen-Anhalt", "16": "Thüringen",
  };

  const regionsRows = [
    { region_id: "de", level: "de", parent_region_id: null, name: "Deutschland" },
    ...Object.entries(BUNDESLAND_NAMES).map(([ags, name]) => ({
      region_id: ags,
      level: "bundesland",
      parent_region_id: "de",
      name,
    })),
    ...regions.map((r) => ({
      region_id: r.region_id,
      level: r.level,
      parent_region_id: r.parent,
      name: r.name,
    })),
  ];

  log(`Upserting ${regionsRows.length} regions...`);
  for (let i = 0; i < regionsRows.length; i += 500) {
    const batch = regionsRows.slice(i, i + 500);
    const { error } = await supabase.from("mastr_regions").upsert(batch, { onConflict: "region_id" });
    if (error) throw new Error(`mastr_regions upsert failed: ${error.message}`);
  }
  log(`Regions upserted`, "ok");

  // 2. Aggregates: full replace strategy (delete + insert batched)
  log(`Deleting existing aggregates...`);
  const { error: delErr } = await supabase.from("mastr_aggregates").delete().gte("year", 0);
  if (delErr) throw new Error(`delete failed: ${delErr.message}`);

  log(`Inserting ${aggregates.length.toLocaleString()} aggregate rows (batches of 1000)...`);
  const BATCH = 1000;
  for (let i = 0; i < aggregates.length; i += BATCH) {
    const batch = aggregates.slice(i, i + BATCH);
    const { error } = await supabase.from("mastr_aggregates").insert(batch);
    if (error) throw new Error(`mastr_aggregates insert failed at batch ${i}: ${error.message}`);
    if ((i / BATCH) % 10 === 0) {
      process.stderr.write(`\r  ${i.toLocaleString()} / ${aggregates.length.toLocaleString()}`);
    }
  }
  process.stderr.write("\n");
  log(`Aggregates upserted`, "ok");

  // 3. Meta
  const totalUnits = aggregates.reduce((s, a) => s + a.count, 0);
  const { error: metaErr } = await supabase
    .from("mastr_meta")
    .upsert(
      {
        id: 1,
        source_version: "zenodo:6807425",
        source_url: "https://zenodo.org/records/6807425",
        imported_at: generated_at,
        total_units_imported: totalUnits,
        notes: `Aggregated from open-mastr Zenodo dump. ${aggregates.length} buckets, ${regionsRows.length} regions.`,
      },
      { onConflict: "id" },
    );
  if (metaErr) throw new Error(`mastr_meta upsert failed: ${metaErr.message}`);
  log(`Meta row updated. Imported ${totalUnits.toLocaleString()} units total.`, "ok");
}

// ─── .env.local loader (minimal) ──────────────────────────────────────────────

function loadEnvFile(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const content = require("node:fs").readFileSync(path, "utf8") as string;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const k = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = val;
  }
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
