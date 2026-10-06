import {foldSiblings,type RankingRegion,type ChildYearRow,type AtlasChild} from './atlas';
import {pvLeistungTeile,anlagenZahlTeile,speicherKwhTeile} from './atlas-format';

/** One metric adapter for the regional hero and standalone map widget. */
export function regionMapMetrics(towns:AtlasChild[],ranking:{regions:RankingRegion[];cells:ChildYearRow[]},basePath?:string) {
  const sums=new Map(foldSiblings(ranking.regions,ranking.cells).map(row=>[row.region_id,row.sums.alle]));
  const places=[...towns].sort((a,b)=>a.name.localeCompare(b.name,'de'));
  return [
    {id:'kwp' as const,label:'Installierte Solarleistung',format:pvLeistungTeile},
    {id:'count' as const,label:'Solaranlagen',format:anlagenZahlTeile},
    {id:'speicher' as const,label:'Speicherkapazität',format:speicherKwhTeile},
  ].map(metric=>({id:metric.id,label:metric.label,values:places.map(place=>{
    const value=sums.get(place.region_id)?.[metric.id]??null;
    return {id:place.region_id,name:place.name,value,formatted:value===null?{value:'–',unit:''}:metric.format(value),href:basePath&&place.slug?`${basePath}/${place.slug}`:null};
  })}));
}
