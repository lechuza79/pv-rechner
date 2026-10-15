import WidgetPresentation from '../../../../../components/dashboard/WidgetPresentation';
import {parseWidgetAppearance} from '../../../../../lib/widget-appearance';
import {parseRaceSettings} from "../../../../../lib/race-settings";
import {parseDistrictRaceConfig,regionalRaceWording} from '../../../../../lib/district-race-config';
import DistrictRaceComparisonServer from '../../../../../components/landkreis/DistrictRaceComparison.server';
import {notFound} from "next/navigation";
import Script from "next/script";
import DistrictRaceWidget from "../../../../../components/landkreis/DistrictRaceWidget";
import {loadRegionalRace} from "../../../../../lib/regional-race-server";

export const metadata={title:"Solaranlagen im regionalen Vergleich",robots:{index:false,follow:false}};
export default async function RegionalRacePage({params,searchParams}:{params:Promise<{region:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
  const {region}=await params;
  if(!/^(de|\d{2}|\d{5})$/.test(region)) notFound();
  const query=await searchParams;
  if(query.comparison==='district'&&/^\d{5}$/.test(region))return <main style={{width:'100%',margin:0,padding:0}}>
    <WidgetPresentation widgetId="regional-race" appearance={parseWidgetAppearance(query)}><DistrictRaceComparisonServer districtId={region} config={parseDistrictRaceConfig(region,query)}/></WidgetPresentation>
    <Script src="/gemeinde/landkreis-rennen.js" strategy="beforeInteractive"/>
    <Script src="/gemeinde/konfetti.js" strategy="beforeInteractive"/>
  </main>;
  const settings=parseRaceSettings(query);
  const race=await loadRegionalRace(region,settings);
  if(!race) notFound();
  const wording=regionalRaceWording(race.region.level,settings);
  return <main style={{width:"100%",margin:0,padding:0}}>
    <WidgetPresentation widgetId="regional-race" appearance={parseWidgetAppearance(query)}><DistrictRaceWidget regionId={region} name={race.region.name} stand={race.stand} rows={race.rows} history={race.history} wording={wording} settings={settings}/></WidgetPresentation>
    <Script src="/gemeinde/landkreis-rennen.js" strategy="beforeInteractive"/>
    <Script src="/gemeinde/konfetti.js" strategy="beforeInteractive"/>
  </main>;
}
