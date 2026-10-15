import {previewData} from "./preview-data";
import "server-only";
import {defaultRaceSettings,type RaceSettings} from "./race-settings";
import {getRegionById,getChildren} from "./atlas";
import {getRankingDataForPage} from "./atlas-ranking-server";
import {getMastrDataAsOf} from "./mastr-data";
import {isDistrictMember} from "./district-package";
import {regionalRaceData} from "./regional-race";

async function readloadRegionalRace(id:string,settings:RaceSettings=defaultRaceSettings) {
  const region=await getRegionById(id);
  if(!region || !["landkreis","bundesland","de"].includes(region.level)) return null;
  const childrenPromise=getChildren(region);
  const [children,ranking,stand]=await Promise.all([childrenPromise,getRankingDataForPage(region,childrenPromise),getMastrDataAsOf()]);
  let towns=region.level==="landkreis"?children.filter(c=>isDistrictMember(c,id)):children.filter(c=>c.bezeichnung!=="Gemeindefreies Gebiet");
  if(settings.cohort==='districts'&&region.level==='bundesland')towns=towns.filter(t=>t.bezeichnung==='Landkreis'||t.bezeichnung==='Kreis');
  if(!stand || towns.length<2 || !ranking.cells.length) return null;
  return {region,stand,...regionalRaceData(towns,ranking,stand,"",settings)};
}

export function loadRegionalRace(id:string,settings:RaceSettings=defaultRaceSettings) {
  return previewData("regional-race-server-v1:"+JSON.stringify([id,settings]),()=>readloadRegionalRace(id,settings));
}
