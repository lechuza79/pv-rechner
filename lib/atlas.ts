// Solar-Atlas data access: resolves /solar-atlas/<bundesland>/<kreis>/<gemeinde>
// to a region and assembles what a page needs.
//
// Two sources, cleanly split:
//   - mastr_regions   → identity (name, designation, slug, population), from the
//                       Destatis Gemeindeverzeichnis
//   - mastr_aggregates_gem → plants, via the database rollup functions
//
// Gemeinde is the only stored grain; Kreis, Bundesland and DE are prefix rollups.

import { loadChildren, LEVEL_LEN, type Level, type ChildRow } from "./mastr-data";

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

export type AtlasChild = AtlasRegion &
  AtlasMetrics & {
    rank: number | null;
    rankDach: number | null;
    /**
     * Positions gained since the end of the previous full year (positive = moved
     * up). Null when the region was unranked back then.
     */
    rankDelta: number | null;
    rankDachDelta: number | null;
  };

const FREIFLAECHE = "freiflaeche";

/** "de" means no filter — everything. Mirrors the rule in lib/mastr-data.ts. */
function prefixOf(regionId: string): string {
  return regionId === "de" ? "" : regionId;
}

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
  // The same ranking twice: once with everything, once cut off at the end of the
  // year before last. The difference is how many places a Gemeinde moved during
  // the last complete year — the current year is excluded from both, or a January
  // page would report everyone plunging.
  const [rows, rowsBefore, regionsRes] = await Promise.all([
    loadChildren(region.region_id, childLevel, energietraeger as never, lastFullYear()),
    loadChildren(region.region_id, childLevel, energietraeger as never, undefined, lastFullYear() - 1),
    supabase.from("mastr_regions").select(REGION_COLUMNS).eq("parent_region_id", region.region_id),
  ]);
  if (regionsRes.error) throw new Error(`getChildren failed: ${regionsRes.error.message}`);

  const group = (list: ChildRow[]) => {
    const m = new Map<string, ChildRow[]>();
    for (const r of list) {
      const arr = m.get(r.region_id) ?? [];
      arr.push(r);
      m.set(r.region_id, arr);
    }
    return m;
  };
  const byRegion = group(rows);
  const byRegionBefore = group(rowsBefore);

  const regions = regionsRes.data as AtlasRegion[];

  const children: AtlasChild[] = regions.map((r) => ({
    ...r,
    ...foldMetrics(byRegion.get(r.region_id) ?? [], r.population),
    rank: null,
    rankDach: null,
    rankDelta: null,
    rankDachDelta: null,
  }));

  assignRank(children, "wPerCapita", "rank");
  assignRank(children, "wPerCapitaDach", "rankDach");

  // Ranks as of the end of the year before last, keyed by region.
  const before = regions.map((r) => ({
    region_id: r.region_id,
    ...foldMetrics(byRegionBefore.get(r.region_id) ?? [], r.population),
  }));
  const rankBefore = (metric: "wPerCapita" | "wPerCapitaDach") => {
    const map = new Map<string, number>();
    before
      .filter((c) => c[metric] !== null)
      .sort((a, b) => (b[metric] as number) - (a[metric] as number))
      .forEach((c, i) => map.set(c.region_id, i + 1));
    return map;
  };
  const prevRank = rankBefore("wPerCapita");
  const prevRankDach = rankBefore("wPerCapitaDach");

  for (const c of children) {
    const p = prevRank.get(c.region_id);
    if (p != null && c.rank != null) c.rankDelta = p - c.rank;
    const pd = prevRankDach.get(c.region_id);
    if (pd != null && c.rankDach != null) c.rankDachDelta = pd - c.rankDach;
  }

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

// ─── Ranking payload ──────────────────────────────────────────────────────────

/**
 * Who runs it, across energy types.
 *
 *   privat  — private roofs and Steckersolar, plus batteries owned by a person
 *   gewerbe — commercial roofs, open-field parks, commercial batteries
 *
 * Pumped storage belongs to neither: asking whether Goldisthal is "private" makes
 * no sense, and its GWh would swamp any total it landed in.
 */
export const SEGMENT_OWNER: Record<string, "privat" | "gewerbe" | null> = {
  privat_dach: "privat",
  steckersolar: "privat",
  batterie_privat: "privat",
  gewerbe_dach: "gewerbe",
  freiflaeche: "gewerbe",
  batterie_gewerbe: "gewerbe",
  pumpspeicher: null,
  sonstige: null,
  "n/a": null,
};

/** One (child, segment, year) cell — the grain the ranking table filters on. */
export type ChildYearRow = {
  region_id: string;
  segment: string;
  year: number;
  count: number;
  kwp: number;
  kwh: number;
};

/** Region identity the table needs alongside the numbers. */
export type RankingRegion = {
  region_id: string;
  name: string;
  slug: string | null;
  population: number | null;
};

/**
 * Everything the ranking table needs, in one payload: the children's identity
 * plus their cells at segment × year granularity.
 *
 * Shipping the grain rather than pre-aggregated columns is deliberate. The table
 * lets the reader switch owner filter, metric and Zubau year, and every one of
 * those combinations is a different aggregation — computing them in the browser
 * is instant, while a round trip per click would not be. The payload is bounded
 * by children × segments × years: a Kreis with 55 Gemeinden lands around 150 KB.
 */
export async function getRankingData(
  region: AtlasRegion,
): Promise<{ regions: RankingRegion[]; cells: ChildYearRow[] }> {
  const childLevel = childLevelOf(region);
  if (!childLevel) return { regions: [], cells: [] };

  const supabase = await db();
  const [cells, regionsRes] = await Promise.all([
    loadAllCells(supabase, prefixOf(region.region_id), LEVEL_LEN[childLevel]),
    supabase
      .from("mastr_regions")
      .select("region_id, name, slug, population")
      .eq("parent_region_id", region.region_id),
  ]);
  if (regionsRes.error) throw new Error(`getRankingData failed: ${regionsRes.error.message}`);

  return { regions: regionsRes.data as RankingRegion[], cells };
}

/**
 * Paginated read of the ranking cells.
 *
 * A Kreis with 55 Gemeinden across 5 segments and 25 years is ~6.900 cells, and
 * PostgREST caps a response at 1000 rows *without saying so* — the first attempt
 * here returned exactly 1000 and would have shown most Gemeinden as zero. Hence
 * .range() until a short page arrives, and a hard stop rather than a silent
 * truncation if the payload ever grows past what a page should carry.
 */
async function loadAllCells(
  supabase: Awaited<ReturnType<typeof db>>,
  prefix: string,
  childLen: number,
): Promise<ChildYearRow[]> {
  const PAGE = 1000;
  const MAX = 20_000;
  const all: ChildYearRow[] = [];
  for (let from = 0; from < MAX; from += PAGE) {
    const { data, error } = await supabase
      .rpc("mastr_children_by_year", {
        p_prefix: prefix,
        p_child_len: childLen,
        p_traeger: ["solar", "speicher"],
        p_year_min: null,
      })
      // Stable order is required for paging — without it rows can repeat or vanish.
      .order("region_id", { ascending: true })
      .order("segment", { ascending: true })
      .order("year", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`mastr_children_by_year failed: ${error.message}`);
    const rows = (data ?? []) as ChildYearRow[];
    all.push(
      ...rows.map((r) => ({
        region_id: r.region_id,
        segment: r.segment,
        year: Number(r.year),
        count: Number(r.count),
        kwp: Number(r.kwp),
        kwh: Number(r.kwh),
      })),
    );
    if (rows.length < PAGE) return all;
  }
  throw new Error(`Ranking payload exceeds ${MAX} cells for prefix "${prefix}" — refusing to ship a truncated table`);
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

export type Owner = "alle" | "privat" | "gewerbe";

export async function getTopGemeinden(opts: {
  prefix: string;
  owner: Owner;
  limit: number;
  minPop?: number;
  maxPop?: number;
}): Promise<TopGemeinde[]> {
  const supabase = await db();
  const { data, error } = await supabase.rpc("mastr_top_gemeinden", {
    p_prefix: opts.prefix,
    p_owner: opts.owner,
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
