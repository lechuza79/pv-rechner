// Solar-Atlas data access: resolves /solar-atlas/<bundesland>/<kreis>/<gemeinde>
// to a region and assembles what a page needs.
//
// Two sources, cleanly split:
//   - mastr_regions   → identity (name, designation, slug, population), from the
//                       Destatis Gemeindeverzeichnis
//   - mastr_aggregates_gem → plants, via the database rollup functions
//
// Gemeinde is the only stored grain; Kreis, Bundesland and DE are prefix rollups.

import { loadChildren, type Level, type ChildRow } from "./mastr-data";

export type AtlasRegion = {
  region_id: string;
  level: Level;
  name: string;
  /** Official designation ("Landkreis", "Kreisfreie Stadt", "Markt", …). */
  bezeichnung: string | null;
  slug: string | null;
  parent_region_id: string | null;
  population: number | null;
  area_km2: number | null;
  population_as_of: string | null;
};

export type AtlasMetrics = {
  count: number;
  kwp: number;
  /** Everything except open-field — the fair comparison between dense and rural. */
  kwpDach: number;
  countRecent: number;
  /** Watt per inhabitant, total. null when nobody lives there. */
  wPerCapita: number | null;
  /** Watt per inhabitant, roof only. */
  wPerCapitaDach: number | null;
};

export type AtlasChild = AtlasRegion & AtlasMetrics & { rank: number | null; rankDach: number | null };

const FREIFLAECHE = "freiflaeche";

/** The last year whose data is complete. The current one never is. */
export function lastFullYear(): number {
  return new Date().getFullYear() - 1;
}

export function currentYear(): number {
  return new Date().getFullYear();
}

function wPerCapita(kwp: number, population: number | null): number | null {
  if (!population) return null;
  return Math.round((kwp * 1000) / population);
}

/** Fold the per-segment rows of one region into a single metric set. */
function foldMetrics(rows: ChildRow[], population: number | null): AtlasMetrics {
  let count = 0;
  let kwp = 0;
  let kwpDach = 0;
  let countRecent = 0;
  for (const r of rows) {
    count += r.count;
    kwp += r.kwp;
    countRecent += r.count_recent;
    if (r.segment !== FREIFLAECHE) kwpDach += r.kwp;
  }
  return {
    count,
    kwp,
    kwpDach,
    countRecent,
    wPerCapita: wPerCapita(kwp, population),
    wPerCapitaDach: wPerCapita(kwpDach, population),
  };
}

async function db() {
  const { supabase } = await import("./supabase-server");
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

const REGION_COLUMNS =
  "region_id, level, name, bezeichnung, slug, parent_region_id, population, area_km2, population_as_of";

export async function getRegionById(regionId: string): Promise<AtlasRegion | null> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("mastr_regions")
    .select(REGION_COLUMNS)
    .eq("region_id", regionId)
    .maybeSingle();
  if (error) throw new Error(`getRegionById failed: ${error.message}`);
  return (data as AtlasRegion) ?? null;
}

/**
 * Resolve a slug path to a region. Slugs are unique among siblings, so each
 * segment is looked up within its parent — that is what keeps "wuerzburg" (the
 * kreisfreie Stadt) apart from "landkreis-wuerzburg" and lets twenty Neustadts
 * coexist.
 */
export async function resolveSlugPath(slugs: string[]): Promise<AtlasRegion | null> {
  const supabase = await db();
  let parent = "de";
  let region: AtlasRegion | null = null;
  for (const slug of slugs) {
    const { data, error } = await supabase
      .from("mastr_regions")
      .select(REGION_COLUMNS)
      .eq("parent_region_id", parent)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`resolveSlugPath failed: ${error.message}`);
    if (!data) return null;
    region = data as AtlasRegion;
    parent = region.region_id;
  }
  return region;
}

/** Ancestors from Deutschland down to (but excluding) the region — for breadcrumbs. */
export async function getAncestors(region: AtlasRegion): Promise<AtlasRegion[]> {
  const chain: AtlasRegion[] = [];
  let cursor = region.parent_region_id;
  while (cursor) {
    const parent = await getRegionById(cursor);
    if (!parent) break;
    chain.unshift(parent);
    cursor = parent.parent_region_id;
  }
  return chain;
}

/** The level of a region's children, or null if it is a leaf. */
export function childLevelOf(region: AtlasRegion): Exclude<Level, "de"> | null {
  if (region.level === "de") return "bundesland";
  if (region.level === "bundesland") return "landkreis";
  if (region.level === "landkreis") return "gemeinde";
  return null;
}

/**
 * A region's children with their plant metrics and both rankings.
 *
 * Regions without inhabitants (coastal waters, gemeindefreie Wälder) are kept in
 * the list — their plants are real and belong in the parent's total — but they
 * carry no per-capita value and are skipped when ranking, or an uninhabited
 * solar park would top every table with an infinite figure.
 *
 * Regions the MaStR knows but Destatis does not (retired keys after a merger)
 * have no row in mastr_regions and are dropped from the list. Their plants still
 * roll into the parent by prefix, so a Kreis total can exceed the sum of its
 * listed Gemeinden — getRegionUnassigned() reports that gap.
 */
export async function getChildren(region: AtlasRegion, energietraeger = "solar"): Promise<AtlasChild[]> {
  const childLevel = childLevelOf(region);
  if (!childLevel) return [];

  const supabase = await db();
  const [rows, regionsRes] = await Promise.all([
    loadChildren(region.region_id, childLevel, energietraeger as never, lastFullYear()),
    supabase.from("mastr_regions").select(REGION_COLUMNS).eq("parent_region_id", region.region_id),
  ]);
  if (regionsRes.error) throw new Error(`getChildren failed: ${regionsRes.error.message}`);

  const byRegion = new Map<string, ChildRow[]>();
  for (const r of rows) {
    const list = byRegion.get(r.region_id) ?? [];
    list.push(r);
    byRegion.set(r.region_id, list);
  }

  const children: AtlasChild[] = (regionsRes.data as AtlasRegion[]).map((r) => ({
    ...r,
    ...foldMetrics(byRegion.get(r.region_id) ?? [], r.population),
    rank: null,
    rankDach: null,
  }));

  assignRank(children, "wPerCapita", "rank");
  assignRank(children, "wPerCapitaDach", "rankDach");

  return children.sort((a, b) => (b.wPerCapita ?? -1) - (a.wPerCapita ?? -1));
}

function assignRank(children: AtlasChild[], metric: "wPerCapita" | "wPerCapitaDach", field: "rank" | "rankDach") {
  const ranked = children.filter((c) => c[metric] !== null).sort((a, b) => (b[metric] as number) - (a[metric] as number));
  ranked.forEach((c, i) => {
    c[field] = i + 1;
  });
}

/** How many of a region's children can actually be ranked (i.e. are inhabited). */
export function rankableCount(children: AtlasChild[]): number {
  return children.filter((c) => c.wPerCapita !== null).length;
}

// ─── Leaderboards ─────────────────────────────────────────────────────────────

export type TopGemeinde = {
  region_id: string;
  name: string;
  slug: string;
  parent_region_id: string;
  population: number;
  kwp: number;
  w_per_capita: number;
  rang: number;
};

/**
 * Peer band for a size-class comparison: half to double the region's own
 * population.
 *
 * Without it the national leader is Friedrichsgabekoog — 55 inhabitants,
 * 48.115 W each, because one barn roof divided by 55 people beats every real
 * town by a factor of 50. That number measures the denominator, not the effort,
 * and putting it on all 10.943 pages would tell nobody anything.
 *
 * Within the band the comparison bites: Pilsting has 7.158 inhabitants to
 * Höchberg's 9.564 and reaches 6.210 W per head on roofs alone against 954.
 * Same size, same rules, six times the result — that is a benchmark a Gemeinde
 * can act on.
 */
export function peerBand(population: number): { min: number; max: number } {
  return { min: Math.round(population * 0.5), max: Math.round(population * 2) };
}

export async function getTopGemeinden(opts: {
  prefix: string;
  dachOnly: boolean;
  limit: number;
  minPop?: number;
  maxPop?: number;
}): Promise<TopGemeinde[]> {
  const supabase = await db();
  const { data, error } = await supabase.rpc("mastr_top_gemeinden", {
    p_prefix: opts.prefix,
    p_dach_only: opts.dachOnly,
    p_limit: opts.limit,
    p_min_pop: opts.minPop ?? 0,
    p_max_pop: opts.maxPop ?? null,
  });
  if (error) throw new Error(`mastr_top_gemeinden failed: ${error.message}`);
  return (data ?? []).map((r: TopGemeinde) => ({
    ...r,
    population: Number(r.population),
    kwp: Number(r.kwp),
    w_per_capita: Number(r.w_per_capita),
    rang: Number(r.rang),
  }));
}
