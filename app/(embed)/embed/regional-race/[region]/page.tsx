import {notFound} from "next/navigation";
import Script from "next/script";
import DistrictRaceWidget from "../../../../../components/landkreis/DistrictRaceWidget";
import {loadRegionalRace} from "../../../../../lib/regional-race-server";

export const metadata={title:"Solaranlagen im regionalen Vergleich",robots:{index:false,follow:false}};
export default async function RegionalRacePage({params}:{params:Promise<{region:string}>}) {
  const {region}=await params;
  if(!/^(de|\d{2}|\d{5})$/.test(region)) notFound();
  const race=await loadRegionalRace(region);
  if(!race) notFound();
  const wording=race.region.level==="de" ? {title:"Welches Bundesland hat die meisten Solaranlagen?",members:"Alle Bundesländer",leaders:"Die zehn führenden Bundesländer",unit:"Bundesländer"} : race.region.level==="bundesland" ? {title:"Welcher Kreis hat die meisten Solaranlagen?",members:"Alle Landkreise und kreisfreien Städte",leaders:"Die zehn führenden Kreise",unit:"Kreise"} : undefined;
  return <main style={{maxWidth:960,margin:"0 auto",padding:24}}>
    <DistrictRaceWidget regionId={region} name={race.region.name} stand={race.stand} rows={race.rows} history={race.history} wording={wording}/>
    <Script src="/gemeinde/landkreis-rennen.js" strategy="beforeInteractive"/>
    <Script src="/gemeinde/konfetti.js" strategy="beforeInteractive"/>
  </main>;
}
