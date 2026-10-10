import {previewData} from "./preview-data";
import 'server-only';
import {getRegionById,getChildren} from './atlas';
import {getRankingDataForPage} from './atlas-ranking-server';
import {getMastrDataAsOf} from './mastr-data';
import {isDistrictMember} from './district-package';
import {districtGeometry,childGeometry} from './district-geometry';
import {regionMapMetrics} from './region-map-metrics';

async function readloadRegionMap(id:string) {
  const region=await getRegionById(id);
  if(!region||!['landkreis','bundesland','de'].includes(region.level))return null;
  const childrenPromise=getChildren(region);
  const [children,ranking,stand,shapes]=await Promise.all([
    childrenPromise,getRankingDataForPage(region,childrenPromise),getMastrDataAsOf(),
    region.level==='landkreis'?districtGeometry(id):childGeometry(region.level as 'bundesland'|'de',id),
  ]);
  if(!stand||!shapes.length)return null;
  const towns=region.level==='landkreis'?children.filter(child=>isDistrictMember(child,id)):children.filter(child=>child.bezeichnung!=='Gemeindefreies Gebiet');
  return {region,stand,shapes,metrics:regionMapMetrics(towns,ranking)};
}

export function loadRegionMap(id:string) {
  return previewData("region-map-server-v1:"+JSON.stringify([id]),()=>readloadRegionMap(id));
}
