// Solar-Atlas data access: resolves /solar-atlas/<bundesland>/<kreis>/<gemeinde>
// to a region and assembles what a page needs.
//
// Two sources, cleanly split:
//   - mastr_regions   → identity (name, designation, slug, population), from the
//                       Destatis Gemeindeverzeichnis
//   - mastr_aggregates_gem → plants, via the database rollup functions
//
// Gemeinde is the only stored grain; Kreis, Bundesland and DE are prefix rollups.

import { unstable_cache } from "next/cache";
import { loadChildren, LEVEL_LEN, type Level, type ChildRow } from "./mastr-data";
import { withDbTimeout } from "./db-timeout";
import { fmtSpeicherKwh, regionDisplayName } from "./atlas-format";

export { fmtPvLeistung, fmtSpeicherKwh, regionDisplayName } from "./atlas-format";

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

/**
 * Eine Zeile aus mastr_regions als Region — mit bereinigtem Anzeigenamen.
 *
 * Hier und nicht im Import, weil der gespeicherte Name den Slug erzeugt und der
 * in Links, Sitemaps und Caches steckt: 50 Kreis-URLs umzubenennen wäre ein
 * Redirect-Thema, kein Textfix. Die Doppelung ist ein Darstellungsfehler — also
 * beim Anzeigen lösen und die Adressen in Ruhe lassen.
 */
function asRegion(row: unknown): AtlasRegion {
  const r = row as AtlasRegion;
  return { ...r, name: regionDisplayName(r.name) };
}

async function getRegionByIdUncached(regionId: string): Promise<AtlasRegion | null> {
  const supabase = await db();
  const { data, error } = await withDbTimeout(
    supabase.from("mastr_regions").select(REGION_COLUMNS).eq("region_id", regionId).maybeSingle(),
    "getRegionById",
  );
  if (error) throw new Error(`getRegionById failed: ${error.message}`);
  return data ? asRegion(data) : null;
}

// Regions-Identität (Name, Einwohner, Slug) ist stabil — cachen spart die
// wiederholten Lookups (Kreis-, Land-, Deutschland-Region auf jeder Seite).
export const getRegionById = unstable_cache(getRegionByIdUncached, ["region-by-id-v1"], {
  revalidate: 3600,
});

/** Ein Suchtreffer für die Karten-Suche: nur das, was das Vorschlags-Item und die
 *  Navigation (über /api/atlas/goto?ags=) brauchen. */
export type RegionHit = {
  region_id: string;
  name: string;
  level: Exclude<Level, "de">;
};

/**
 * Namenssuche über alle navigierbaren Regionen (Bundesland, Kreis, Gemeinde) für
 * das Autosuggest der Karte. Enthält-Suche (auch „Tölz" findet „Bad Tölz"),
 * grob nach Einwohnerzahl vorsortiert; Präfix-Treffer wandern danach nach oben,
 * weil sie fast immer das Gemeinte sind. Nur Regionen mit Slug (haben eine
 * Atlas-Seite). Bewusst OHNE Cache — die Anfragen sind zu divers; die DB wird
 * über ein Mindest-Query (2 Zeichen), ein hartes Limit und den CDN-Cache der
 * Route geschont.
 */
export async function searchRegions(q: string): Promise<RegionHit[]> {
  const term = q.trim().replace(/[%_,]/g, ""); // ILIKE-Platzhalter + PostgREST-Trenner raus
  if (term.length < 2) return [];
  const supabase = await db();
  const { data, error } = await withDbTimeout(
    supabase
      .from("mastr_regions")
      .select("region_id, level, name, population")
      .ilike("name", `%${term}%`)
      .in("level", ["bundesland", "landkreis", "gemeinde"])
      .not("slug", "is", null)
      .order("population", { ascending: false, nullsFirst: false })
      .limit(40),
    "searchRegions",
  );
  if (error) throw new Error(`searchRegions failed: ${error.message}`);
  const lower = term.toLowerCase();
  const rows = (data ?? []).map((r) => ({
    region_id: String(r.region_id),
    name: regionDisplayName(String(r.name)),
    level: r.level as Exclude<Level, "de">,
  }));
  // Stabil: Präfix-Treffer nach vorn, sonst bleibt die Population-Ordnung.
  rows.sort(
    (a, b) =>
      Number(b.name.toLowerCase().startsWith(lower)) - Number(a.name.toLowerCase().startsWith(lower)),
  );
  return rows.slice(0, 8);
}

/**
 * Resolve a slug path to a region. Slugs are unique among siblings, so each
 * segment is looked up within its parent — that is what keeps "wuerzburg" (the
 * kreisfreie Stadt) apart from "landkreis-wuerzburg" and lets twenty Neustadts
 * coexist.
 */
async function resolveSlugPathUncached(slugs: string[]): Promise<AtlasRegion | null> {
  const supabase = await db();
  let parent = "de";
  let region: AtlasRegion | null = null;
  for (const slug of slugs) {
    const { data, error } = await withDbTimeout(
      supabase.from("mastr_regions").select(REGION_COLUMNS).eq("parent_region_id", parent).eq("slug", slug).maybeSingle(),
      "resolveSlugPath",
    );
    if (error) throw new Error(`resolveSlugPath failed: ${error.message}`);
    if (!data) return null;
    region = asRegion(data);
    parent = region.region_id;
  }
  return region;
}

// Slug→Region ist stabil und wird pro Seite doppelt aufgelöst (generateMetadata
// + Render) — cachen dedupt das und spart die N seriellen Segment-Lookups.
export const resolveSlugPath = unstable_cache(resolveSlugPathUncached, ["resolve-slug-v1"], {
  revalidate: 3600,
});

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

/**
 * Full canonical atlas path for a region id (AGS), e.g. "09679" →
 * "/solar-atlas/bayern/landkreis-wuerzburg". Walks the parent chain and joins
 * the slugs; the "de" root carries no slug and drops out. Returns null when the
 * region or any ancestor has no slug (not yet in the registry). Lets the map
 * link into a Gemeinde by AGS without shipping a slug table to the browser.
 */
export async function atlasPathForRegionId(regionId: string): Promise<string | null> {
  const region = await getRegionById(regionId);
  if (!region?.slug) return null;
  const ancestors = await getAncestors(region);
  const parts = [...ancestors, region].map((r) => r.slug).filter((s): s is string => !!s);
  return `/solar-atlas/${parts.join("/")}`;
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

export type AtlasOwner = "alle" | "privat" | "gewerbe";

/** True when a solar segment belongs to the selected owner filter. "alle" means
 *  every segment that HAS an owner — "sonstige" stays out, exactly as in the
 *  donut and the ranking table. Solar only; storage has its own rule below. */
export function ownerKeeps(owner: AtlasOwner, segment: string): boolean {
  const o = SEGMENT_OWNER[segment];
  return owner === "alle" ? o != null : o === owner;
}

/**
 * Same question for storage — and it needs its own answer.
 *
 * Bauform (battery vs. pumped storage vs. Druckluft/Wasserstoff) and Eigentümer
 * (private vs. commercial) are two independent axes. The owner filter may cut
 * along the second one; it must never quietly redraw the first. So under "alle"
 * the tally is every storage facility in the region, pumped storage included —
 * the same figure the tile showed before an owner filter existed. Under
 * privat/gewerbe it is that owner's batteries, because batterie_privat and
 * batterie_gewerbe carry a real operator split from the MaStR; pumped storage
 * has no owner to ask about and therefore appears in neither.
 *
 * Passing storage through ownerKeeps() instead is how "alle" silently lost the
 * pumped-storage plants (Herdecke 513 → 512 units) in July 2026.
 */
export function ownerKeepsSpeicher(owner: AtlasOwner, segment: string): boolean {
  return owner === "alle" ? true : SEGMENT_OWNER[segment] === owner;
}

/**
 * Which storage segments contribute usable capacity (kWh).
 *
 * A separate and much older decision from the one above, and it holds for every
 * owner filter: only batteries count towards kWh, because one Goldisthal
 * (8,7 GWh) beside cellar batteries (10 kWh each) would swamp the figure and
 * make "kWh je kWp" meaningless. The unit tally still includes it — capacity and
 * tally answer different questions.
 */
export function speicherHasKapazitaet(segment: string): boolean {
  return segment.startsWith("batterie");
}

/** The numbers behind the KPI tiles, cut to one owner. */
export type AtlasOwnerSlice = {
  count: number;
  kwp: number;
  /** Roof-mounted only — the honest denominator for "storage per kWp". */
  kwpDach: number;
  /** Usable capacity — batteries only, in every owner filter. */
  speicherKwh: number;
  /** Storage facilities: all of them under "alle" (pumped storage included),
   *  that owner's batteries under privat/gewerbe. */
  speicherCount: number;
  /** Batteries only — the tally that belongs to speicherKwh. The tile's headline
   *  figure and its subline must count the same things, otherwise Herdecke reads
   *  "14,2 MWh" over "513 Anlagen" while the capacity describes only 512 of them. */
  batterieCount: number;
  /** Everything stored here that is NOT a battery, kept apart instead of dropped:
   *  a pumped-storage plant in the Gemeinde is real and gets its own line under
   *  the tile (see speicherHinweis). Empty under privat/gewerbe — these have no
   *  owner to file them under. */
  nichtBatterie: { pumpspeicherCount: number; pumpspeicherKwh: number; sonstigeCount: number; sonstigeKwh: number };
  /** Plants newly in operation in `year`. */
  neu: number;
};

/**
 * The sentence under the storage tile — what the tile deliberately leaves out.
 *
 * Only batteries make up the capacity figure (see speicherHasKapazitaet), and
 * that rule is invisible unless the exception is named where it happens: in
 * Goldisthal the tile would otherwise report no storage at all next to one of
 * Europe's largest pumped-storage plants. Roughly 27 of 11.247 Gemeinden carry a
 * pumped-storage plant and about 405 some other non-battery unit, so this line
 * stays absent almost everywhere.
 *
 * Returns null when there is nothing to disclose.
 */
export function speicherHinweis(nb: AtlasOwnerSlice["nichtBatterie"]): string | null {
  const parts: string[] = [];
  if (nb.pumpspeicherCount > 0) {
    const eins = nb.pumpspeicherCount === 1;
    const werk = eins ? "ein Pumpspeicherwerk" : `${nf(nb.pumpspeicherCount)} Pumpspeicherwerke`;
    parts.push(
      `Dazu ${eins ? "kommt" : "kommen"} ${werk} mit ${fmtSpeicherKwh(nb.pumpspeicherKwh)} Kapazität — Kraftwerksmaßstab, ` +
        `deshalb ${eins ? "steht es" : "stehen sie"} nicht in der Kachel oben.`,
    );
  }
  if (nb.sonstigeCount > 0) {
    const anlagen =
      nb.sonstigeCount === 1 ? "ein weiterer Speicher" : `${nf(nb.sonstigeCount)} weitere Speicher`;
    const verb = nb.sonstigeCount === 1 ? "ist" : "sind";
    parts.push(
      nb.sonstigeKwh > 0
        ? `${cap(anlagen)} anderer Bauart mit ${fmtSpeicherKwh(nb.sonstigeKwh)} ${verb} ebenfalls erfasst, aber nicht mitgezählt.`
        : `${cap(anlagen)} anderer Bauart ${verb} erfasst, ohne dass eine Kapazität hinterlegt ist.`,
    );
  }
  return parts.length ? parts.join(" ") : null;
}

const nf = (n: number) => n.toLocaleString("de-DE");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * One owner's slice of a region's stock.
 *
 * Every figure comes out of SEGMENT_OWNER, the same table the donut and the
 * ranking use — a second owner mapping here is how tiles and chart start telling
 * different stories about the same place.
 */
export function atlasOwnerSlice(
  atlas: {
    solar: {
      by_segment: { segment: string; count: number; kwp: number }[];
      by_year_segment: { year: number; segment: string; count: number; kwp: number }[];
    };
    speicher: { by_segment: { segment: string; count: number; kwh: number }[] };
  },
  owner: AtlasOwner,
  year: number,
): AtlasOwnerSlice {
  const slice: AtlasOwnerSlice = {
    count: 0,
    kwp: 0,
    kwpDach: 0,
    speicherKwh: 0,
    speicherCount: 0,
    batterieCount: 0,
    nichtBatterie: { pumpspeicherCount: 0, pumpspeicherKwh: 0, sonstigeCount: 0, sonstigeKwh: 0 },
    neu: 0,
  };
  for (const s of atlas.solar.by_segment) {
    if (!ownerKeeps(owner, s.segment)) continue;
    slice.count += s.count;
    slice.kwp += s.kwp;
    if (s.segment !== "freiflaeche") slice.kwpDach += s.kwp;
  }
  for (const s of atlas.solar.by_year_segment) {
    if (s.year !== year || !ownerKeeps(owner, s.segment)) continue;
    slice.neu += s.count;
  }
  for (const s of atlas.speicher.by_segment) {
    if (!ownerKeepsSpeicher(owner, s.segment)) continue;
    slice.speicherCount += s.count;
    if (speicherHasKapazitaet(s.segment)) {
      slice.speicherKwh += s.kwh;
      slice.batterieCount += s.count;
    } else if (s.segment === "pumpspeicher") {
      slice.nichtBatterie.pumpspeicherCount += s.count;
      slice.nichtBatterie.pumpspeicherKwh += s.kwh;
    } else {
      slice.nichtBatterie.sonstigeCount += s.count;
      slice.nichtBatterie.sonstigeKwh += s.kwh;
    }
  }
  return slice;
}

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
async function getRankingDataUncached(
  region: AtlasRegion,
): Promise<{ regions: RankingRegion[]; cells: ChildYearRow[] }> {
  const childLevel = childLevelOf(region);
  if (!childLevel) return { regions: [], cells: [] };

  const supabase = await db();
  const [cells, regionsRes] = await Promise.all([
    loadAllCells(supabase, prefixOf(region.region_id), LEVEL_LEN[childLevel]),
    withDbTimeout(
      supabase
        .from("mastr_regions")
        .select("region_id, name, slug, population")
        .eq("parent_region_id", region.region_id),
      "getRankingData/regions",
    ),
  ]);
  if (regionsRes.error) throw new Error(`getRankingData failed: ${regionsRes.error.message}`);

  return { regions: regionsRes.data as RankingRegion[], cells };
}

// Kreis-/Regions-Rangliste: über alle Gemeinden desselben Kreises identisch —
// cachen spart die wiederholte Zellen-Aggregation auf jeder Gemeinde-Seite.
export const getRankingData = unstable_cache(getRankingDataUncached, ["ranking-data-v1"], {
  revalidate: 3600,
});

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
    const { data, error } = await withDbTimeout(
      supabase
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
        .range(from, from + PAGE - 1),
      "mastr_children_by_year",
    );
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

async function getTopGemeindenUncached(opts: {
  prefix: string;
  owner: Owner;
  limit: number;
  minPop?: number;
  maxPop?: number;
}): Promise<TopGemeinde[]> {
  const supabase = await db();
  const { data, error } = await withDbTimeout(
    supabase.rpc("mastr_top_gemeinden", {
      p_prefix: opts.prefix,
      p_owner: opts.owner,
      p_limit: opts.limit,
      p_min_pop: opts.minPop ?? 0,
      p_max_pop: opts.maxPop ?? null,
    }),
    "mastr_top_gemeinden",
  );
  if (error) throw new Error(`mastr_top_gemeinden failed: ${error.message}`);
  return (data ?? []).map((r: TopGemeinde) => ({
    ...r,
    population: Number(r.population),
    kwp: Number(r.kwp),
    w_per_capita: Number(r.w_per_capita),
    rang: Number(r.rang),
  }));
}

// Die bundesweiten Größenklassen-Spitzen (prefix "") sind der teuerste Teil der
// Gemeinde-Seite (~5 s, Scan über alle Gemeinden) — aber je (Band × Eigentümer)
// identisch über tausende Gemeinden. Cachen macht praktisch jede Seite nach der
// ersten pro Band schnell. revalidate großzügig, ändert sich nur mit dem Bestand.
export const getTopGemeinden = unstable_cache(getTopGemeindenUncached, ["top-gemeinden-v1"], {
  revalidate: 86400,
});

// Größenklassen-Vergleich in EINEM Aufruf: Anführer der Klasse ('leader') und
// die eigene Gemeinde mit ihrem Platz ('self'), je Bezug (eigenes Land,
// bundesweit). Gerankt nach Dach-Solarleistung je Einwohner (ohne Freifläche).
//
// Liest aus der vorberechneten Tabelle mastr_gemeinde_solar (~11k Zeilen, eine je
// bewohnter Gemeinde) statt aus den ~562k Rohzeilen. Vorher war genau diese
// Aggregation der teuerste Teil der Gemeinde-Seite (~5 s) — und der Cache darüber
// half kaum, weil die Größenklasse an der Einwohnerzahl hängt und der Schlüssel
// damit praktisch je Gemeinde verschieden ist. Siehe mastr_peer_context.
export type PeerRow = {
  kind: "leader" | "self";
  scope: "de" | "bl";
  region_id: string;
  name: string;
  slug: string;
  /** Slugs der Eltern-Ebenen — zusammen mit `slug` der volle Atlas-Pfad. */
  kreis_slug: string | null;
  bl_slug: string | null;
  parent_region_id: string;
  population: number;
  kwp: number;
  w_per_capita: number;
  rang: number;
  total: number;
};

/** Atlas-Pfad einer Vergleichs-Gemeinde, oder null wenn ein Slug fehlt. */
export function peerHref(r: PeerRow): string | null {
  if (!r.bl_slug || !r.kreis_slug || !r.slug) return null;
  return `/solar-atlas/${r.bl_slug}/${r.kreis_slug}/${r.slug}`;
}

async function getPeerContextUncached(
  regionId: string,
  blPrefix: string,
  minPop: number,
  maxPop: number,
): Promise<PeerRow[]> {
  const supabase = await db();
  const { data, error } = await withDbTimeout(
    supabase.rpc("mastr_peer_context", {
      p_region_id: regionId,
      p_bl_prefix: blPrefix,
      p_min_pop: minPop,
      p_max_pop: maxPop,
    }),
    "mastr_peer_context",
  );
  if (error) throw new Error(`mastr_peer_context failed: ${error.message}`);
  return (data ?? []).map((r: PeerRow) => ({
    ...r,
    population: Number(r.population),
    kwp: Number(r.kwp),
    w_per_capita: Number(r.w_per_capita),
    rang: Number(r.rang),
    total: Number(r.total),
  }));
}

export const getPeerContext = unstable_cache(getPeerContextUncached, ["peer-context-v1"], {
  revalidate: 86400,
});
