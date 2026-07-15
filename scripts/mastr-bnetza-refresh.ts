/**
 * MaStR data refresh — pulls the BNetzA Gesamtdatenexport (monthly XML dump),
 * aggregates per region × energy type × segment × year, and upserts the result
 * into Supabase (mastr_regions, mastr_aggregates, mastr_meta).
 *
 * Replaces the open-mastr Zenodo path (scripts/mastr-refresh.ts), which is
 * only updated annually. The BNetzA dump refreshes daily (~05:00 UTC) and is
 * the authoritative source.
 *
 *   npm run mastr:refresh-bnetza -- --download         # phase 1: download ZIP only
 *   npm run mastr:refresh-bnetza -- --inspect          # phase 2: list ZIP, sample fields
 *   npm run mastr:refresh-bnetza -- --aggregate        # phase 3: stream XML, aggregate
 *   npm run mastr:refresh-bnetza -- --upload           # phase 4: upsert into Supabase
 *
 * Requirements:
 *   - Node 20+ (native fetch, streaming)
 *   - Disk: ~6 GB free under scripts/.cache (3 GB ZIP, no extraction needed)
 *   - Env (only for --upload): SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as unzipper from "unzipper";
import iconv from "iconv-lite";
import sax from "sax";

// ─── Config ───────────────────────────────────────────────────────────────────

const BNETZA_BASE = "https://download.marktstammdatenregister.de";
// Schema version is part of the filename (e.g. "26.1"). It changes rarely (after
// major schema revisions). Override via env if a newer version is published.
const DEFAULT_SCHEMA_VERSION = process.env.BNETZA_SCHEMA_VERSION ?? "26.1";
// How many days to walk back if today's filename is not yet published.
const URL_LOOKBACK_DAYS = 7;

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(SCRIPT_DIR, ".cache", "bnetza");
const SCHEMA_OUT = resolve(SCRIPT_DIR, "mastr-bnetza-schema.json");
const AGGREGATES_OUT = resolve(CACHE_DIR, "aggregates.json");

// ─── Types ────────────────────────────────────────────────────────────────────

type Energietraeger = "solar" | "wind" | "biomasse" | "wasser" | "speicher";

type ActorKind = "privat" | "gewerbe";
type AggregateKey = `${string}|${string}|${string}|${number}`;
type AggregateValue = { count: number; kwp: number };
type RegionLevel = "landkreis" | "gemeinde";
type RegionMeta = { level: RegionLevel; name: string; parent: string };

type UnitSpec = {
  et: Energietraeger;
  filePattern: RegExp;       // matches XML entry name inside the ZIP
  recordTag: string;          // XML element for one unit record
};

// File names follow the pattern <EntityType>_<n>.xml (e.g. EinheitenSolar_1.xml).
// The record element is the entity tag in singular (without "Einheiten" prefix).
const UNIT_SPECS: UnitSpec[] = [
  { et: "solar",     filePattern: /^EinheitenSolar(_\d+)?\.xml$/i,         recordTag: "EinheitSolar" },
  { et: "wind",      filePattern: /^EinheitenWind(_\d+)?\.xml$/i,           recordTag: "EinheitWind" },
  { et: "biomasse",  filePattern: /^EinheitenBiomasse(_\d+)?\.xml$/i,       recordTag: "EinheitBiomasse" },
  { et: "wasser",    filePattern: /^EinheitenWasser(_\d+)?\.xml$/i,         recordTag: "EinheitWasser" },
  { et: "speicher",  filePattern: /^EinheitenStromSpeicher(_\d+)?\.xml$/i,  recordTag: "EinheitStromSpeicher" },
];

const ACTORS_FILE_PATTERN = /^Marktakteure(_\d+)?\.xml$/i;
const ACTORS_RECORD_TAG = "Marktakteur";

// ─── BNetzA Katalog-Codes ──────────────────────────────────────────────────────
// XML uses numeric codes for enum-like fields; the full mapping lives in
// Katalogwerte.xml. We only need a small subset for aggregation. Source:
// Katalogwerte.xml of Gesamtdatenexport_20260510_26.1.zip (cat. 4, 22, 27, 57, 82).

const STATUS_IN_BETRIEB = "35";  // EinheitBetriebsstatus

// Personenart (cat. 27). 517 = Organisation/juristische Person (mapped to
// "gewerbe" by default); we only need the natural-person code as the explicit
// positive signal.
const PERSON_NATUERLICH = "518";

// ArtDerSolaranlage (cat. 82) — high-level solar classification.
// 853 = Gebäudesolaranlage (default bucket; further split by Nutzungsbereich),
// 2484 = Sonstige (treated like 853 — fall through to Nutzungsbereich/actor).
const SOLAR_ART_FREIFLAECHE = "852";
const SOLAR_ART_BALKON = "2961";

// SolarNutzungsbereich (cat. 57) — building usage profile
const NUTZUNG_HAUSHALT = "713";

// ─── Logging helpers ──────────────────────────────────────────────────────────

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

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
}

// ─── URL discovery ────────────────────────────────────────────────────────────

type ResolvedUrl = {
  url: string;
  filename: string;
  size: number;
  lastModified: string;
  dataAsOf: string; // YYYY-MM-DD
};

async function resolveLatestUrl(schemaVersion: string): Promise<ResolvedUrl> {
  const today = new Date();
  const errors: string[] = [];
  for (let offset = 0; offset <= URL_LOOKBACK_DAYS; offset++) {
    const d = new Date(today.getTime() - offset * 86400_000);
    const stamp = dateStamp(d);
    const filename = `Gesamtdatenexport_${stamp}_${schemaVersion}.zip`;
    const url = `${BNETZA_BASE}/${filename}`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        const size = Number(res.headers.get("content-length") ?? 0);
        const lastModified = res.headers.get("last-modified") ?? "";
        const dataAsOf = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
        return { url, filename, size, lastModified, dataAsOf };
      }
      errors.push(`${stamp}: ${res.status}`);
    } catch (err) {
      errors.push(`${stamp}: ${(err as Error).message}`);
    }
  }
  throw new Error(
    `No BNetzA dump found in the last ${URL_LOOKBACK_DAYS + 1} days. ` +
      `Schema version "${schemaVersion}" may be outdated — set BNETZA_SCHEMA_VERSION env var. ` +
      `Tried: ${errors.join(", ")}`,
  );
}

// ─── Phase 1: Download ────────────────────────────────────────────────────────

async function downloadZip(target: ResolvedUrl): Promise<string> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const destPath = resolve(CACHE_DIR, target.filename);

  if (existsSync(destPath) && statSync(destPath).size === target.size) {
    log(`Cached: ${target.filename} (${formatBytes(target.size)})`, "ok");
    return destPath;
  }

  log(`Downloading ${target.filename} (${formatBytes(target.size)})...`);
  const res = await fetch(target.url);
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`);

  let received = 0;
  const total = target.size;
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

  // @ts-expect-error — ReadableStream → Readable conversion in Node
  await pipeline(Readable.fromWeb(tapped), createWriteStream(destPath));
  log(`Saved to ${destPath}`, "ok");
  return destPath;
}

async function phaseDownload(schemaVersion: string): Promise<{ zipPath: string; resolved: ResolvedUrl }> {
  const resolved = await resolveLatestUrl(schemaVersion);
  log(`Resolved: ${resolved.url}`);
  log(`  Last-Modified: ${resolved.lastModified}`);
  log(`  data_as_of:    ${resolved.dataAsOf}`);
  log(`  Size:          ${formatBytes(resolved.size)}`);
  const zipPath = await downloadZip(resolved);
  // Persist the resolved metadata so later phases (--aggregate, --upload) can
  // read data_as_of without a network round-trip.
  await writeFile(
    resolve(CACHE_DIR, "resolved.json"),
    JSON.stringify(resolved, null, 2),
  );
  return { zipPath, resolved };
}

function findCachedZip(): string {
  if (!existsSync(CACHE_DIR)) {
    throw new Error(`Cache dir does not exist: ${CACHE_DIR}. Run --download first.`);
  }
  const entries = readdirSync(CACHE_DIR);
  const zip = entries.find((n) => n.startsWith("Gesamtdatenexport_") && n.endsWith(".zip"));
  if (!zip) throw new Error(`No cached BNetzA ZIP found in ${CACHE_DIR}. Run --download first.`);
  return resolve(CACHE_DIR, zip);
}

function readCachedResolved(): ResolvedUrl {
  const path = resolve(CACHE_DIR, "resolved.json");
  if (!existsSync(path)) {
    throw new Error(`No resolved.json in ${CACHE_DIR}. Run --download first.`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as ResolvedUrl;
}

// ─── ZIP entry helpers ────────────────────────────────────────────────────────

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

// ─── XML streaming (UTF-16 → sax) ─────────────────────────────────────────────

/**
 * Streams XML records from a single ZIP entry. The entry is decoded from
 * UTF-16LE to JS strings (iconv-lite) and fed into a strict sax parser.
 * For every closing tag matching `recordTag`, the accumulated child fields
 * are passed to onRecord. Returns total record count.
 *
 * Memory: only one record is held at a time (fields are flat key/value).
 */
async function streamXmlRecords(
  zipPath: string,
  entryName: string,
  recordTag: string,
  onRecord: (record: Record<string, string>) => void,
): Promise<number> {
  const directory = await unzipper.Open.file(zipPath);
  const entry = directory.files.find((f) => f.path === entryName && f.type === "File");
  if (!entry) throw new Error(`Entry not found in ZIP: ${entryName}`);

  return new Promise((resolvePromise, reject) => {
    const parser = sax.createStream(true, { trim: true, normalize: false });
    let inRecord = false;
    let recordDepth = 0;
    let currentField: string | null = null;
    let textBuffer = "";
    let currentRecord: Record<string, string> | null = null;
    let count = 0;

    parser.on("opentag", (tag: { name: string }) => {
      if (!inRecord) {
        if (tag.name === recordTag) {
          inRecord = true;
          recordDepth = 0;
          currentRecord = {};
        }
        return;
      }
      recordDepth++;
      if (recordDepth === 1) {
        currentField = tag.name;
        textBuffer = "";
      }
    });

    parser.on("text", (txt: string) => {
      if (inRecord && currentField && recordDepth === 1) textBuffer += txt;
    });

    parser.on("cdata", (txt: string) => {
      if (inRecord && currentField && recordDepth === 1) textBuffer += txt;
    });

    parser.on("closetag", (name: string) => {
      if (!inRecord) return;
      if (recordDepth === 0 && name === recordTag) {
        if (currentRecord) onRecord(currentRecord);
        count++;
        inRecord = false;
        currentRecord = null;
        currentField = null;
        return;
      }
      if (recordDepth === 1 && currentField === name) {
        if (currentRecord) currentRecord[name] = textBuffer;
        currentField = null;
        textBuffer = "";
      }
      recordDepth--;
    });

    parser.on("error", (err: Error) => {
      // sax error handling: resume after error to keep streaming
      reject(err);
    });

    parser.on("end", () => resolvePromise(count));

    const stream = entry.stream();
    stream.on("error", reject);
    // iconv-lite decode stream emits JS strings; sax.createStream accepts
    // strings via .write(). Pipe is okay because sax stream is a Writable.
    const decoded = stream.pipe(iconv.decodeStream("utf-16le"));
    decoded.on("error", reject);
    decoded.pipe(parser);
  });
}

// ─── Phase 2: Inspect ─────────────────────────────────────────────────────────

async function phaseInspect(): Promise<void> {
  const zipPath = findCachedZip();
  log(`Inspecting ${basename(zipPath)}`);

  const entries = await listZipEntries(zipPath);
  log(`  ${entries.length} entries (top 30 by size):`);
  for (const e of entries.slice(0, 30)) {
    log(`    - ${e.name} (${formatBytes(e.uncompressedSize)})`);
  }

  // Sample a few records from each unit type + actors
  const samples: Record<
    string,
    { entry: string; recordTag: string; fields: string[]; records: Record<string, string>[] }
  > = {};

  for (const spec of UNIT_SPECS) {
    const match = entries.find((e) => spec.filePattern.test(e.name));
    if (!match) {
      log(`  ${spec.et}: no matching XML entry — skipping`, "warn");
      continue;
    }
    log(`  Sampling ${match.name} (recordTag=${spec.recordTag})...`);
    const records: Record<string, string>[] = [];
    let stopped = false;
    try {
      await streamXmlRecords(zipPath, match.name, spec.recordTag, (rec) => {
        if (records.length < 3) records.push(rec);
        if (records.length >= 3 && !stopped) {
          stopped = true;
          // Throw to abort the stream early — we only need samples.
          throw new Error("__sample_done__");
        }
      });
    } catch (err) {
      if ((err as Error).message !== "__sample_done__") throw err;
    }
    const fields = Array.from(new Set(records.flatMap((r) => Object.keys(r)))).sort();
    samples[spec.et] = { entry: match.name, recordTag: spec.recordTag, fields, records };
    log(`    ${spec.et}: ${records.length} samples, ${fields.length} unique fields`, "ok");
  }

  // Actors
  const actorMatch = entries.find((e) => ACTORS_FILE_PATTERN.test(e.name));
  if (actorMatch) {
    log(`  Sampling ${actorMatch.name} (recordTag=${ACTORS_RECORD_TAG})...`);
    const records: Record<string, string>[] = [];
    let stopped = false;
    try {
      await streamXmlRecords(zipPath, actorMatch.name, ACTORS_RECORD_TAG, (rec) => {
        if (records.length < 3) records.push(rec);
        if (records.length >= 3 && !stopped) {
          stopped = true;
          throw new Error("__sample_done__");
        }
      });
    } catch (err) {
      if ((err as Error).message !== "__sample_done__") throw err;
    }
    const fields = Array.from(new Set(records.flatMap((r) => Object.keys(r)))).sort();
    samples["actors"] = {
      entry: actorMatch.name,
      recordTag: ACTORS_RECORD_TAG,
      fields,
      records,
    };
    log(`    actors: ${records.length} samples, ${fields.length} unique fields`, "ok");
  }

  await writeFile(
    SCHEMA_OUT,
    JSON.stringify(
      {
        zip: basename(zipPath),
        inspected_at: new Date().toISOString(),
        entries: entries.slice(0, 100),
        samples,
      },
      null,
      2,
    ),
  );
  log(`Schema written to ${SCHEMA_OUT}`, "ok");
}

// ─── Phase 3: Aggregate ───────────────────────────────────────────────────────

function classifySolarSegment(
  row: Record<string, string>,
  actorMap: Map<string, ActorKind>,
): string {
  // Primary signal: ArtDerSolaranlage (Freifläche / Gebäude / Balkonkraftwerk).
  const art = row.ArtDerSolaranlage;
  if (art === SOLAR_ART_FREIFLAECHE) return "freiflaeche";
  // Steckersolar is its own segment, not a small privat_dach: it is a quarter of
  // all units but a rounding error in capacity, and Balkonkraftwerk subsidies are
  // the most common municipal funding programme — so the count is exactly what a
  // Gemeinde wants to see about its own scheme.
  if (art === SOLAR_ART_BALKON) return "steckersolar";

  // Gebäude-Solar: split into privat / gewerbe via Nutzungsbereich (preferred,
  // explicitly captured by the operator) and fall back to actor type.
  const nutzung = row.Nutzungsbereich;
  if (nutzung === NUTZUNG_HAUSHALT) return "privat_dach";
  if (nutzung && nutzung !== "") return "gewerbe_dach";

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

function parseKwp(s: string | undefined): number {
  if (!s) return 0;
  // BNetzA uses dot as decimal separator in the XML (verified in samples);
  // accept comma as a defensive fallback.
  const v = parseFloat(s.replace(",", "."));
  return isNaN(v) ? 0 : v;
}

async function buildActorMap(zipPath: string): Promise<Map<string, ActorKind>> {
  const directory = await unzipper.Open.file(zipPath);
  const actorEntries = directory.files
    .filter((f) => f.type === "File" && ACTORS_FILE_PATTERN.test(f.path))
    .map((f) => f.path);
  if (actorEntries.length === 0) {
    log(`No Marktakteure XML found — skipping actor map`, "warn");
    return new Map();
  }

  const map = new Map<string, ActorKind>();
  let totalRows = 0;
  for (const entryName of actorEntries) {
    let rowsHere = 0;
    await streamXmlRecords(zipPath, entryName, ACTORS_RECORD_TAG, (row) => {
      rowsHere++;
      const nr = row.MastrNummer;
      const kind = row.Personenart;
      if (!nr || !kind) return;
      // Personenart in BNetzA XML is a numeric code (cat. 27): 518 = natürliche
      // Person, 517 = Organisation/juristische Person. open-mastr CSV resolved
      // this to plain text — the catalog mapping is the equivalent here.
      map.set(nr, kind === PERSON_NATUERLICH ? "privat" : "gewerbe");
      if (totalRows + rowsHere > 0 && (totalRows + rowsHere) % 500_000 === 0) {
        process.stderr.write(
          `\r  actors: ${(totalRows + rowsHere).toLocaleString()} rows, ${map.size.toLocaleString()} classified`,
        );
      }
    });
    totalRows += rowsHere;
  }
  process.stderr.write("\n");
  log(`Actor map built: ${map.size.toLocaleString()} entries (${totalRows.toLocaleString()} rows scanned)`, "ok");
  return map;
}

async function aggregateUnit(
  zipPath: string,
  spec: UnitSpec,
  actorMap: Map<string, ActorKind>,
  agg: Map<AggregateKey, AggregateValue>,
  regions: Map<string, RegionMeta>,
): Promise<{ processed: number; accepted: number; skipped: Record<string, number> }> {
  const directory = await unzipper.Open.file(zipPath);
  const unitEntries = directory.files
    .filter((f) => f.type === "File" && spec.filePattern.test(f.path))
    .map((f) => f.path);

  if (unitEntries.length === 0) {
    log(`  ${spec.et}: no matching XML entries`, "warn");
    return { processed: 0, accepted: 0, skipped: { status: 0, gks: 0, year: 0, kwp: 0 } };
  }

  const skipped = { status: 0, gks: 0, gksShort: 0, year: 0, kwp: 0 };
  let accepted = 0;
  let processed = 0;

  for (const entryName of unitEntries) {
    await streamXmlRecords(zipPath, entryName, spec.recordTag, (row) => {
      processed++;
      // BNetzA XML stores Betriebsstatus as a numeric code (cat. 4): 35 = "In
      // Betrieb". Other states (planned, decommissioned) are intentionally
      // dropped — the choropleth only counts active capacity.
      if (row.EinheitBetriebsstatus !== STATUS_IN_BETRIEB) {
        skipped.status++;
        return;
      }
      const gks = (row.Gemeindeschluessel ?? "").trim();
      if (!gks) {
        skipped.gks++;
        return;
      }
      // Gemeinde is the atomic grain: everything above (Kreis, Bundesland, DE)
      // is derived by prefix, so a row that cannot be placed in a Gemeinde has
      // no home. Rows carrying only a Kreis-level key are counted separately —
      // if this number is ever non-trivial, the rollup silently loses capacity.
      if (gks.length < 8) {
        skipped.gksShort++;
        return;
      }
      const year = parseYear(row.Inbetriebnahmedatum);
      if (!year) {
        skipped.year++;
        return;
      }
      const kwp = parseKwp(row.Bruttoleistung);
      if (!kwp || kwp <= 0) {
        skipped.kwp++;
        return;
      }

      const regionId = gks.substring(0, 8);
      const kreisAgs = gks.substring(0, 5);
      const blAgs = gks.substring(0, 2);

      // First-occurrence wins for region metadata. These names are a fallback:
      // they are operator free-text and carry no official designation (BNetzA
      // lists both Landkreis and kreisfreie Stadt Würzburg as plain "Würzburg").
      // The Destatis Gemeindeverzeichnis overwrites them on upload.
      if (!regions.has(kreisAgs) && row.Landkreis) {
        regions.set(kreisAgs, { level: "landkreis", name: row.Landkreis, parent: blAgs });
      }
      if (!regions.has(regionId) && row.Gemeinde) {
        regions.set(regionId, { level: "gemeinde", name: row.Gemeinde, parent: kreisAgs });
      }

      const segment = spec.et === "solar" ? classifySolarSegment(row, actorMap) : "n/a";
      const key: AggregateKey = `${regionId}|${spec.et}|${segment}|${year}`;
      const existing = agg.get(key);
      if (existing) {
        existing.count++;
        existing.kwp += kwp;
      } else {
        agg.set(key, { count: 1, kwp });
      }
      accepted++;
      if (processed > 0 && processed % 200_000 === 0) {
        process.stderr.write(
          `\r  ${spec.et}: ${processed.toLocaleString()} rows, ${accepted.toLocaleString()} accepted, ${agg.size.toLocaleString()} buckets`,
        );
      }
    });
  }
  process.stderr.write("\n");
  return { processed, accepted, skipped };
}

async function phaseAggregate(): Promise<void> {
  const zipPath = findCachedZip();
  log(`Aggregating from ${basename(zipPath)}`);

  log("Step 1/3: building actor map...");
  const actorMap = await buildActorMap(zipPath);

  log("Step 2/3: streaming unit XMLs...");
  const agg = new Map<AggregateKey, AggregateValue>();
  const regions = new Map<string, RegionMeta>();

  for (const spec of UNIT_SPECS) {
    log(`  aggregating ${spec.et}...`);
    const r = await aggregateUnit(zipPath, spec, actorMap, agg, regions);
    log(
      `    ${spec.et}: ${r.accepted.toLocaleString()} accepted / ${r.processed.toLocaleString()} total ` +
        `(skipped: status=${r.skipped.status}, gks=${r.skipped.gks}, gksShort=${r.skipped.gksShort}, ` +
        `year=${r.skipped.year}, kwp=${r.skipped.kwp})`,
      "ok",
    );
  }

  // Free actor map memory before serialising output.
  actorMap.clear();

  const kreisCount = Array.from(regions.values()).filter((r) => r.level === "landkreis").length;
  const gemeindeCount = regions.size - kreisCount;
  log(
    `Step 3/3: writing aggregates.json (${agg.size.toLocaleString()} buckets, ` +
      `${kreisCount} Kreise, ${gemeindeCount.toLocaleString()} Gemeinden)`,
  );
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

  const resolved = readCachedResolved();
  await writeFile(
    AGGREGATES_OUT,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        data_as_of: resolved.dataAsOf,
        source: "bnetza_xml",
        source_filename: resolved.filename,
        aggregates,
        regions: regionsArray,
      },
      null,
      0,
    ),
  );
  log(`Aggregates written to ${AGGREGATES_OUT}`, "ok");
}

// ─── Phase 4: Upload ──────────────────────────────────────────────────────────

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
  const { aggregates, regions, generated_at, data_as_of, source, source_filename } = payload as {
    aggregates: { region_id: string; energietraeger: string; segment: string; year: number; count: number; kwp: number }[];
    regions: { region_id: string; level: RegionLevel; name: string; parent: string }[];
    generated_at: string;
    data_as_of: string;
    source: string;
    source_filename: string;
  };

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

  // Full replace strategy: delete all rows, then batched insert. This keeps
  // the table clean (no ghost buckets from previous schema versions) and
  // matches the existing open-mastr workflow.
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

  const totalUnits = aggregates.reduce((s, a) => s + a.count, 0);
  const { error: metaErr } = await supabase
    .from("mastr_meta")
    .upsert(
      {
        id: 1,
        source_version: source,
        source_url: `${BNETZA_BASE}/${source_filename}`,
        imported_at: data_as_of,
        total_units_imported: totalUnits,
        notes: `BNetzA Gesamtdatenexport (${source_filename}). ${aggregates.length} buckets, ${regionsRows.length} regions. Aggregated ${generated_at}.`,
      },
      { onConflict: "id" },
    );
  if (metaErr) throw new Error(`mastr_meta upsert failed: ${metaErr.message}`);
  log(`Meta row updated. Imported ${totalUnits.toLocaleString()} units total. data_as_of=${data_as_of}`, "ok");
}

// ─── .env.local loader (minimal) ──────────────────────────────────────────────

function loadEnvFile(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
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

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const args = new Set(process.argv.slice(2));
  const doDownload = args.has("--download");
  const doInspect = args.has("--inspect");
  const doAggregate = args.has("--aggregate");
  const doUpload = args.has("--upload");

  if (!doDownload && !doInspect && !doAggregate && !doUpload) {
    log("No phase selected. Use --download | --inspect | --aggregate | --upload", "warn");
    log("Example: npm run mastr:refresh-bnetza -- --download --aggregate --upload", "info");
    process.exit(1);
  }

  if (doDownload) await phaseDownload(DEFAULT_SCHEMA_VERSION);
  if (doInspect) await phaseInspect();
  if (doAggregate) await phaseAggregate();
  if (doUpload) await phaseUpload();

  log("Done.", "ok");
}

main().catch((err) => {
  log((err as Error).message, "err");
  process.exit(1);
});
