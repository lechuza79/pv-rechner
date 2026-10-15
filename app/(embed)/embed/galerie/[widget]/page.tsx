import {municipalRankingCombination} from "../../../../../lib/widget-ranking-combination";
import {readDistrictRankingSnapshot} from "../../../../../lib/kreis-ranking-snapshot-server";
import {districtRankingCategories} from "../../../../../lib/kreis-ranking-combination";
import RankingWidgetCombination from "../../../../../components/gemeinde/RankingWidgetCombination";
import RegionalSingleWidget from "../../../../../components/gemeinde/RegionalSingleWidget";
import WidgetPresentation from '../../../../../components/dashboard/WidgetPresentation';
import {parseWidgetAppearance} from '../../../../../lib/widget-appearance';
import { Suspense } from "react";
import SolarTrendCard from "../../../../../components/SolarTrendCard";
import { getSolarMonthlySeries } from "../../../../../lib/solar-trend-data";
import { RankingPodiumWidget } from "../../../../../components/gemeinde/GemeindeRankingWidget";
import { notFound } from "next/navigation";
import { ladeGemeindeAnzeigePaket } from "../../../../../lib/gemeinde-paket-server";
import { paketFuer } from "../../../../../components/gemeinde/paket-teile";
import GemeindeAnsicht from "../../../../../components/gemeinde/GemeindeAnsicht";

import {getRegionById, getChildren, foldSiblings} from '../../../../../lib/atlas';
import {getRankingDataForPage} from '../../../../../lib/atlas-ranking-server';
import {widgetRankingRows} from '../../../../../lib/widget-ranking';
import {getMastrDataAsOf} from '../../../../../lib/mastr-data';
import {loadDistrictContent} from '../../../../../lib/district-monitor-server';
import {isDistrictMember} from '../../../../../lib/district-package';
import {RegionalMonthlySolarWidget} from '../../../../../components/landkreis/RegionalMonthlySolarWidget';

import {MUNICIPAL_WIDGET_VIEWS as views} from '../../../../../lib/municipal-widget-views';
export default async function Page({params, searchParams}: {params: Promise<{widget: string}>; searchParams: Promise<{ags?: string;comparison?:string;list?:string;"ranking-category"?:string;theme?:string;background?:string;layout?:string;sharing?:string;autoplay?:string;presentation?:string}>}) {
  const {widget} = await params;
  if (widget === "solar-trend-monat") {
    const series = await getSolarMonthlySeries();
    return series.length ? <Suspense fallback={<p>Wird geladen …</p>}><WidgetPresentation widgetId="solar-trend-monat"><SolarTrendCard series={series}/></WidgetPresentation></Suspense> : <p>Für den Monatsvergleich liegen noch keine Daten vor.</p>;
  }
  const single = views[widget as keyof typeof views];
  if (!single && widget !== "gemeinde-ranking" && widget !== "regional-basic-stats") notFound();
  const query=await searchParams;
  const appearance=parseWidgetAppearance(query);
  const {ags = "06440016"} = query;
  if (/^\d{5}$/.test(ags) && widget === "gemeinde-ranking" && query.comparison === "districts") {
    const snapshot=await readDistrictRankingSnapshot();
    if(!snapshot)return <p role="status">Für diesen Kreis liegen noch keine vorbereiteten Platzierungen vor.</p>;
    const state=await getRegionById(ags.slice(0,2));
    const categories=districtRankingCategories(snapshot.kreise,ags,state?.name??"Bundesland",snapshot.stand);
    if(!categories.length)return <p role="status">Für diesen Kreis liegt keine Platzierung vor.</p>;
    return <WidgetPresentation widgetId="gemeinde-ranking" appearance={{...appearance,theme:appearance.theme??'light'}}><RankingWidgetCombination categories={categories} label="Platzierungen im Vergleich" initialCategory={query['ranking-category']??categories[0].data.category}/></WidgetPresentation>;
  }
  if (/^(\d{2}|\d{5})$/.test(ags) && widget === "gemeinde-ranking") {
    const region=await getRegionById(ags);
    if(!region || !['landkreis','bundesland'].includes(region.level))notFound();
    const childrenPromise=getChildren(region);
    const [children,ranking,stand]=await Promise.all([childrenPromise,getRankingDataForPage(region,childrenPromise),getMastrDataAsOf()]);
    if(!stand)return <p role="status">Für dieses Gebiet liegt noch kein Datenstand vor.</p>;
    const members=new Set(children.filter(child=>region.level==='landkreis'?isDistrictMember(child,ags):child.bezeichnung!=='Gemeindefreies Gebiet').map(child=>child.region_id));
    const peers=foldSiblings(ranking.regions.filter(row=>members.has(row.region_id)),ranking.cells);
    if(!peers.length)return <p role="status">Für dieses Gebiet liegt noch kein Vergleich vor.</p>;
    if(query.list==='on') return <WidgetPresentation widgetId="gemeinde-ranking" appearance={{...appearance,layout:undefined,theme:appearance.theme??'light'}}><RankingWidgetCombination label={`Vergleiche in ${region.name}`} initialCategory={query["ranking-category"]} categories={[
      {data:{place:region.name,category:'count',title:'Zahl der Solaranlagen',unit:'Anlagen',scope:region.name,stand,rows:widgetRankingRows(peers),animate:true,shareParams:{ags,list:'on'}}},
      ...([{key:'kwp',title:'Installierte Solarleistung',unit:'kWp'},{key:'speicher',title:'Installierte Speicherkapazität',unit:'kWh'}] as const).map(metric=>({data:{place:region.name,category:metric.key,title:metric.title,unit:metric.unit,scope:region.name,stand,
        rows:[...peers].sort((a,b)=>b.sums.alle[metric.key]-a.sums.alle[metric.key]||a.name.localeCompare(b.name,'de')).map(peer=>({id:peer.region_id,name:peer.name,value:peer.sums.alle[metric.key],formatted:peer.sums.alle[metric.key].toLocaleString('de-DE',{maximumFractionDigits:1}),rank:1+peers.filter(other=>other.sums.alle[metric.key]>peer.sums.alle[metric.key]).length,own:false})),animate:true,shareParams:{ags,list:'on','ranking-category':metric.key}}}))
    ]}/></WidgetPresentation>;

    return <WidgetPresentation widgetId="gemeinde-ranking" appearance={{...appearance,theme:appearance.theme??'light'}}><RankingPodiumWidget data={{place:region.name,category:'count',title:'Zahl der Solaranlagen',unit:'Anlagen',scope:region.name,stand,rows:widgetRankingRows(peers),animate:true,shareParams:{ags}}}/></WidgetPresentation>;
  }
  if (/^\d{5}$/.test(ags) && widget === "gemeinde-solar-monat") {
    const region=await getRegionById(ags);
    if(!region || region.level!=="landkreis")notFound();
    const [children,stand]=await Promise.all([getChildren(region),getMastrDataAsOf()]);
    if(!stand)return <p role="status">Für dieses Gebiet liegt noch kein Datenstand vor.</p>;
    const members=children.filter(child=>isDistrictMember(child,ags)).map(child=>child.region_id);
    const content=await loadDistrictContent(ags,members,stand);
    const data=content.monitor.energy;
    return <WidgetPresentation widgetId={widget} appearance={appearance}>{data?.monthly.length
      ? <RegionalMonthlySolarWidget data={data} name={region.name} regionId={ags}/>
      : <p role="status">Für die Solarerzeugung liegt noch kein vollständiger gemeinsamer Monat aller Gemeinden vor.</p>}
    </WidgetPresentation>;
  }
  if (!/^\d{8}$/.test(ags)) notFound();
  const paket = await ladeGemeindeAnzeigePaket(ags);
  if (!paket) return <p>Für diesen Ort liegt dieses Widget noch nicht vor.</p>;
  if (widget === "gemeinde-ranking") {
    if(query.list==='on') {
      const land=await getRegionById(ags.slice(0,2));
      if(!land)notFound();
      const combination=municipalRankingCombination(paket,{id:land.region_id,name:land.name});
      const requested=query['ranking-category'];
      return <WidgetPresentation widgetId="gemeinde-ranking" variant="full" appearance={{...appearance,layout:undefined,theme:appearance.theme??'light'}}><RankingWidgetCombination {...combination} initialCategory={combination.categories.some(item=>item.data.category===requested)?requested:combination.initialCategory}/></WidgetPresentation>;
    }
    const rows = widgetRankingRows(paket.district.peers,paket.ags);
    return <WidgetPresentation widgetId="gemeinde-ranking" appearance={{...appearance,theme:appearance.theme??'light'}}><RankingPodiumWidget data={{place:paket.name,category:"count",title:"Zahl der Solaranlagen",unit:"Anlagen",scope:`${paket.kreis.name}`,stand:paket.registerStand,rows,animate:true,shareParams:{ags}}}/></WidgetPresentation>;
  }
  if (['regional-current-power','gemeinde-solar-monat','regional-basic-stats'].includes(widget)) {
    const {ags,name,registerStand,register,monitorPeriods,monitorHistory,einwohnerStand}=paket;
    const kind=widget==='regional-current-power'?'power':widget==='gemeinde-solar-monat'?'month':'stats';
    return <WidgetPresentation widgetId={widget} variant='full' appearance={appearance}><RegionalSingleWidget kind={kind} data={{ags,name,registerStand,register:register?{own:register.own,chartMix:register.chartMix}:null,monitorPeriods:kind==='month'?monitorPeriods:null,monitorHistory:kind==='stats'?monitorHistory:null,einwohnerStand}}/></WidgetPresentation>;
  }
  return <WidgetPresentation widgetId={widget} appearance={appearance}><GemeindeAnsicht ansicht="monitor" paket={paketFuer("monitor", paket)} single={single as React.ComponentProps<typeof GemeindeAnsicht>["single"]}/></WidgetPresentation>;
}
