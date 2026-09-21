import MonitorComposition from './MonitorComposition';
import {MonitorAnnualEnergyChart} from './MonitorAnnualEnergyChart';
import {MonitorMonthlySolarChart} from './MonitorMonthlySolarChart';
import React,{useEffect,useRef,useState} from 'react';
import {MunicipalChart} from '@solar-check/story-source/components/social/MunicipalChart';
import foundation from '@solar-check/story-source/components/social/atlas-foundations.module.css';
import chart from '@solar-check/story-source/components/social/StoryConceptLab.module.css';
import type {StoryConcept} from '@solar-check/story-source/lib/story-konzepte';
import data from './charts.json';
import './municipal-data.css';
import '../../components/dashboard/dashboard.css';
import {dashboardDate} from '../../lib/dashboard/format';
import {ShareDonut} from '../../components/charts/ShareDonut';
import {WidgetSetting} from '../../components/dashboard/WidgetSetting';
import history from './monitor-history.json';
import {WidgetFrame} from '../../components/dashboard/WidgetFrame';
import {KpiOverview} from '../../components/dashboard/KpiOverview';
import type {WidgetKind} from '../../lib/dashboard/model';
import {monitorKpiGroups} from './monitor-kpis';
import {MastrLiveRadial} from '../../components/MastrLiveRadial';
import {MastrMap} from '../../components/MastrMap';
import ZubauChart from '../../components/atlas/ZubauChart';
import register from '../../public/atlas-design-preview/current-register.json';
import ranking from '../../public/atlas-design-preview/ranking-data.json';

export function CurrentPower(){
 const [reading,setReading]=useState<any>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  let active=true;
  const load=()=>{
   const source=(parent as any).atlasWeather;
   if(!source){setFailed(true);return;}
   source.load().then((result:any)=>{if(active){setReading(result);setFailed(false);}}).catch(()=>{if(active)setFailed(true);});
  };
  load();const timer=setInterval(load,300000);
  return()=>{active=false;clearInterval(timer);};
 },[]);
 const kwp=register.chartMix.values.reduce((sum,row)=>sum+row.value,0);
 const points=reading?.points?.map((point:any)=>({ts:point.time,mw:kwp*point.powerPct/100000}))??[];
 const current=points.filter((point:any)=>Date.parse(point.ts)<=Date.now()).at(-1);
 return <WidgetFrame title="Solarleistung heute" kind="radial" context={<>Aus dem Wetter am Standort simuliert{reading?.power?.asOf?' · Stand '+new Date(reading.power.asOf).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'})+' Uhr':''}</>}>
 <div className="monitor-native-chart monitor-current-power">{failed?<p>Wetterdaten derzeit nicht verfügbar.</p>:!reading?<p>Wetterdaten werden geladen …</p>:<MastrLiveRadial energietraeger="solar" installedKwp={kwp} injected={points} highlightTs={current?.ts} secondaryBars unit="MW" className="monitor-live-radial" bare fuelltBreite/>}</div></WidgetFrame>;
}
function LocalMap(){
 const [selected,setSelected]=useState('09679147');
 const peers=ranking.districtPeers;
 const place=peers.find(row=>row.region_id===selected);
 return <section aria-label="Karte"><h3>Solaranlagen im Landkreis</h3><article className="monitor-map monitor-widget"><p>Tippen Sie auf einen Ort für Anlagenzahl und installierte Leistung. Stand {formatDate(ranking.dataAsOf)}</p><WidgetSetting label="Ort" value={selected} onChange={setSelected} options={peers.map(row=>({value:row.region_id,label:row.name}))}/><MastrMap level="landkreis" parentAgs="09679" selectedAgs={selected} selectionStyle="pin" values={peers.map(row=>({ags:row.region_id,value:row.sums.alle.count}))} valueLabel="Solaranlagen" onSelect={setSelected}/><p aria-live="polite">{place?`${place.name}: ${place.sums.alle.count.toLocaleString('de-DE')} Solaranlagen · ${(place.sums.alle.kwp/1000).toLocaleString('de-DE',{maximumFractionDigits:1})} MWp`:'Für diesen Ort liegen hier keine Werte vor.'}</p></article></section>;
}


const formatDate=dashboardDate;
const widgetRole=(item:any)=>{
 const titles:Record<string,string>={'anteilsdonut':'Installierte Solarleistung nach Anlagentyp','electricity-value':'Wert des Solarstroms','feed-in-value':'Einspeisevergütung','verlauf':'Zubau pro Monat','radial':'Solarerzeugung im Tagesverlauf','energy-year':'Solar- und Windpotenzial im Jahresverlauf'};
 return {title:titles[item.template]??(item.story.countComparison?.label?item.story.countComparison.label+': Anteil an Anzahl und Leistung':'Anlagenbestand'),kind:({'anteilsdonut':'donut','anlagenraster':'composition','verlauf':'time-series','energy-year':'radial','radial':'radial'} as Record<string,WidgetKind>)[item.template]??'number'};
};
export function MonitorWidget({item}:{item:any}){
 const role=widgetRole(item);
 const [period,setPeriod]=useState('current');
 const isDonut=item.template==='anteilsdonut';
 const selected=history.observations.find(row=>row.end===period);
 const values=isDonut?(selected?.solarMix??item.story.values).map((row:any)=>({...row,visual:row.label==='Gebäudeanlagen'?'/brand/rank-house.webp':'/brand/rank-balcony-modern.webp'})):[];
 return <WidgetFrame title={role.title} kind={role.kind} className={chart.visualTheme} data-story-scheme="dark" settingsPlacement={isDonut?"below-title":"header"} context={isDonut||['energy-year','radial','electricity-value','feed-in-value','anlagenraster'].includes(item.template)?undefined:<>Letztes Update: {formatDate(item.story.sourceDate??data.sourceDate)}{!isDonut&&item.template!=='anlagenraster'&&item.template!=='energy-year'&&<> · {item.story.period}</>}</>} settings={isDonut?<WidgetSetting label="Zeitraum des Anlagentyps" stepper hideLabel size="md" value={period} onChange={setPeriod} options={[{value:'current',label:'Heute'},...history.observations.slice(0,13).map(row=>({value:row.end,label:new Date(row.end+'T12:00:00').toLocaleDateString('de-DE',{month:'long',year:'numeric'})}))]}/>:undefined} help={isDonut?<p>Frühere Monatswerte zeigen die heute erfassten Anlagen nach ihrem Inbetriebnahmedatum. Nachmeldungen können frühere Werte verändern.</p>:undefined}>
  {isDonut?<ShareDonut values={values}/>:item.template==='anlagenraster'?<div className="monitor-widget-body"><MonitorComposition story={item.story}/></div>:<div className="monitor-widget-body"><>{item.story.energyYear?<MonitorAnnualEnergyChart data={item.story.energyYear}/>:item.story.solarMonth?<MonitorMonthlySolarChart data={item.story.solarMonth}/>:<MunicipalChart story={item.story as StoryConcept}/>}</></div>}
 </WidgetFrame>;
}
function AnnualGrowth({years}:{years:{year:number;count:number}[]}){
 const [range,setRange]=useState('all');
 const end=Number(register.sourceDate.slice(0,4));
 return <WidgetFrame title="Zubau pro Jahr" kind="time-series" context={<>Letztes Update: {formatDate(register.sourceDate)}</>} settings={<WidgetSetting label="Zeitraum des Zubaus" hideLabel value={range} onChange={setRange} options={[{value:'all',label:'Seit 2014'},{value:'10',label:'Letzte 10 Jahre'},{value:'5',label:'Letzte 5 Jahre'}]}/>}><div className="monitor-native-chart"><ZubauChart years={years} from={range==='all'?2014:end-Number(range)+1} asOfYear={end}/></div></WidgetFrame>;
}
export default function MunicipalDataPreview(){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  // Shared tooltip portals live on body, outside the embedded theme root.
  const properties=['--color-bg','--color-text-primary','--color-text-secondary','--color-text-muted','--color-border','--font-text','--font-size-small'];
  const computed=getComputedStyle(root.current!);
  const previous=properties.map(property=>[property,document.body.style.getPropertyValue(property)]);
  properties.forEach(property=>document.body.style.setProperty(property,computed.getPropertyValue(property)));
  const notify=()=>parent.postMessage({type:'municipal-data-layout',height:root.current?.scrollHeight},location.origin);
  const observer=new ResizeObserver(notify);observer.observe(root.current!);notify();
  return()=>{observer.disconnect();previous.forEach(([property,value])=>{if(value)document.body.style.setProperty(property,value);else document.body.style.removeProperty(property);});};
 },[]);
 const sections=['Anlagenbestand','Strom und Wert'];
 const years=Object.entries(register.series.filter(row=>row.energietraeger==='solar').reduce((result:Record<number,number>,row)=>{result[row.year]=(result[row.year]??0)+row.count;return result;},{})).map(([year,count])=>({year:Number(year),count})).sort((a,b)=>a.year-b.year);
 return <div ref={root} className={`${foundation.foundation} municipal-data sc-dashboard`} data-story-scheme="dark">
  <KpiOverview groups={monitorKpiGroups} help={<><p>Gezählt werden heute erfasste Anlagen nach ihrem Inbetriebnahmedatum. Stillgelegte Anlagen fehlen; Nachmeldungen können frühere Werte verändern.</p><p>Für „je Einwohner“ verwenden wir durchgehend die Einwohnerzahl vom 30. Juni 2026.</p></>}/>
  <section aria-label="Aktuelle Solarleistung und Ausbau"><div className="sc-widget-grid"><CurrentPower/><AnnualGrowth years={years}/></div></section>
  {sections.map(section=>{
   const items=data.charts.filter(item=>item.section===section&&item.template!=='verlauf');
   return <section key={section} aria-label={section}><h3>{section}</h3>
    <div className="sc-widget-grid">{items.map(item=><MonitorWidget key={item.story.id} item={item}/>)}</div>
    {section==='Strom und Wert'&&data.availability.some(item=>item.status==='missing')&&<p className="municipal-data-missing">Für die Monats- und Jahreserzeugung sowie Stromwert und Einspeisevergütung fehlen noch vollständige örtliche Wetterdaten. Diese Diagramme erscheinen, sobald die Berechnung vollständig vorliegt.</p>}
   </section>;
  })}
 <LocalMap/>
 </div>;
}
