import WidgetPresentation from '../../../../../components/dashboard/WidgetPresentation';
import {parseWidgetAppearance} from '../../../../../lib/widget-appearance';
import { Suspense } from "react";
import SolarTrendCard from "../../../../../components/SolarTrendCard";
import { getSolarMonthlySeries } from "../../../../../lib/solar-trend-data";
import { RankingPodiumWidget } from "../../../../../components/gemeinde/GemeindeRankingWidget";
import { notFound } from "next/navigation";
import { ladeGemeindePaket } from "../../../../../lib/gemeinde-paket-server";
import { paketFuer } from "../../../../../components/gemeinde/paket-teile";
import GemeindeAnsicht from "../../../../../components/gemeinde/GemeindeAnsicht";

import {getRegionById, getChildren, foldSiblings} from '../../../../../lib/atlas';
import {getRankingDataForPage} from '../../../../../lib/atlas-ranking-server';
import {widgetRankingRows} from '../../../../../lib/widget-ranking';
import {getMastrDataAsOf} from '../../../../../lib/mastr-data';
import {loadDistrictContent} from '../../../../../lib/district-monitor-server';
import {isDistrictMember} from '../../../../../lib/district-package';
import {RegionalMonthlySolarWidget} from '../../../../../components/landkreis/DistrictEnergyWidgets';

const views = {
  "regional-current-power": "currentPower",
  "regional-annual-growth": "growth",
  "regional-composition": "anteilsdonut",
  "gemeinde-anlagenraster": "anlagenraster",
  "regional-electricity-value": "electricity-value",
  "regional-feed-in-value": "feed-in-value",
  "gemeinde-energie-jahr": "energy-year",
  "gemeinde-solar-monat": "radial",
} as const;
export default async function Page({params, searchParams}: {params: Promise<{widget: string}>; searchParams: Promise<{ags?: string;theme?:string;background?:string;layout?:string;sharing?:string;autoplay?:string}>}) {
  const {widget} = await params;
  if (widget === "solar-trend-monat") {
    const series = await getSolarMonthlySeries();
    return series.length ? <Suspense fallback={<p>Wird geladen …</p>}><SolarTrendCard series={series}/></Suspense> : <p>Für den Monatsvergleich liegen noch keine Daten vor.</p>;
  }
  const single = views[widget as keyof typeof views];
  if (!single && widget !== "gemeinde-ranking") notFound();
  const query=await searchParams;
  const appearance=parseWidgetAppearance(query);
  const {ags = "06440016"} = query;
  if (/^(\d{2}|\d{5})$/.test(ags) && widget === "gemeinde-ranking") {
    const region=await getRegionById(ags);
    if(!region || !['landkreis','bundesland'].includes(region.level))notFound();
    const childrenPromise=getChildren(region);
    const [children,ranking,stand]=await Promise.all([childrenPromise,getRankingDataForPage(region,childrenPromise),getMastrDataAsOf()]);
    if(!stand)return <p role="status">Für dieses Gebiet liegt noch kein Datenstand vor.</p>;
    const members=new Set(children.filter(child=>region.level==='landkreis'?isDistrictMember(child,ags):child.bezeichnung!=='Gemeindefreies Gebiet').map(child=>child.region_id));
    const peers=foldSiblings(ranking.regions.filter(row=>members.has(row.region_id)),ranking.cells);
    if(!peers.length)return <p role="status">Für dieses Gebiet liegt noch kein Vergleich vor.</p>;
    return <WidgetPresentation appearance={{...appearance,theme:appearance.theme??'light'}}><RankingPodiumWidget data={{place:region.name,category:'count',title:'Zahl der Solaranlagen',unit:'Anlagen',scope:region.name,stand,rows:widgetRankingRows(peers),animate:true,shareParams:{ags}}}/></WidgetPresentation>;
  }
  if (/^\d{5}$/.test(ags) && widget === "gemeinde-solar-monat") {
    const region=await getRegionById(ags);
    if(!region || region.level!=="landkreis")notFound();
    const [children,stand]=await Promise.all([getChildren(region),getMastrDataAsOf()]);
    if(!stand)return <p role="status">Für dieses Gebiet liegt noch kein Datenstand vor.</p>;
    const members=children.filter(child=>isDistrictMember(child,ags)).map(child=>child.region_id);
    const content=await loadDistrictContent(ags,members,stand);
    const data=content.monitor.energy;
    return <WidgetPresentation appearance={appearance}>{data?.monthly.length
      ? <RegionalMonthlySolarWidget data={data} name={region.name} regionId={ags}/>
      : <p role="status">Für die Solarerzeugung liegt noch kein vollständiger gemeinsamer Monat aller Gemeinden vor.</p>}
    </WidgetPresentation>;
  }
  if (!/^\d{8}$/.test(ags)) notFound();
  const paket = await ladeGemeindePaket(ags);
  if (!paket) return <p>Für diesen Ort liegt dieses Widget noch nicht vor.</p>;
  if (widget === "gemeinde-ranking") {
    const rows = widgetRankingRows(paket.district.peers,paket.ags);
    return <WidgetPresentation appearance={{...appearance,theme:appearance.theme??'light'}}><RankingPodiumWidget data={{place:paket.name,category:"count",title:"Zahl der Solaranlagen",unit:"Anlagen",scope:`${paket.kreis.name}`,stand:paket.registerStand,rows,animate:true,shareParams:{ags}}}/></WidgetPresentation>;
  }
  return <WidgetPresentation appearance={appearance}><GemeindeAnsicht ansicht="monitor" paket={paketFuer("monitor", paket)} single={single}/></WidgetPresentation>;
}
