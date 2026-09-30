import { foldSiblings, type AtlasChild, type RankingRegion, type ChildYearRow } from "./atlas";

/** One timeline for the page and server export. */
export function regionalRaceData(towns: AtlasChild[], ranking: {regions: RankingRegion[]; cells: ChildYearRow[]}, stand: string, basePath = "") {
  const sums = new Map(foldSiblings(ranking.regions, ranking.cells).map(row => [row.region_id, row.sums.alle.count]));
  const rows = towns.map(town => ({id:town.region_id,name:town.name,href:basePath && town.slug ? `${basePath}/${town.slug}` : null,value:sums.get(town.region_id) ?? 0}));
  const history = Array.from({length:Number(stand.slice(0,4))-2000+1}, (_,index) => {
    const year = 2000 + index;
    const values = new Map(foldSiblings(ranking.regions,ranking.cells.filter(cell=>cell.year<=year)).map(row=>[row.region_id,row.sums.alle.count]));
    return {year,rows:towns.map(town=>({id:town.region_id,value:values.get(town.region_id) ?? 0}))};
  });
  return {rows,history};
}
