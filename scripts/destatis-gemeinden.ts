/**
 * Destatis Gemeindeverzeichnis (GV100AD) → mastr_regions.
 *
 * Supplies the geography the MaStR data cannot: official designations, slugs
 * and population. BNetzA ships bare free-text names — it lists both the
 * Landkreis (09679) and the kreisfreie Stadt (09663) Würzburg as plain
 * "Würzburg", which is unusable for URLs.
 *
 * Division of labour:
 *   - This script owns region identity  (name, bezeichnung, slug, population).
 *   - The MaStR pipeline owns plant counts and only fills region gaps
 *     (ON CONFLICT DO NOTHING) so it can never clobber these names.
 *
 *   npm run destatis:gemeinden            # download, parse, upload
 *   npm run destatis:gemeinden -- --dry   # parse + report, no writes
 *
 * Requirements:
 *   - Env (unless --dry): SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 * Source: Statistisches Bundesamt, Gemeindeverzeichnis GV100AD, dl-de/by-2-0.
 * Runs quarterly (Destatis publishes 31.03. / 30.06. / 30.09. / 31.12.).
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import * as unzipper from "unzipper";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

const GV100_BASE =
  "https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/Archiv/GV100ADQ";

// ─── GV100AD record layout ────────────────────────────────────────────────────
// Fixed width, 220 characters per line, UTF-8, character-aligned (umlauts do
// not shift columns). Offsets below are 0-based half-open; the published
// Datensatzbeschreibung (bundled in the zip) counts 1-based inclusive.
//
//   [0,2)     Satzart          10=Land 20=RegBez 30=Region 40=Kreis
//                              50=Gemeindeverband 60=Gemeinde
//   [2,10)    Gebietsstand     YYYYMMDD
//   [10,18)   Amtlicher Regionalschlüssel — the 8-digit AGS, ready to use:
//               [10,12) Land · [12,13) RegBez · [13,15) Kreis · [15,18) Gemeinde
//             On Satzart 40 the Gemeinde part is blank, so [10,15) is the Kreis.
//   [18,22)   Gemeindeverband  (Samtgemeinde/VG — deliberately not used: it is a
//             separate administrative layer, not a step in the AGS hierarchy)
//   [22,72)   Name
//   [72,122)  Sitz der Verwaltung (Satzart 40) — not used
//   [122,124) Textkennzeichen  → official designation, see below
//   [128,139) Fläche in ha            (Satzart 60 only)
//   [139,150) Bevölkerung gesamt      (Satzart 60 only)
//   [150,161) Bevölkerung männlich    — not used
//   [165,170) PLZ                     — not used
//
// Only Satzart 60 carries Fläche/Bevölkerung — Kreis, Land and DE totals are
// summed up from the Gemeinden, which keeps them consistent with the way the
// plant aggregates roll up.

const SATZART_KREIS = "40";
const SATZART_VERBAND = "50";
const SATZART_GEMEINDE = "60";

/** Textkennzeichen for Satzart 40 (Kreis level). */
const KREIS_BEZEICHNUNG: Record<string, string> = {
  "41": "Kreisfreie Stadt",
  "42": "Stadtkreis",
  "43": "Kreis",
  "44": "Landkreis",
  "45": "Regionalverband",
};

/** Textkennzeichen for Satzart 60 (Gemeinde level). */
const GEMEINDE_BEZEICHNUNG: Record<string, string> = {
  "60": "Markt",
  "61": "Kreisfreie Stadt",
  "62": "Stadtkreis",
  "63": "Stadt",
  "64": "Gemeinde",
  "65": "Gemeindefreier Bezirk",
  "66": "Gemeindefreies Gebiet",
  "67": "Große Kreisstadt",
};

/**
 * Kreis designations that become a URL prefix. Kreisfreie Städte and
 * Stadtkreise get none — "wuerzburg" (the city) next to "landkreis-wuerzburg"
 * (the district) is exactly the disambiguation we need, and it matches how
 * people actually say it.
 */
const KREIS_SLUG_PREFIX: Record<string, string> = {
  "41": "",
  "42": "",
  "43": "Kreis",
  "44": "Landkreis",
  "45": "",
};

/**
 * Words that mean the name already states its own designation. Four Kreise do:
 * Region Hannover and Landkreis Rostock (both coded 44), Städteregion Aachen
 * (43) and Regionalverband Saarbrücken (45). Prefixing those by code would
 * yield "landkreis-region-hannover" / "landkreis-landkreis-rostock".
 */
const SELF_DESIGNATING = ["Region", "Städteregion", "Regionalverband", "Kreis", "Landkreis"];

// ─── Types ────────────────────────────────────────────────────────────────────

type Level = "de" | "bundesland" | "landkreis" | "gemeinde";

type RegionRow = {
  region_id: string;
  level: Level;
  parent_region_id: string | null;
  name: string;
  bezeichnung: string | null;
  slug: string | null;
  population: number | null;
  area_km2: number | null;
  population_as_of: string;
};

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(msg: string, kind: "info" | "ok" | "warn" | "err" = "info") {
  const prefix = { info: "•", ok: "✓", warn: "!", err: "✗" }[kind];
  process.stderr.write(`${prefix} ${msg}\n`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mirrors lib/atlas-cities.ts → slugify(). Kept in sync by a unit test. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Destatis appends the designation and any civic epithet after a comma:
 * "Höchberg, M", "Erkrath, Fundort des Neanderthalers, Stadt". No core name
 * contains a comma (verified across all 11.344 records), so everything from
 * the first one on is a suffix. Parenthesised additions are part of the name
 * and stay: "Nienburg (Weser), Stadt" → "Nienburg (Weser)".
 */
function coreName(raw: string): string {
  return raw.split(", ")[0].trim();
}

/**
 * The last comma segment — the official designation, where there is one.
 * Usually redundant, but occasionally the only thing telling two Gemeinden in
 * the same Kreis apart: "Garding, Kirchspiel" vs "Garding, Stadt".
 */
function nameSuffix(raw: string): string | null {
  const parts = raw.split(", ");
  return parts.length > 1 ? parts[parts.length - 1].trim() : null;
}

function num(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function startsWithDesignation(name: string): boolean {
  const first = name.split(/\s+/)[0];
  return SELF_DESIGNATING.includes(first);
}

/**
 * Full display name for a Kreis, e.g. "Landkreis Würzburg", "Region Hannover".
 *
 * Beware: 50 Kreise already carry the designation at the END of their name
 * ("Ennepe-Ruhr-Kreis", "Hochsauerlandkreis"), which this prefix rule doubles —
 * "Kreis Ennepe-Ruhr-Kreis". Deliberately NOT fixed here: the stored name feeds
 * the slug, and renaming 50 live URLs is a redirect job, not a text fix. The
 * doubling is stripped when the name is displayed
 * (lib/atlas-format.ts → regionDisplayName). Touch this only together with a
 * slug migration.
 */
function kreisDisplayName(core: string, txtKz: string): string {
  if (startsWithDesignation(core)) return core;
  const prefix = KREIS_SLUG_PREFIX[txtKz] ?? "";
  return prefix ? `${prefix} ${core}` : core;
}

// ─── Source resolution ────────────────────────────────────────────────────────

type Quarter = { url: string; label: string; text: string; gebietsstand: string };

/**
 * All four quarterly files exist permanently — "…3QAktuell" means "the most
 * recent Q3", which in July 2026 is still 2025-09-30. Rather than computing
 * which quarter should be current (and getting it wrong every rollover), fetch
 * all four and let the Gebietsstand inside the file decide. 4 × ~390 KB.
 */
async function resolveNewest(): Promise<Quarter> {
  const found: Quarter[] = [];
  for (const q of [1, 2, 3, 4]) {
    const url = `${GV100_BASE}/GV100AD${q}QAktuell.zip?__blob=publicationFile`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "solar-check.io/1.0 (+https://solar-check.io)" } });
      if (!res.ok) {
        log(`  ${q}Q: HTTP ${res.status}`, "warn");
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const dir = await unzipper.Open.buffer(buf);
      const entry = dir.files.find((f) => /GV100AD.*\.txt$/i.test(f.path));
      if (!entry) {
        log(`  ${q}Q: no GV100AD txt inside zip`, "warn");
        continue;
      }
      const text = (await entry.buffer()).toString("utf8");
      const gebietsstand = text.slice(2, 10);
      found.push({ url, label: `${q}Q`, text, gebietsstand });
      log(`  ${q}Q: Gebietsstand ${gebietsstand}`);
    } catch (err) {
      log(`  ${q}Q: ${(err as Error).message}`, "warn");
    }
  }
  if (found.length === 0) throw new Error("No GV100AD quarter could be downloaded");
  found.sort((a, b) => b.gebietsstand.localeCompare(a.gebietsstand));
  const newest = found[0];
  log(`Using ${newest.label} (Gebietsstand ${newest.gebietsstand})`, "ok");
  return newest;
}

// ─── Parse ────────────────────────────────────────────────────────────────────

const BUNDESLAND_NAMES: Record<string, string> = {
  "01": "Schleswig-Holstein", "02": "Hamburg", "03": "Niedersachsen", "04": "Bremen",
  "05": "Nordrhein-Westfalen", "06": "Hessen", "07": "Rheinland-Pfalz", "08": "Baden-Württemberg",
  "09": "Bayern", "10": "Saarland", "11": "Berlin", "12": "Brandenburg",
  "13": "Mecklenburg-Vorpommern", "14": "Sachsen", "15": "Sachsen-Anhalt", "16": "Thüringen",
};

type Parsed = {
  rows: RegionRow[];
  asOf: string;
  stats: { gemeinden: number; kreise: number; unbewohnt: number; population: number; disambiguated: number };
};

/** A Gemeinde before its slug is settled. */
type GemeindeDraft = {
  regionId: string;
  kreisId: string;
  core: string;
  suffix: string | null;
  verband: string | null;
  bezeichnung: string;
  population: number | null;
  areaKm2: number | null;
};

/**
 * Slugs must be unique among siblings. Names alone are not: a Kreis can hold two
 * Gemeinden called Neuenkirchen, and Garding exists twice as Kirchspiel and as
 * Stadt. Neither case is solvable by one rule — Garding's two entries share a
 * Gemeindeverband (Eiderstedt) and differ only by suffix, Neuenkirchen's two
 * have no suffix and differ only by Verband. So try progressively more specific
 * candidates and take the first that separates the whole group.
 *
 * The whole colliding group is disambiguated together, never just the later one:
 * that keeps a slug from depending on record order, and from silently changing
 * when a new same-named Gemeinde appears in a future quarter.
 */
function resolveSlugs(drafts: GemeindeDraft[]): { slugs: Map<string, string>; disambiguated: number } {
  const slugs = new Map<string, string>();
  let disambiguated = 0;

  const byKreis = new Map<string, GemeindeDraft[]>();
  for (const d of drafts) {
    const list = byKreis.get(d.kreisId) ?? [];
    list.push(d);
    byKreis.set(d.kreisId, list);
  }

  for (const siblings of Array.from(byKreis.values())) {
    const byBase = new Map<string, GemeindeDraft[]>();
    for (const d of siblings) {
      const base = slugify(d.core);
      const list = byBase.get(base) ?? [];
      list.push(d);
      byBase.set(base, list);
    }

    for (const [base, group] of Array.from(byBase.entries())) {
      if (group.length === 1) {
        slugs.set(group[0].regionId, base);
        continue;
      }
      const candidates: ((d: GemeindeDraft) => string)[] = [
        (d) => (d.suffix ? `${base}-${slugify(d.suffix)}` : base),
        (d) => (d.verband ? `${base}-${slugify(d.verband)}` : base),
        // Always unique — the AGS is the primary key. Ugly, but a working URL
        // beats a pretty one that collides.
        (d) => `${base}-${d.regionId}`,
      ];
      const winner = candidates.find((fn) => new Set(group.map(fn)).size === group.length);
      if (!winner) throw new Error(`Cannot disambiguate slug "${base}" in Kreis ${group[0].kreisId}`);
      for (const d of group) slugs.set(d.regionId, winner(d));
      disambiguated += group.length;
    }
  }

  return { slugs, disambiguated };
}

function parseGv100(text: string): Parsed {
  const lines = text.split(/\r?\n/).filter((l) => l.length >= 150);
  const gebietsstand = lines[0].slice(2, 10);
  const asOf = `${gebietsstand.slice(0, 4)}-${gebietsstand.slice(4, 6)}-${gebietsstand.slice(6, 8)}`;

  const kreisMeta = new Map<string, { name: string; bezeichnung: string; slug: string }>();
  const verbandNames = new Map<string, string>();
  const drafts: GemeindeDraft[] = [];
  let unbewohnt = 0;

  for (const line of lines) {
    const satzart = line.slice(0, 2);

    if (satzart === SATZART_VERBAND) {
      // Only used as a slug tie-breaker, never as a hierarchy level.
      verbandNames.set(line.slice(10, 15) + line.slice(18, 22), coreName(line.slice(22, 72)));
      continue;
    }

    if (satzart === SATZART_KREIS) {
      const kreisId = line.slice(10, 15);
      const txtKz = line.slice(122, 124).trim();
      const core = coreName(line.slice(22, 72));
      const name = kreisDisplayName(core, txtKz);
      kreisMeta.set(kreisId, {
        name,
        bezeichnung: KREIS_BEZEICHNUNG[txtKz] ?? "Kreis",
        slug: slugify(name),
      });
      continue;
    }

    if (satzart !== SATZART_GEMEINDE) continue;

    const raw = line.slice(22, 72);
    const areaHa = num(line.slice(128, 139));
    const pop = num(line.slice(139, 150));
    if (!pop) unbewohnt++;

    drafts.push({
      regionId: line.slice(10, 18),
      kreisId: line.slice(10, 15),
      core: coreName(raw),
      suffix: nameSuffix(raw),
      verband: verbandNames.get(line.slice(10, 15) + line.slice(18, 22)) ?? null,
      bezeichnung: GEMEINDE_BEZEICHNUNG[line.slice(122, 124).trim()] ?? "Gemeinde",
      population: pop,
      areaKm2: areaHa === null ? null : Math.round(areaHa) / 100,
    });
  }

  const { slugs, disambiguated } = resolveSlugs(drafts);

  /**
   * Three territories belong to no Kreis at all: the coastal waters incl. the
   * German continental shelf and a gemeindefreies Gebiet (both M-V), plus the
   * German-Luxembourg condominium on the Mosel. All are uninhabited, and their
   * Kreis part is "000" — there is no Satzart-40 record to hang them on.
   *
   * They are kept and attached straight to their Bundesland: dropping them would
   * lose any plants registered there (coastal waters is where offshore wind
   * lands), and the rollup goes by AGS prefix, not by parent_region_id, so the
   * shortened parent changes no total. Uninhabited means no slug and no page
   * anyway.
   */
  const orphanParent = (d: GemeindeDraft): string =>
    kreisMeta.has(d.kreisId) ? d.kreisId : d.regionId.slice(0, 2);

  const orphans = drafts.filter((d) => !kreisMeta.has(d.kreisId));
  for (const o of orphans) {
    log(`  ${o.regionId} "${o.core}" has no Kreis (${o.kreisId}) — attaching to Bundesland`, "warn");
  }
  if (orphans.some((o) => o.population)) {
    throw new Error("An inhabited Gemeinde has no Kreis — the hierarchy assumption broke");
  }

  const gemeinden: RegionRow[] = drafts.map((d) => ({
    region_id: d.regionId,
    level: "gemeinde" as const,
    parent_region_id: orphanParent(d),
    name: d.core,
    bezeichnung: d.bezeichnung,
    // Uninhabited gemeindefreie Gebiete (forests, lakes) keep their row so their
    // plants still roll up into the Kreis, but get no slug: they are not places
    // anyone looks up, a per-capita figure would divide by zero, and they would
    // otherwise collide with the Gemeinde they are named after ("Eimen" vs
    // "Eimen, gemfr. Gebiet"). No slug, no page.
    slug: d.population ? (slugs.get(d.regionId) ?? null) : null,
    population: d.population,
    area_km2: d.areaKm2,
    population_as_of: asOf,
  }));

  // Roll population and area up the hierarchy. Only Gemeinden carry numbers, so
  // every total above is a sum of its children — same rule as the plant data.
  const sumInto = (acc: Map<string, { pop: number; area: number }>, key: string, r: RegionRow) => {
    const cur = acc.get(key) ?? { pop: 0, area: 0 };
    cur.pop += r.population ?? 0;
    cur.area += r.area_km2 ?? 0;
    acc.set(key, cur);
  };
  const kreisTotals = new Map<string, { pop: number; area: number }>();
  const blTotals = new Map<string, { pop: number; area: number }>();
  const deTotal = { pop: 0, area: 0 };
  for (const g of gemeinden) {
    sumInto(kreisTotals, g.region_id.slice(0, 5), g);
    sumInto(blTotals, g.region_id.slice(0, 2), g);
    deTotal.pop += g.population ?? 0;
    deTotal.area += g.area_km2 ?? 0;
  }

  const rows: RegionRow[] = [
    {
      region_id: "de",
      level: "de",
      parent_region_id: null,
      name: "Deutschland",
      bezeichnung: null,
      slug: null,
      population: deTotal.pop,
      area_km2: Math.round(deTotal.area * 100) / 100,
      population_as_of: asOf,
    },
  ];

  for (const [ags, name] of Object.entries(BUNDESLAND_NAMES)) {
    const t = blTotals.get(ags);
    rows.push({
      region_id: ags,
      level: "bundesland",
      parent_region_id: "de",
      name,
      bezeichnung: null,
      slug: slugify(name),
      population: t?.pop ?? null,
      area_km2: t ? Math.round(t.area * 100) / 100 : null,
      population_as_of: asOf,
    });
  }

  for (const [kreisId, meta] of Array.from(kreisMeta.entries())) {
    const t = kreisTotals.get(kreisId);
    rows.push({
      region_id: kreisId,
      level: "landkreis",
      parent_region_id: kreisId.slice(0, 2),
      name: meta.name,
      bezeichnung: meta.bezeichnung,
      slug: meta.slug,
      population: t?.pop ?? null,
      area_km2: t ? Math.round(t.area * 100) / 100 : null,
      population_as_of: asOf,
    });
  }

  rows.push(...gemeinden);

  return {
    rows,
    asOf,
    stats: {
      gemeinden: gemeinden.length,
      kreise: kreisMeta.size,
      unbewohnt,
      population: deTotal.pop,
      disambiguated,
    },
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Slugs must be unique among siblings or the URL cannot resolve. A collision is
 * a hard stop, not a warning: silently serving one of two Gemeinden under the
 * same address is worse than not shipping.
 */
function assertSlugsUnique(rows: RegionRow[]): void {
  const seen = new Map<string, string>();
  const clashes: string[] = [];
  for (const r of rows) {
    if (!r.slug) continue;
    const key = `${r.parent_region_id ?? "-"}/${r.slug}`;
    const prev = seen.get(key);
    if (prev) clashes.push(`${key}: ${prev} vs ${r.region_id} (${r.name})`);
    else seen.set(key, r.region_id);
  }
  if (clashes.length > 0) {
    for (const c of clashes.slice(0, 20)) log(`  ${c}`, "err");
    throw new Error(`${clashes.length} slug collision(s) among siblings`);
  }
  log(`Slugs unique among siblings (${seen.size} checked)`, "ok");
}

function sanityCheck(parsed: Parsed): void {
  const { stats } = parsed;
  // Germany has ~10.700 Gemeinden in ~400 Kreise and ~83.5 M inhabitants. These
  // bounds only catch a source that changed shape (layout shift, truncated
  // download) — they are deliberately wide, not a data-quality gate.
  if (stats.gemeinden < 9_000 || stats.gemeinden > 12_000) {
    throw new Error(`Implausible Gemeinde count: ${stats.gemeinden}`);
  }
  if (stats.kreise < 350 || stats.kreise > 450) {
    throw new Error(`Implausible Kreis count: ${stats.kreise}`);
  }
  if (stats.population < 75_000_000 || stats.population > 90_000_000) {
    throw new Error(`Implausible population total: ${stats.population.toLocaleString()}`);
  }
  log(
    `Sanity ok: ${stats.gemeinden.toLocaleString()} Gemeinden (${stats.unbewohnt} unbewohnt), ` +
      `${stats.kreise} Kreise, ${stats.population.toLocaleString()} Einwohner, ` +
      `${stats.disambiguated} Slugs entschärft`,
    "ok",
  );
}

// ─── Upload ───────────────────────────────────────────────────────────────────

function loadEnvFile(): void {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function upload(rows: RegionRow[]): Promise<void> {
  loadEnvFile();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env");

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Parents before children: mastr_regions.parent_region_id is a self-reference,
  // so 'de' must exist before the Bundesländer, and so on down.
  const byLevel: Level[] = ["de", "bundesland", "landkreis", "gemeinde"];
  for (const level of byLevel) {
    const batchRows = rows.filter((r) => r.level === level);
    log(`Upserting ${batchRows.length.toLocaleString()} ${level} rows...`);
    for (let i = 0; i < batchRows.length; i += 500) {
      const batch = batchRows.slice(i, i + 500);
      const { error } = await supabase.from("mastr_regions").upsert(batch, { onConflict: "region_id" });
      if (error) throw new Error(`upsert failed (${level}, batch ${i}): ${error.message}`);
    }
  }
  log(`mastr_regions updated`, "ok");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dry = process.argv.includes("--dry");

  log("Resolving newest GV100AD quarter...");
  const src = await resolveNewest();

  log("Parsing...");
  const parsed = parseGv100(src.text);
  sanityCheck(parsed);
  assertSlugsUnique(parsed.rows);

  // Spot-check the case that motivated this script: BNetzA calls both of these
  // "Würzburg", Destatis tells them apart.
  for (const id of ["09663", "09679", "09679147"]) {
    const r = parsed.rows.find((x) => x.region_id === id);
    if (r) {
      log(
        `  ${id}: ${r.name} (${r.bezeichnung}) → /${r.slug} · ` +
          `${r.population?.toLocaleString() ?? "—"} Einwohner`,
      );
    }
  }

  if (dry) {
    log(`--dry: ${parsed.rows.length.toLocaleString()} rows parsed, nothing written`, "ok");
    return;
  }

  await upload(parsed.rows);
  log(`Done (Gebietsstand ${parsed.asOf})`, "ok");
}

main().catch((err) => {
  log((err as Error).message, "err");
  process.exit(1);
});
