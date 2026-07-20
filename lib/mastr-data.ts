// MaStR data access layer — wraps the Supabase aggregate queries.
// Falls back to placeholder numbers (rough 2025 stock estimates) while the
// real data pipeline is still being populated. Once mastr_aggregates is
// filled, only `loadFromSupabase` needs to flip to true.

import { BUNDESLAENDER, bundeslandByAgs } from "./mastr-regions";
import { ENCLOSED_CITIES } from "./enclosed-cities";

export type Energietraeger = "solar" | "wind" | "biomasse" | "wasser" | "speicher" | "gesamt";
export type Segment = "steckersolar" | "privat_dach" | "gewerbe_dach" | "freiflaeche" | "n/a";
export type SegmentFilter = "alle" | "steckersolar" | "privat_dach" | "gewerbe_dach" | "freiflaeche";
export type Level = "de" | "bundesland" | "landkreis" | "gemeinde";

/** AGS length per level. The key is nested, so a prefix of this length IS the parent. */
export const LEVEL_LEN: Record<Exclude<Level, "de">, number> = {
  bundesland: 2,
  landkreis: 5,
  gemeinde: 8,
};

/** Roof-mounted segments — everything except open-field. */
export const DACH_SEGMENTE: Segment[] = ["steckersolar", "privat_dach", "gewerbe_dach"];

export function levelOf(regionId: string): Level {
  if (regionId === "de") return "de";
  if (regionId.length === 2) return "bundesland";
  if (regionId.length === 5) return "landkreis";
  return "gemeinde";
}

/** Prefix to filter aggregates by. "de" means no filter — everything. */
function prefixOf(regionId: string): string {
  return regionId === "de" ? "" : regionId;
}

// "gesamt" = all renewables summed (solar + wind + biomasse + wasser); storage excluded
const RENEWABLE_TRAEGER: Energietraeger[] = ["solar", "wind", "biomasse", "wasser"];

export type ChoroplethEntry = {
  region_id: string;
  count: number;
  kwp: number;
};

export type SegmentBreakdown = {
  segment: Segment;
  count: number;
  kwp: number;
};

export type RegionSummary = {
  region_id: string;
  name: string;
  level: Level;
  energietraeger: Energietraeger;
  total_count: number;
  total_kwp: number;
  by_segment: SegmentBreakdown[];
  source: "supabase" | "placeholder";
  data_as_of: string;
};

// ─── Placeholder stock per Bundesland (MW, approx. Jan 2025) ─────────────────
// Derived from public Bundesnetzagentur monthly statistics. These are stand-ins
// until the real MaStR aggregates land in Supabase.

type PlaceholderBl = {
  ags: string;
  solar_mw: number;
  wind_mw: number;
  biomasse_mw: number;
  wasser_mw: number;
  speicher_mw: number;
};

const PLACEHOLDER: PlaceholderBl[] = [
  { ags: "01", solar_mw: 3200, wind_mw: 8900, biomasse_mw: 190, wasser_mw: 30, speicher_mw: 420 },
  { ags: "02", solar_mw: 300, wind_mw: 130, biomasse_mw: 20, wasser_mw: 5, speicher_mw: 60 },
  { ags: "03", solar_mw: 8500, wind_mw: 13200, biomasse_mw: 1800, wasser_mw: 85, speicher_mw: 1100 },
  { ags: "04", solar_mw: 200, wind_mw: 240, biomasse_mw: 25, wasser_mw: 2, speicher_mw: 25 },
  { ags: "05", solar_mw: 11200, wind_mw: 7400, biomasse_mw: 900, wasser_mw: 430, speicher_mw: 1450 },
  { ags: "06", solar_mw: 4100, wind_mw: 2500, biomasse_mw: 500, wasser_mw: 85, speicher_mw: 550 },
  { ags: "07", solar_mw: 4800, wind_mw: 4050, biomasse_mw: 330, wasser_mw: 110, speicher_mw: 650 },
  { ags: "08", solar_mw: 13500, wind_mw: 1950, biomasse_mw: 920, wasser_mw: 920, speicher_mw: 1850 },
  { ags: "09", solar_mw: 25800, wind_mw: 2700, biomasse_mw: 2100, wasser_mw: 2350, speicher_mw: 3600 },
  { ags: "10", solar_mw: 900, wind_mw: 540, biomasse_mw: 60, wasser_mw: 15, speicher_mw: 120 },
  { ags: "11", solar_mw: 400, wind_mw: 10, biomasse_mw: 50, wasser_mw: 3, speicher_mw: 90 },
  { ags: "12", solar_mw: 7200, wind_mw: 8500, biomasse_mw: 540, wasser_mw: 15, speicher_mw: 1050 },
  { ags: "13", solar_mw: 3900, wind_mw: 3800, biomasse_mw: 320, wasser_mw: 10, speicher_mw: 480 },
  { ags: "14", solar_mw: 5600, wind_mw: 1550, biomasse_mw: 400, wasser_mw: 120, speicher_mw: 740 },
  { ags: "15", solar_mw: 4400, wind_mw: 5700, biomasse_mw: 420, wasser_mw: 35, speicher_mw: 580 },
  { ags: "16", solar_mw: 2700, wind_mw: 1800, biomasse_mw: 210, wasser_mw: 130, speicher_mw: 370 },
];

/**
 * Installed solar per Bundesland in MW, keyed by AGS. Single source for
 * capacity weights — used by the nation-wide "current solar" average so that
 * Bayern (27 % of Germany's solar) counts more than Bremen (0.2 %).
 */
export const SOLAR_STOCK_MW: Record<string, number> = Object.fromEntries(
  PLACEHOLDER.map((p) => [p.ags, p.solar_mw]),
);

// Rough share of solar installations by segment (nation-wide approximation).
// Only reachable when LOAD_FROM_SUPABASE is false, which it no longer is.
const SOLAR_SEGMENT_SHARE: Record<Exclude<Segment, "n/a">, number> = {
  steckersolar: 0.02,
  privat_dach: 0.33,
  gewerbe_dach: 0.30,
  freiflaeche: 0.35,
};

// Rough median kWp per unit per segment (for count ↔ kWp sanity)
const AVG_KWP: Record<Exclude<Energietraeger, "gesamt">, number> = {
  solar: 12,       // mix of EFH (9 kWp) and larger commercial (40+ kWp)
  wind: 3500,      // avg onshore turbine
  biomasse: 450,
  wasser: 180,
  speicher: 9,
};

function mwToKwp(mw: number): number {
  return mw * 1000;
}

function placeholderByBl(bl: PlaceholderBl, et: Energietraeger): { count: number; kwp: number } {
  if (et === "gesamt") {
    let count = 0;
    let kwp = 0;
    for (const t of RENEWABLE_TRAEGER) {
      const e = placeholderByBl(bl, t);
      count += e.count;
      kwp += e.kwp;
    }
    return { count, kwp };
  }
  const mw = {
    solar: bl.solar_mw,
    wind: bl.wind_mw,
    biomasse: bl.biomasse_mw,
    wasser: bl.wasser_mw,
    speicher: bl.speicher_mw,
  }[et];
  const kwp = mwToKwp(mw);
  const count = Math.round(kwp / AVG_KWP[et]);
  return { count, kwp };
}

function placeholderTotal(et: Energietraeger): { count: number; kwp: number } {
  let count = 0;
  let kwp = 0;
  for (const bl of PLACEHOLDER) {
    const e = placeholderByBl(bl, et);
    count += e.count;
    kwp += e.kwp;
  }
  return { count, kwp };
}

// Apply segment filter. Only meaningful for solar — for other traegers the
// filter is ignored (returns unfiltered values).
function applySegmentFilter(
  base: { count: number; kwp: number },
  et: Energietraeger,
  segment: SegmentFilter,
): { count: number; kwp: number } {
  if (segment === "alle" || et !== "solar") return base;
  const share = SOLAR_SEGMENT_SHARE[segment as keyof typeof SOLAR_SEGMENT_SHARE];
  return {
    count: Math.round(base.count * share),
    kwp: Math.round(base.kwp * share),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Data-source toggle. Flip to true once Supabase is populated (phase 3 done).
const LOAD_FROM_SUPABASE = true;
const PLACEHOLDER_AS_OF = "2025-01-31";

// ─── Supabase path ────────────────────────────────────────────────────────────

let metaDataAsOfCache: string | null = null;
let metaFetchedAt = 0;

async function fetchMetaDataAsOf(): Promise<string> {
  // Cache mastr_meta.imported_at for 5 minutes — rarely changes.
  if (metaDataAsOfCache && Date.now() - metaFetchedAt < 5 * 60 * 1000) return metaDataAsOfCache;
  const { supabase } = await import("./supabase-server");
  if (!supabase) return PLACEHOLDER_AS_OF;
  const { data } = await supabase.from("mastr_meta").select("imported_at").eq("id", 1).maybeSingle();
  const iso = data?.imported_at ?? PLACEHOLDER_AS_OF;
  metaDataAsOfCache = typeof iso === "string" ? iso.substring(0, 10) : PLACEHOLDER_AS_OF;
  metaFetchedAt = Date.now();
  return metaDataAsOfCache;
}

function traegerList(energietraeger: Energietraeger): string[] {
  return energietraeger === "gesamt" ? RENEWABLE_TRAEGER : [energietraeger];
}

/** Stable display order for the solar segments. */
const SEGMENT_ORDER: Record<string, number> = {
  steckersolar: 0,
  privat_dach: 1,
  gewerbe_dach: 2,
  freiflaeche: 3,
};

function sortSegments(list: SegmentBreakdown[]): SegmentBreakdown[] {
  return list.sort((a, b) => (SEGMENT_ORDER[a.segment] ?? 99) - (SEGMENT_ORDER[b.segment] ?? 99));
}

export type ChildRow = {
  region_id: string;
  segment: string;
  count: number;
  kwp: number;
  count_recent: number;
};

/**
 * Children of a region, grouped in the database at the requested AGS length.
 *
 * The old path pulled the whole table into Node and grouped it there. At
 * Gemeinde granularity (~10x the rows) that meant hundreds of paginated
 * requests per page view, and any un-paginated query silently truncated at
 * PostgREST's 1000-row cap. The rollup function returns at most a few hundred
 * rows, so neither can happen.
 */
export async function loadChildren(
  parent: string,
  childLevel: Exclude<Level, "de">,
  energietraeger: Energietraeger,
  yearRecent?: number,
  /** Cut the history off here. Passing last year yields the ranking as it stood then. */
  yearMax?: number,
): Promise<ChildRow[]> {
  const { supabase } = await import("./supabase-server");
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase.rpc("mastr_children", {
    p_prefix: prefixOf(parent),
    p_child_len: LEVEL_LEN[childLevel],
    p_traeger: traegerList(energietraeger),
    p_year_recent: yearRecent ?? null,
    p_year_max: yearMax ?? null,
  });
  if (error) throw new Error(`mastr_children failed: ${error.message}`);
  return (data ?? []).map((r: ChildRow) => ({
    region_id: r.region_id,
    segment: r.segment,
    count: Number(r.count),
    kwp: Number(r.kwp),
    count_recent: Number(r.count_recent ?? 0),
  }));
}

type SeriesRow = { energietraeger: string; segment: string; year: number; count: number; kwp: number; kwh: number };

/** One region's segment x year series, summed over everything beneath it. */
async function loadSeries(regionId: string, energietraeger: Energietraeger): Promise<SeriesRow[]> {
  const { supabase } = await import("./supabase-server");
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase.rpc("mastr_region_series", {
    p_prefix: prefixOf(regionId),
    p_traeger: traegerList(energietraeger),
  });
  if (error) throw new Error(`mastr_region_series failed: ${error.message}`);
  return (data ?? []).map((r: SeriesRow) => ({
    energietraeger: r.energietraeger,
    segment: r.segment,
    year: r.year,
    count: Number(r.count),
    kwp: Number(r.kwp),
    kwh: Number(r.kwh ?? 0),
  }));
}

function rowMatchesSegment(row: { segment: string }, segment: SegmentFilter): boolean {
  if (segment === "alle") return true;
  // Segment filter only meaningful for solar; rows from other traegers have
  // segment='n/a' and should be excluded when user filters to privat/gewerbe/…
  return row.segment === segment;
}

async function supabaseChoroplethData(
  parent: string,
  energietraeger: Energietraeger,
  segment: SegmentFilter,
): Promise<{ data: ChoroplethEntry[]; source: "supabase"; data_as_of: string }> {
  // One level down from the parent: DE → Bundesländer, Bundesland → Kreise,
  // Kreis → Gemeinden. The map now carries Gemeinde geometry (lazy-loaded per
  // Kreis), so the Kreis→Gemeinde step feeds the deepest drilldown.
  const childLevel: Exclude<Level, "de"> =
    parent === "de"
      ? "bundesland"
      : levelOf(parent) === "bundesland"
        ? "landkreis"
        : "gemeinde";
  // A Landkreis that rings a kreisfreie Stadt gets that Stadt drawn into its map
  // bundle (it sits in the Kreis's hole). Pull the Stadt's own value in too, so
  // it is coloured and hovers like any other shape instead of a blank infill.
  const enclosedCity = childLevel === "gemeinde" ? ENCLOSED_CITIES[parent] : undefined;
  const [rows, cityRows, asOf] = await Promise.all([
    loadChildren(parent, childLevel, energietraeger),
    enclosedCity ? loadChildren(enclosedCity, "gemeinde", energietraeger) : Promise.resolve([]),
    fetchMetaDataAsOf(),
  ]);

  const byRegion = new Map<string, { count: number; kwp: number }>();
  for (const r of [...rows, ...cityRows]) {
    if (!rowMatchesSegment(r, segment)) continue;
    const existing = byRegion.get(r.region_id) ?? { count: 0, kwp: 0 };
    existing.count += r.count;
    existing.kwp += r.kwp;
    byRegion.set(r.region_id, existing);
  }

  const data: ChoroplethEntry[] = Array.from(byRegion.entries()).map(([region_id, v]) => ({
    region_id,
    count: v.count,
    kwp: v.kwp,
  }));
  return { data, source: "supabase", data_as_of: asOf };
}

async function supabaseRegionSummary(
  regionId: string,
  energietraeger: Energietraeger,
  segment: SegmentFilter,
): Promise<RegionSummary> {
  const [rows, asOf] = await Promise.all([loadSeries(regionId, energietraeger), fetchMetaDataAsOf()]);

  const filtered = rows.filter((r) => rowMatchesSegment(r, segment));
  const totalCount = filtered.reduce((s, r) => s + r.count, 0);
  const totalKwp = filtered.reduce((s, r) => s + r.kwp, 0);

  // by_segment (solar only): unfiltered segment distribution
  let by_segment: SegmentBreakdown[];
  if (energietraeger === "solar") {
    const buckets: Record<string, { count: number; kwp: number }> = {};
    for (const r of rows) {
      const b = buckets[r.segment] ?? { count: 0, kwp: 0 };
      b.count += r.count;
      b.kwp += r.kwp;
      buckets[r.segment] = b;
    }
    by_segment = sortSegments(
      (Object.entries(buckets) as [string, { count: number; kwp: number }][])
        .map(([segKey, v]) => ({ segment: segKey as Segment, ...v }))
        .filter((s) => s.segment !== "n/a"),
    );
  } else {
    by_segment = [{ segment: "n/a", count: totalCount, kwp: totalKwp }];
  }

  // Resolve region name + level
  const level = levelOf(regionId);
  let name: string;
  if (level === "de") {
    name = "Deutschland";
  } else if (level === "bundesland") {
    name = bundeslandByAgs(regionId)?.name ?? regionId;
  } else {
    // Kreis/Gemeinde — name comes from mastr_regions (Destatis, authoritative)
    const { supabase } = await import("./supabase-server");
    let lookedUp: string | null = null;
    if (supabase) {
      const { data } = await supabase
        .from("mastr_regions")
        .select("name")
        .eq("region_id", regionId)
        .maybeSingle();
      lookedUp = (data as { name?: string } | null)?.name ?? null;
    }
    name = lookedUp ?? regionId;
  }

  return {
    region_id: regionId,
    name,
    level,
    energietraeger,
    total_count: totalCount,
    total_kwp: totalKwp,
    by_segment,
    source: "supabase",
    data_as_of: asOf,
  };
}

export async function getChoroplethData(
  parent: string,
  energietraeger: Energietraeger,
  segment: SegmentFilter = "alle",
): Promise<{ data: ChoroplethEntry[]; source: "supabase" | "placeholder"; data_as_of: string }> {
  if (LOAD_FROM_SUPABASE) {
    return supabaseChoroplethData(parent, energietraeger, segment);
  }

  if (parent === "de") {
    const data = PLACEHOLDER.map((bl) => {
      const base = placeholderByBl(bl, energietraeger);
      const filtered = applySegmentFilter(base, energietraeger, segment);
      return { region_id: bl.ags, count: filtered.count, kwp: filtered.kwp };
    });
    return { data, source: "placeholder", data_as_of: PLACEHOLDER_AS_OF };
  }

  return { data: [], source: "placeholder", data_as_of: PLACEHOLDER_AS_OF };
}

export async function getRegionSummary(
  regionId: string,
  energietraeger: Energietraeger,
  segment: SegmentFilter = "alle",
): Promise<RegionSummary> {
  if (LOAD_FROM_SUPABASE) {
    return supabaseRegionSummary(regionId, energietraeger, segment);
  }

  let level: Level;
  let name: string;
  let base: { count: number; kwp: number };

  if (regionId === "de") {
    level = "de";
    name = "Deutschland";
    base = placeholderTotal(energietraeger);
  } else {
    const bl = bundeslandByAgs(regionId);
    if (!bl) throw new Error(`Unknown region: ${regionId}`);
    const placeholder = PLACEHOLDER.find((p) => p.ags === regionId);
    if (!placeholder) throw new Error(`No placeholder for AGS ${regionId}`);
    level = "bundesland";
    name = bl.name;
    base = placeholderByBl(placeholder, energietraeger);
  }

  const total = applySegmentFilter(base, energietraeger, segment);

  // by_segment always shows the full segment breakdown (unfiltered base)
  // so the user can see relative sizes even when filtering.
  const by_segment: SegmentBreakdown[] =
    energietraeger === "solar"
      ? (Object.entries(SOLAR_SEGMENT_SHARE) as [Exclude<Segment, "n/a">, number][]).map(([seg, share]) => ({
          segment: seg,
          count: Math.round(base.count * share),
          kwp: Math.round(base.kwp * share),
        }))
      : [{ segment: "n/a", count: base.count, kwp: base.kwp }];

  return {
    region_id: regionId,
    name,
    level,
    energietraeger,
    total_count: total.count,
    total_kwp: total.kwp,
    by_segment,
    source: "placeholder",
    data_as_of: PLACEHOLDER_AS_OF,
  };
}

// ─── Region atlas (single region, all metrics in one query) ──────────────────
// For region landing pages: solar + storage + the yearly build-out curve for one
// region, summed over everything beneath it.
//
// Safe at every level now. It used to match a Kreis with .eq("region_id") — which
// stopped matching anything the moment Gemeinde became the stored grain, and would
// have shown every city page a silent zero. It now goes through the database
// rollup, whose result is bounded by segment x year, never by region count.

export type RegionAtlas = {
  region_id: string;
  solar: {
    total_count: number;
    total_kwp: number;
    by_segment: SegmentBreakdown[];
    by_year: { year: number; count: number; kwp: number }[];
  };
  /**
   * count = all electricity stores; kwh_batterie = usable capacity of home and
   * commercial batteries only. Pumped-storage capacity is excluded on purpose —
   * one Goldisthal (8,7 GWh) would swamp the figure and make "kWh per kWp"
   * meaningless. count still includes it so the tally stays honest.
   */
  speicher: { count: number; kwp: number; kwh_batterie: number };
  /** Weitere Erzeuger je Gemeinde (installierte Leistung kWp/kW), aus derselben
   *  MaStR-Aggregation wie Solar. Für den Technologie-Mix. */
  generators: {
    wind: { count: number; kwp: number };
    biomasse: { count: number; kwp: number };
    wasser: { count: number; kwp: number };
  };
  data_as_of: string;
};

export async function getRegionAtlasData(regionId: string): Promise<RegionAtlas> {
  const { supabase } = await import("./supabase-server");
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase.rpc("mastr_region_series", {
    p_prefix: prefixOf(regionId),
    p_traeger: ["solar", "speicher", "wind", "biomasse", "wasser"],
  });
  if (error) throw new Error(`mastr_region_series failed: ${error.message}`);
  const rows = (data ?? []) as SeriesRow[];

  let solarCount = 0;
  let solarKwp = 0;
  const segBuckets: Record<string, { count: number; kwp: number }> = {};
  const yearBuckets: Record<number, { count: number; kwp: number }> = {};
  let speicherCount = 0;
  let speicherKwp = 0;
  let batterieKwh = 0;
  const gen: Record<string, { count: number; kwp: number }> = {
    wind: { count: 0, kwp: 0 },
    biomasse: { count: 0, kwp: 0 },
    wasser: { count: 0, kwp: 0 },
  };

  for (const r of rows) {
    const count = Number(r.count);
    const kwp = Number(r.kwp);
    if (r.energietraeger === "speicher") {
      speicherCount += count;
      speicherKwp += kwp;
      if (r.segment.startsWith("batterie")) batterieKwh += Number(r.kwh);
      continue;
    }
    // Andere Erzeuger (Wind/Biomasse/Wasser) getrennt sammeln — NICHT als Solar
    // zählen (der alte Fallback tat genau das, deshalb hier explizit verzweigt).
    if (r.energietraeger !== "solar") {
      const g = gen[r.energietraeger];
      if (g) {
        g.count += count;
        g.kwp += kwp;
      }
      continue;
    }
    // solar
    solarCount += count;
    solarKwp += kwp;
    const seg = (segBuckets[r.segment] ??= { count: 0, kwp: 0 });
    seg.count += count;
    seg.kwp += kwp;
    if (r.year) {
      const yr = (yearBuckets[r.year] ??= { count: 0, kwp: 0 });
      yr.count += count;
      yr.kwp += kwp;
    }
  }

  const by_segment: SegmentBreakdown[] = sortSegments(
    (Object.entries(segBuckets) as [string, { count: number; kwp: number }][])
      .map(([seg, v]) => ({ segment: seg as Segment, ...v }))
      .filter((s) => s.segment !== "n/a"),
  );

  const by_year = (Object.entries(yearBuckets) as [string, { count: number; kwp: number }][])
    .map(([year, v]) => ({ year: Number(year), ...v }))
    .sort((a, b) => a.year - b.year);

  return {
    region_id: regionId,
    solar: { total_count: solarCount, total_kwp: solarKwp, by_segment, by_year },
    speicher: { count: speicherCount, kwp: speicherKwp, kwh_batterie: batterieKwh },
    generators: { wind: gen.wind, biomasse: gen.biomasse, wasser: gen.wasser },
    data_as_of: await fetchMetaDataAsOf(),
  };
}

// ─── National yearly solar additions (for the "Zubau-Zeitleiste" story) ──────
// Sums the whole solar aggregate table by commissioning year into one national
// build-out curve. Verified against known figures (2011 ≈ 8 GW peak, 2013–15
// trough ≈ 1.4 GW, 2023 ≈ 15 GW) — the MaStR commissioning-year shape matches
// reality well enough for the national narrative. Two clean-ups are required:
//  • The register carries bogus commissioning years (1900, 1923, …) from data
//    entry errors — we clamp to a sane window [MIN_ZUBAU_YEAR, current year].
//  • The current calendar year is still filling up, so it is flagged partial and
//    the page renders it distinctly (never as a "collapse").

export const MIN_ZUBAU_YEAR = 2000;

export type NationalYearlyPoint = {
  year: number;
  count: number;
  /** Newly commissioned capacity in that year, in kWp. */
  kwp: number;
  /** True for the current calendar year — data still incoming, not comparable. */
  partial: boolean;
};

export type NationalSolarSeries = {
  points: NationalYearlyPoint[];
  data_as_of: string;
  /** Last calendar year that is considered complete. */
  lastCompleteYear: number;
};

export async function getNationalSolarByYear(): Promise<NationalSolarSeries> {
  // "de" → prefix "" → the RPC sums the whole country by segment × year.
  const [rows, asOf] = await Promise.all([loadSeries("de", "solar"), fetchMetaDataAsOf()]);
  // Derive the current year from the data-stand date, not the wall clock: the
  // "partial" year is whichever one the export was cut in, which is exactly the
  // year encoded in mastr_meta.imported_at. Falls back to the ISO string's year.
  const currentYear = Number(asOf.substring(0, 4)) || new Date().getFullYear();

  const byYear = new Map<number, { count: number; kwp: number }>();
  for (const r of rows) {
    const y = Number(r.year);
    if (!Number.isFinite(y) || y < MIN_ZUBAU_YEAR || y > currentYear) continue;
    const e = byYear.get(y) ?? { count: 0, kwp: 0 };
    e.count += r.count;
    e.kwp += Number(r.kwp);
    byYear.set(y, e);
  }

  const points: NationalYearlyPoint[] = [];
  for (let y = MIN_ZUBAU_YEAR; y <= currentYear; y++) {
    const e = byYear.get(y) ?? { count: 0, kwp: 0 };
    points.push({ year: y, count: e.count, kwp: e.kwp, partial: y === currentYear });
  }

  return { points, data_as_of: asOf, lastCompleteYear: currentYear - 1 };
}

export function allBundeslaenderSummary(
  energietraeger: Energietraeger,
  segment: SegmentFilter = "alle",
): Promise<RegionSummary[]> {
  return Promise.all(BUNDESLAENDER.map((bl) => getRegionSummary(bl.ags, energietraeger, segment)));
}
