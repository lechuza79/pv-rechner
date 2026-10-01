import {defaultRaceSettings,type RaceSettings} from "./race-settings";
import { foldSiblings, type AtlasChild, type RankingRegion, type ChildYearRow } from "./atlas";

/** One timeline for the page and server export. */
export function regionalRaceData(towns: AtlasChild[], ranking: {regions: RankingRegion[]; cells: ChildYearRow[]}, stand: string, basePath = "",settings:RaceSettings=defaultRaceSettings) {
  const cells=settings.segment==='private-roofs'?ranking.cells.filter(cell=>cell.segment==='privat_dach'):ranking.cells;
  const sumRows=(selected:ChildYearRow[])=>new Map(foldSiblings(ranking.regions,selected).map(row=>[row.region_id,settings.metric==='count'?row.sums.alle.count:settings.metric==='kwp'?row.sums.alle.kwp:row.population&&row.population>0?row.sums.alle.kwp*1000/row.population:null]));
  const sums=sumRows(cells);
  const eligible=towns.filter(town=>settings.metric!=='per-capita'||sums.get(town.region_id)!=null);
  const rows=eligible.map(town=>({id:town.region_id,name:town.name,href:basePath&&town.slug?`${basePath}/${town.slug}`:null,value:sums.get(town.region_id)??0}));
  const history = Array.from({length:Number(stand.slice(0,4))-2000+1}, (_,index) => {
    const year = 2000 + index;
    const values = sumRows(cells.filter(cell=>cell.year<=year));
    return {year,rows:eligible.map(town=>({id:town.region_id,value:values.get(town.region_id) ?? 0}))};
  });
  return {rows,history};
}
