'use client';
import {useEffect,useRef,useState} from 'react';
import {StrommixRadarWidget,useRadarFrames} from '../../../components/energy/StrommixRadarWidget';
import {ViewportStage} from '../../../components/ViewportStage';
import {useGenerationMix, type GenerationData} from '../../../lib/energy';
import {jetztAusReihe,strommixGroups} from '../../../lib/strommix-now';
import {anteilZahl, calcPeriodStats} from '../../../lib/chart-utils';
import {ElectricityFlowSummary} from '../../../components/energy/ElectricityFlowSummary';
import {generationWithoutStorage} from '../../../lib/strommix-radar';
import {ShareDonut} from '../../../components/charts/ShareDonut';
import {WidgetFrame} from '../../../components/dashboard/WidgetFrame';
import {WidgetPresentationProvider} from '../../../components/dashboard/WidgetPresentationContext';
import {EnergyMonitor} from '../../../components/dashboard/EnergyMonitor';
import ErzeugungWidget from '../../../components/ErzeugungWidget';
import ScrollIndicator from '../../../components/ScrollIndicator';
import LiveDataStatus from '../../../components/LiveDataStatus';
import {LoadingDots} from '../../../components/LoadingDots';
import EnergyDataNotice from '../../../components/energy/EnergyDataNotice';
import {quellenHinweis} from '../../../lib/energy-ersatzstand';
import stage from '../../../components/EnergyEditorialStage.module.css';
import foundation from '../../../components/social/atlas-foundations.module.css';

/** Both the answer and charts use the same generation series and calculation. */
export default function StrommixOverview({initialData, renderedAt, section='hero',review=false,scrollTarget='#bundeslaender',visual,secondary=false,spider=false,splitHero=false}:{splitHero?:boolean;spider?:boolean;visual?:React.ReactNode;secondary?:boolean;scrollTarget?:string;review?:boolean;initialData?:GenerationData;renderedAt?:string;section?:'hero'|'day'|'flows'}) {
 const {data,loading,error,retrievedAt}=useGenerationMix('de',24,undefined,initialData);
 const introRef=useRef<HTMLDivElement>(null);
 const [showTimelineLabels,setShowTimelineLabels]=useState(false);
 useEffect(()=>{
  if(!splitHero||!introRef.current)return;
  const mobile=window.matchMedia('(max-width:760px)');
  let visible=true;
  const update=()=>setShowTimelineLabels(mobile.matches&&!visible);
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting&&entry.intersectionRatio>=.1;update();},{threshold:[0,.1]});
  observer.observe(introRef.current);mobile.addEventListener('change',update);
  return()=>{observer.disconnect();mobile.removeEventListener('change',update);};
 },[splitHero]);
 const [radarTimestamp,setRadarTimestamp]=useState<string|null>(null);
 const {frame:radarFrame}=useRadarFrames(data.data,radarTimestamp);
 const generation=generationWithoutStorage(data.data);
 const values=jetztAusReihe(generation);
 const stats=calcPeriodStats(generation,data.resolution);
 const largest=values?.segments.find(s=>s.key!=='rest');
 const notice=quellenHinweis(data,values?.ts);
 const timestamp=values?new Date(values.ts).toLocaleString('de-DE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}):null;
 const difference=values&&stats?values.eeSharePct-stats.eeSharePct:null;
 if(section==='day')return <EnergyMonitor className={splitHero?stage.dayOverlap:undefined} scheme="light" sectionStyle="product" topics={[{
  id:'tagesverlauf',title:'Wie viel liefern Wind und Solar im Tagesverlauf?',chartSide:'left',
  description:<><p>{stats?<>Über die letzten 24 Stunden lag der Anteil erneuerbarer Energien bei <strong>{anteilZahl(stats.eeSharePct)} %</strong>. {difference!==null&&<>Der zuletzt gemeldete Anteil liegt {anteilZahl(Math.abs(difference))} Prozentpunkte {difference>=0?'darüber':'darunter'}.</>}</>:<>Die Anteile verändern sich mit der Erzeugung von Wind, Solar und den übrigen Energieträgern.</>}</p><p>Wie im Live-Radar sind Speicherabgabe und Importe hier ausgeschlossen. Das ist der Vergleich mit den vergangenen 24 Stunden, nicht mit dem abgeschlossenen Kalendertag. Tageslicht, Wind und die übrige Erzeugung beeinflussen den Verlauf.</p></>,
  widgets:<WidgetPresentationProvider appearance={{theme:'light'}}><ErzeugungWidget nackt onsite highlightTs={values?.ts}/></WidgetPresentationProvider>
 }]}/>;
 const radarWidget=<StrommixRadarWidget points={data.data} provenance={data} timestamp={radarTimestamp} onChange={setRadarTimestamp} hero={splitHero} hideLabels={splitHero&&!showTimelineLabels} loading={loading} retrievedAt={retrievedAt} renderedAt={renderedAt??initialData?.retrievedAt??"1970-01-01T00:00:00Z"}/>;
 const flows=<ElectricityFlowSummary editorial={section==='flows'} retrievedAt={retrievedAt} renderedAt={renderedAt??initialData?.retrievedAt??"1970-01-01T00:00:00Z"} point={data.data.at(-1)} stale={data.stale} fallback={data.fallback}/>;
 if(section==='flows')return <section id="speicher-stromhandel" className={`${stage.stage} ${foundation.foundation}`} data-story-scheme="dark"><div className={stage.flowSection}><header className={stage.sectionIntro}><h2>Speicher und Stromhandel</h2><p>Wie viel Strom wird gespeichert, abgegeben und über Deutschlands Grenzen ausgetauscht?</p></header><WidgetPresentationProvider appearance={{theme:'dark'}}><div className={stage.flowGrid}>{flows}</div></WidgetPresentationProvider></div></section>;
 if(splitHero)return <ViewportStage><section className={`${stage.stage} ${foundation.foundation}`} data-story-scheme="dark" aria-labelledby="strommix-title"><div className={stage.splitHero}>
 <div ref={introRef} className={stage.splitIntro}><LiveDataStatus observedAt={radarFrame?.ts} showObservedAt retrievedAt={retrievedAt} renderedAt={renderedAt??initialData?.retrievedAt??"1970-01-01T00:00:00Z"} refreshPage={false}/><h1 id="strommix-title">Strommix Deutschland live</h1>
 <p>Wie viel Strom liefern Wind, Sonne, Kohle und Gas? Entdecke Deutschlands aktuelle Stromerzeugung und ihren Verlauf über die letzten 24 Stunden.</p>
 {values&&largest&&<p>Zuletzt stammten <strong>{anteilZahl(values.eeSharePct)} % aus erneuerbaren Energien</strong>. Den größten Beitrag lieferte <strong>{largest.label} mit {anteilZahl(largest.value/values.totalMw*100)} %</strong>.</p>}
 {notice&&<EnergyDataNotice details={notice} stale={!!data.stale}/>}
 <ScrollIndicator href="#speicher-stromhandel">Zahlen einordnen</ScrollIndicator></div>
 <div className={stage.splitVisual}><WidgetPresentationProvider appearance={{theme:'dark'}}>{radarWidget}</WidgetPresentationProvider></div>
 </div></section></ViewportStage>;
 if(spider)visual=<WidgetPresentationProvider appearance={{theme:'dark'}}><EnergyMonitor scheme="dark" heroChart={radarWidget} heroAside={flows}/></WidgetPresentationProvider>;

 const Heading=secondary?'h2':'h1';
 const headingId=secondary?'strommix-live-detail-title':'strommix-title';
 return <section className={`${stage.stage} ${foundation.foundation}`} data-story-scheme="dark" aria-labelledby={headingId} style={{'--energy-hero-artwork':"url('/illustrations/energy/mix-renewables.webp')"} as React.CSSProperties}>
 <div className={`${stage.heroBackdrop} ${visual?stage.mapHeroBackdrop:""}`}><div className={`${stage.heroBody} ${visual?stage.mapHeroBody:""}`}>
  <div className={stage.heroMeta}><LiveDataStatus retrievedAt={retrievedAt} renderedAt={renderedAt??initialData?.retrievedAt??"1970-01-01T00:00:00Z"} refreshPage={review}/></div>
  <div className={stage.intro}><Heading id={headingId}>{secondary?"Erneuerbare im aktuellen Strommix":"Strommix Deutschland live"}</Heading>
  <p>{values&&largest?<>Im zuletzt gemeldeten Strommix deckten erneuerbare Energien <strong>{anteilZahl(values.eeSharePct)} %</strong> der öffentlichen Nettostromerzeugung ohne Pumpspeicher-Abgabe. <strong>{largest.label}</strong> lieferte mit {anteilZahl(largest.value/values.totalMw*100)} % den größten Einzelbeitrag.</>:<>Wie viel Strom liefern Wind, Sonne, Kohle und Gas? Hier findest du den aktuellen Strommix Deutschlands und die Entwicklung im Tages- und Jahresverlauf.</>}</p>
  {notice&&<EnergyDataNotice details={notice} stale={!!data.stale}/>}
  <ScrollIndicator href={scrollTarget}>Zahlen einordnen</ScrollIndicator></div>
  {visual?<div className={stage.mapHeroVisual}>{visual}</div>:<EnergyMonitor scheme="dark" className={`${stage.teasers} strommix-hero-tiles`} kpis={<WidgetPresentationProvider appearance={{theme:'dark'}}><WidgetFrame title={review?"Strommix im Überblick":"Erneuerbare im Strommix"} kind="donut" help={<>Öffentliche Nettostromerzeugung ohne Speicherabgabe und Stromimporte. Datenstand: {timestamp??'nicht verfügbar'}. Die Anteile werden aus derselben Erzeugungsreihe wie die Texte berechnet. Alle Prozentwerte beziehen sich auf die gesamte Erzeugung; der aufgeklappte Ring zeigt die Zusammensetzung der gewählten Gruppe.</>}>
  {values&&review?<ShareDonut overview neutralOverview legendColumns={3} palette="neutral" label="Aktueller Strommix nach Energieträger" values={strommixGroups(generation)} totalCenter={{value:(values.totalMw/1000).toLocaleString('de-DE',{maximumFractionDigits:1}),unit:'GW',label:'Stromerzeugung'}} formatValue={v=>({value:anteilZahl(v/values.totalMw*100),unit:'%'})}/>:values?<ShareDonut defaultIndex={0} showLegend={false} palette="neutral" label="Anteil erneuerbarer Energien" values={[{label:'Erneuerbare',value:values.eeSharePct,visual:'/illustrations/energy/mix-renewables.webp'},{label:'Übrige Erzeugung',value:100-values.eeSharePct}]} formatValue={v=>({value:anteilZahl(v),unit:'%'})}/>:<p role="status">{loading?<LoadingDots/>:error?'Daten gerade nicht erreichbar.':'Noch keine Daten verfügbar.'}</p>}
  </WidgetFrame></WidgetPresentationProvider>}/> }
 </div></div></section>;
}
