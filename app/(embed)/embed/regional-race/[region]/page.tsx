import {parseRaceSettings} from "../../../../../lib/race-settings";
import {notFound} from "next/navigation";
import Script from "next/script";
import DistrictRaceWidget from "../../../../../components/landkreis/DistrictRaceWidget";
import {loadRegionalRace} from "../../../../../lib/regional-race-server";

export const metadata={title:"Solaranlagen im regionalen Vergleich",robots:{index:false,follow:false}};
export default async function RegionalRacePage({params,searchParams}:{params:Promise<{region:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
  const {region}=await params;
  if(!/^(de|\d{2}|\d{5})$/.test(region)) notFound();
  const settings=parseRaceSettings(await searchParams);
  const race=await loadRegionalRace(region,settings);
  if(!race) notFound();
  const wording=race.region.level==="de" ? {title:"Welches Bundesland hat die meisten Solaranlagen?",members:"Alle Bundesländer",leaders:"Die zehn führenden Bundesländer",unit:"Bundesländer"} : race.region.level==="bundesland" ? {title:"Welcher Kreis hat die meisten Solaranlagen?",members:"Alle Landkreise und kreisfreien Städte",leaders:"Die zehn führenden Kreise",unit:"Kreise"} : {title:"Welche Gemeinde hat die meisten Solaranlagen?",members:"Alle Gemeinden im Landkreis",leaders:"Die zehn führenden Gemeinden",unit:"Orte"};
  if(wording&&settings.metric!=='count')wording.title=settings.segment==='private-roofs'?'Solarleistung auf privaten Dächern':'Installierte Solarleistung';
  if(wording&&settings.metric==="per-capita")wording.title+=" je Einwohner";
  if(wording&&settings.metric==="count"&&settings.segment==="private-roofs")wording.title="Zahl der Solaranlagen auf privaten Dächern";
  if(race.region.level==='bundesland'&&settings.cohort==='districts'){wording.unit='Landkreise';wording.members='Alle Landkreise';}
  return <main style={{maxWidth:960,margin:"0 auto",padding:24}}>
    <DistrictRaceWidget regionId={region} name={race.region.name} stand={race.stand} rows={race.rows} history={race.history} wording={wording} settings={settings}/>
    <Script src="/gemeinde/landkreis-rennen.js" strategy="beforeInteractive"/>
    <Script src="/gemeinde/konfetti.js" strategy="beforeInteractive"/>
  </main>;
}
