import {foldSiblings, type AtlasChild, type AtlasRegion, type ChildYearRow, type RankingRegion} from "./atlas";
import {isDistrictMember} from "./district-package";

/**
 * Members of a regional page: a district's municipalities by the register rule
 * shared with the district package build; a state's districts and independent
 * cities; Germany's sixteen states. Forests and retired keys never count.
 */
export function regionMembers(region: AtlasRegion, children: AtlasChild[]): AtlasChild[] {
  return region.level === "landkreis"
    ? children.filter(c => isDistrictMember(c, region.region_id))
    : children.filter(c => c.bezeichnung !== "Gemeindefreies Gebiet");
}

/**
 * Rows and yearly frames of the regional race. One computation for the
 * regional page and the admin widget workshop, so both draw the same race.
 */
export function regionRaceInput({towns, ranking, stand, basePath}: {
  towns: AtlasChild[]; ranking: {regions: RankingRegion[]; cells: ChildYearRow[]}; stand: string; basePath: string;
}) {
  const sums = new Map(foldSiblings(ranking.regions, ranking.cells).map(r => [r.region_id, r.sums.alle]));
  const historyEnd = Number(stand.slice(0, 4));
  const history = Array.from({length: historyEnd - 2000 + 1}, (_, index) => {
    const year = 2000 + index;
    const frame = Object.fromEntries(foldSiblings(ranking.regions, ranking.cells.filter(cell => cell.year <= year)).map(row => [row.region_id, row.sums]));
    return {year, rows: towns.map(town => ({id: town.region_id, value: frame[town.region_id]?.alle.count ?? 0}))};
  });
  return {
    rows: towns.map(town => ({id: town.region_id, name: town.name, href: town.slug ? `${basePath}/${town.slug}` : null, value: sums.get(town.region_id)?.count ?? 0})),
    history,
  };
}
