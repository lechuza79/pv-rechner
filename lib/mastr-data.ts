// MaStR data access layer — wraps the Supabase aggregate queries.
// Falls back to placeholder numbers (rough 2025 stock estimates) while the
// real data pipeline is still being populated. Once mastr_aggregates is
// filled, only `loadFromSupabase` needs to flip to true.

import { BUNDESLAENDER, bundeslandByAgs } from "./mastr-regions";

export type Energietraeger = "solar" | "wind" | "biomasse" | "wasser" | "speicher" | "gesamt";
export type Segment = "privat_dach" | "gewerbe_dach" | "freiflaeche" | "n/a";
export type SegmentFilter = "alle" | "privat_dach" | "gewerbe_dach" | "freiflaeche";
export type Level = "de" | "bundesland" | "landkreis";

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

// Rough share of solar installations by segment (nation-wide approximation).
// Will be replaced by actual segment counts from MaStR per region.
const SOLAR_SEGMENT_SHARE: Record<Exclude<Segment, "n/a">, number> = {
  privat_dach: 0.35,
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

type AggregateRow = {
  region_id: string;
  energietraeger: string;
  segment: string;
  year: number;
  count: number;
  kwp: number;
};

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

async function loadSupabaseAggregates(energietraeger: Energietraeger): Promise<AggregateRow[]> {
  const { supabase } = await import("./supabase-server");
  if (!supabase) throw new Error("Supabase not configured");

  const etList: string[] =
    energietraeger === "gesamt" ? RENEWABLE_TRAEGER : [energietraeger];

  // Supabase / PostgREST default max_rows is 1000. For Solar (~28k buckets)
  // and Gesamt (~45k buckets) we paginate with .range() until exhausted.
  const PAGE = 1000;
  const all: AggregateRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("mastr_aggregates")
      .select("region_id, energietraeger, segment, year, count, kwp")
      .in("energietraeger", etList)
      // Stable ordering is required for pagination — without it, Supabase
      // may return duplicates or gaps across pages.
      .order("region_id", { ascending: true })
      .order("energietraeger", { ascending: true })
      .order("segment", { ascending: true })
      .order("year", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Supabase query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as AggregateRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// Bundesland AGS = first 2 digits of the Landkreis AGS (region_id)
function blPrefix(regionId: string): string {
  return regionId.substring(0, 2);
}

function rowMatchesSegment(row: AggregateRow, segment: SegmentFilter): boolean {
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
  const rows = await loadSupabaseAggregates(energietraeger);
  const asOf = await fetchMetaDataAsOf();

  const byRegion = new Map<string, { count: number; kwp: number }>();

  for (const r of rows) {
    if (!rowMatchesSegment(r, segment)) continue;
    let regionKey: string;
    if (parent === "de") {
      // DE-Ebene aggregiert auf Bundesland — cleaner Einstiegsansicht.
      regionKey = blPrefix(r.region_id);
    } else {
      // Bundesland-Ebene: nur Landkreise mit passendem AGS-Prefix.
      if (!r.region_id.startsWith(parent)) continue;
      regionKey = r.region_id;
    }
    const existing = byRegion.get(regionKey) ?? { count: 0, kwp: 0 };
    existing.count += r.count;
    existing.kwp += r.kwp;
    byRegion.set(regionKey, existing);
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
  const rows = await loadSupabaseAggregates(energietraeger);
  const asOf = await fetchMetaDataAsOf();

  // Match rows for this region (DE = all, BL = 2-digit prefix, LK = exact)
  const matches = rows.filter((r) => {
    if (regionId === "de") return true;
    if (regionId.length === 2) return blPrefix(r.region_id) === regionId;
    return r.region_id === regionId;
  });

  const filtered = matches.filter((r) => rowMatchesSegment(r, segment));
  const totalCount = filtered.reduce((s, r) => s + r.count, 0);
  const totalKwp = filtered.reduce((s, r) => s + Number(r.kwp), 0);

  // by_segment (solar only): unfiltered segment distribution
  let by_segment: SegmentBreakdown[];
  if (energietraeger === "solar") {
    const buckets: Record<string, { count: number; kwp: number }> = {};
    for (const r of matches) {
      const b = buckets[r.segment] ?? { count: 0, kwp: 0 };
      b.count += r.count;
      b.kwp += Number(r.kwp);
      buckets[r.segment] = b;
    }
    by_segment = (Object.entries(buckets) as [string, { count: number; kwp: number }][])
      .map(([segKey, v]) => ({ segment: segKey as Segment, ...v }))
      .filter((s) => s.segment !== "n/a");
    // Stable, predictable order
    const order: Record<string, number> = { privat_dach: 0, gewerbe_dach: 1, freiflaeche: 2 };
    by_segment.sort((a, b) => (order[a.segment] ?? 99) - (order[b.segment] ?? 99));
  } else {
    by_segment = [{ segment: "n/a", count: totalCount, kwp: totalKwp }];
  }

  // Resolve region name + level
  let name: string;
  let level: Level;
  if (regionId === "de") {
    name = "Deutschland";
    level = "de";
  } else if (regionId.length === 2) {
    const bl = bundeslandByAgs(regionId);
    name = bl?.name ?? regionId;
    level = "bundesland";
  } else {
    // Landkreis — look up the name from mastr_regions (populated by upload phase)
    const { supabase } = await import("./supabase-server");
    let lkName: string | null = null;
    if (supabase) {
      const { data } = await supabase
        .from("mastr_regions")
        .select("name")
        .eq("region_id", regionId)
        .maybeSingle();
      lkName = (data as { name?: string } | null)?.name ?? null;
    }
    name = lkName ?? regionId;
    level = "landkreis";
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
// For region landing pages: loads only the requested region's rows (a city has
// ~100 buckets) instead of the full table, and returns solar + storage + the
// yearly build-out curve in one shot. SAFE ONLY for Kreis/Stadt (5-digit AGS,
// ~100 buckets < PostgREST's 1000-row page cap). For a Bundesland (2-digit,
// ~thousands of buckets) or "de" this single query would silently truncate at
// 1000 rows — add pagination (see loadSupabaseAggregates) before using it there.

export type RegionAtlas = {
  region_id: string;
  solar: {
    total_count: number;
    total_kwp: number;
    by_segment: SegmentBreakdown[];
    by_year: { year: number; count: number; kwp: number }[];
  };
  speicher: { count: number; kwp: number };
  data_as_of: string;
};

export async function getRegionAtlasData(regionId: string): Promise<RegionAtlas> {
  const { supabase } = await import("./supabase-server");
  if (!supabase) throw new Error("Supabase not configured");

  let query = supabase
    .from("mastr_aggregates")
    .select("energietraeger, segment, year, count, kwp")
    .in("energietraeger", ["solar", "speicher"]);
  if (regionId !== "de") {
    query = regionId.length === 2
      ? query.like("region_id", `${regionId}%`)
      : query.eq("region_id", regionId);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  const rows = (data ?? []) as AggregateRow[];

  let solarCount = 0;
  let solarKwp = 0;
  const segBuckets: Record<string, { count: number; kwp: number }> = {};
  const yearBuckets: Record<number, { count: number; kwp: number }> = {};
  let speicherCount = 0;
  let speicherKwp = 0;

  for (const r of rows) {
    const kwp = Number(r.kwp);
    if (r.energietraeger === "speicher") {
      speicherCount += r.count;
      speicherKwp += kwp;
      continue;
    }
    // solar
    solarCount += r.count;
    solarKwp += kwp;
    const seg = (segBuckets[r.segment] ??= { count: 0, kwp: 0 });
    seg.count += r.count;
    seg.kwp += kwp;
    if (r.year) {
      const yr = (yearBuckets[r.year] ??= { count: 0, kwp: 0 });
      yr.count += r.count;
      yr.kwp += kwp;
    }
  }

  const order: Record<string, number> = { privat_dach: 0, gewerbe_dach: 1, freiflaeche: 2 };
  const by_segment: SegmentBreakdown[] = (Object.entries(segBuckets) as [string, { count: number; kwp: number }][])
    .map(([seg, v]) => ({ segment: seg as Segment, ...v }))
    .filter((s) => s.segment !== "n/a")
    .sort((a, b) => (order[a.segment] ?? 99) - (order[b.segment] ?? 99));

  const by_year = (Object.entries(yearBuckets) as [string, { count: number; kwp: number }][])
    .map(([year, v]) => ({ year: Number(year), ...v }))
    .sort((a, b) => a.year - b.year);

  return {
    region_id: regionId,
    solar: { total_count: solarCount, total_kwp: solarKwp, by_segment, by_year },
    speicher: { count: speicherCount, kwp: speicherKwp },
    data_as_of: await fetchMetaDataAsOf(),
  };
}

export function allBundeslaenderSummary(
  energietraeger: Energietraeger,
  segment: SegmentFilter = "alle",
): Promise<RegionSummary[]> {
  return Promise.all(BUNDESLAENDER.map((bl) => getRegionSummary(bl.ags, energietraeger, segment)));
}
