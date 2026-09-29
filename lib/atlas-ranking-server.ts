import "server-only";
import { getRankingData, getRankingRegions, type AtlasChild, type AtlasRegion, type ChildYearRow, type RankingRegion } from "./atlas";
import { getMastrDataAsOf } from "./mastr-data";
import { isDistrictMember } from "./district-package";
import { loadPackagedRankingCells } from "./district-monitor-server";

/**
 * The ranking data of an Atlas region page (Kreis, Land, Deutschland).
 *
 * WHY (28.09.2026): the cells used to come from the database only — for Bayern
 * ~11 pages of 1,000 rows, each re-running the aggregation, about 1.6 s of a
 * cold render. The package run now stores them in the same package the page
 * reads for its monitor (lib/ranking-package.ts), so this takes the cells from
 * there and asks the database only for the small region list.
 *
 * The package is the one the monitor section already reads in this request
 * (preloaded in startAtlasReads, React-cached), checked against the same child
 * list the monitor uses: every child for a Land/Deutschland, the district
 * members for a Kreis. Falls back to the unchanged database path whenever the
 * package cannot answer (none, other membership, built before the field, or
 * cells of another register import than the one the page shows).
 */
export async function getRankingDataForPage(
  region: AtlasRegion,
  children: Promise<AtlasChild[]>,
): Promise<{ regions: RankingRegion[]; cells: ChildYearRow[] }> {
  const kind = region.level === "landkreis" ? "district" : region.level === "bundesland" || region.level === "de" ? "region" : null;
  if (!kind) return getRankingData(region);
  const [regions, kids, stand] = await Promise.all([getRankingRegions(region), children, getMastrDataAsOf()]);
  const ids = (kind === "district" ? kids.filter((c) => isDistrictMember(c, region.region_id)) : kids).map((c) => c.region_id);
  // A failed package read is no reason to fail the page: the database path answers.
  const cells = await loadPackagedRankingCells(kind, region.region_id, ids, stand).catch(() => null);
  return cells ? { regions, cells } : getRankingData(region);
}
