"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import RegionKarte, {type MapValue} from './landkreis/RegionKarte';
import {type ProjectedRegion} from '../lib/region-perspektive';
import {type StateElectricity,STATE_MIX_GROUPS} from '../lib/state-electricity';
import {jahrInBerlin,zeitpunktInBerlin} from '../lib/zeit';
import {formatGWhCompare} from '../lib/chart-utils';
import {Auswahl} from './Auswahl';
import {WidgetPresentationProvider} from './dashboard/WidgetPresentationContext';
import {ExportableWidgetFrame} from './dashboard/ExportableWidgetFrame';
import {WIDGETS} from '../lib/widget-registry';
import {LoadingDots} from './LoadingDots';
import ContentTable from './ContentTable';
import {regionalMixGroups,annualMixCategory} from '../lib/regional-mix-groups';
import {ChartDetailHeading} from './charts/ChartDetailHeading';
import {useExitPresence} from './charts/useExitPresence';
import {ShareDonut} from './charts/ShareDonut';
import type {SceneContext} from '../lib/wind-context';
import styles from './StateElectricityMap.module.css';
import './dashboard/dashboard.css';

const amount=(twh:number)=>({value:formatGWhCompare(twh*1000,'TWh').replace(/\s*TWh$/,''),unit:'TWh'});
export default function StateElectricityMap({shapes,initialData,sceneContext,review=false,hero=false,nested=false}:{nested?:boolean;hero?:boolean;review?:boolean;sceneContext:SceneContext;shapes:ProjectedRegion[];initialData:StateElectricity|null}){
 const [carrierColors,setCarrierColors]=useState<Record<string,string>>({});
 const [arrivedRegion,setArrivedRegion]=useState('');
 const [pinnedBars,setPinnedBars]=useState<string[]>([]);
 const [highlightedBars,setHighlightedBars]=useState<string[]>([]);
 const [highlightLabel,setHighlightLabel]=useState<string|null>(null);
 const hoverBar=(label:string|null)=>{setHighlightLabel(label);setHighlightedBars(label?[label]:pinnedBars);};
 const currentYear=jahrInBerlin();
 const [year,setYear]=useState(initialData?.year??currentYear),[data,setData]=useState(initialData);
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[ready,setReady]=useState(false);
 const [selected,setSelected]=useState('');
 const detailSelected=useExitPresence(selected===arrivedRegion?selected:'',180);
 useEffect(()=>{setPinnedBars([]);setHighlightedBars([]);setHighlightLabel(null);},[selected]);
 const [metricLabel,setMetricLabel]=useState('Stromerzeugung nach Energieträger');
 const metricChanged=useCallback((label:string)=>setMetricLabel(label),[]);
 useEffect(()=>{const sharedYear=Number(new URLSearchParams(window.location.search).get('jahr'));if(sharedYear>=currentYear-2&&sharedYear<=currentYear)setYear(sharedYear);},[currentYear]);
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setReady(true);observer.disconnect();}},{rootMargin:'240px'});if(host.current)observer.observe(host.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  if(data?.year===year&&!retry)return;
  const controller=new AbortController();setLoading(true);setError('');
  fetch(`/api/strommix-bundeslaender/${year}`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();return response.json() as Promise<StateElectricity>;}).then(setData).catch(()=>{if(!controller.signal.aborted)setError('Die Daten für dieses Jahr konnten nicht geladen werden.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[year,retry]); // Keep the last complete map in place until the new period has arrived.
 useEffect(()=>{if(!review||year!==currentYear)return;const timer=setInterval(()=>{if(!document.hidden)setRetry(value=>value+1);},15*60*1000);return()=>clearInterval(timer);},[review,year,currentYear]);
 const activeGroups=STATE_MIX_GROUPS.filter(group=>data?.states.some(state=>state.segments.some(segment=>segment.id===group.id&&segment.value>0)));
 const metrics=useMemo(()=>[{id:'mix',label:'Stromerzeugung nach Energieträger',values:[...(data?.states??[]).map(state=>({id:state.id,name:state.name,value:state.totalTwh,href:null,formatted:amount(state.totalTwh),bars:state.segments.filter(segment=>data?.states.some(other=>other.segments.some(item=>item.id===segment.id&&item.value>0))).map(segment=>({...segment,formatted:amount(segment.value)}))} satisfies MapValue)),...(data?.offshore??[]).map(sea=>({id:sea.id,name:`${sea.name} (Offshore)`,value:sea.value,href:null,formatted:amount(sea.value),bars:[{label:'Wind auf See',value:sea.value,color:'var(--color-text-secondary)',formatted:amount(sea.value)}]} satisfies MapValue))]}],[data]);
 const selectedValue=metrics[0].values.find(value=>value.id===detailSelected);
 const selectedSegments=data?.states.find(state=>state.id===detailSelected)?.segments??(data?.offshore.find(sea=>sea.id===detailSelected)?[{id:'offshore',label:'Wind auf See',value:selectedValue?.value??0,color:'var(--color-text-secondary)'}]:[]);
 const selectedGroups=regionalMixGroups(selectedSegments.map(segment=>({...segment,category:annualMixCategory(segment.id)})));
 const period=data?`${data.year}${data.partial?' bisher':''}`:String(year);
 const dataTable=data?(<ContentTable caption={`Stromerzeugung ${period} · alle Werte in TWh`} compact matrix rowLabelWidth={160} columnWidth={110} columnLabel="Energieträger">
    <thead><tr><th scope="col">Gebiet</th>{activeGroups.map(group=><th scope="col" key={group.id}>{group.label}</th>)}<th scope="col">Wind auf See</th><th scope="col">Gesamt</th></tr></thead>
    <tbody>{data.states.map(state=><tr key={state.id}><th scope="row">{state.name}</th>{activeGroups.map(group=><td key={group.id}>{amount(state.segments.find(segment=>segment.id===group.id)?.value??0).value}</td>)}<td>–</td><td>{amount(state.totalTwh).value}</td></tr>)}{(data.offshore??[]).map(sea=><tr key={sea.id}><th scope="row">{sea.name}</th>{activeGroups.map(group=><td key={group.id}>–</td>)}<td>{amount(sea.value).value}</td><td>{amount(sea.value).value}</td></tr>)}</tbody>
   </ContentTable>):undefined;
 return <div ref={host} className={`${styles.map} ${hero?styles.heroMap:""}`}>
 <WidgetPresentationProvider appearance={{theme:'dark',autoplay:true}}>
 <ExportableWidgetFrame showHeading={!nested} data-story-scheme="dark" place="Deutschland" widget={WIDGETS.stateElectricityMap} title="Stromerzeugung nach Energieträger" dataTable={dataTable} kind="time-series" filename={`strommix-bundeslaender-${data?.year??year}`} stand={data?.dataUntil??''} sourceVisible={false} exportDescription={`${period} · ${metricLabel}`} shareParams={{jahr:String(data?.year??year)}} help={<>
  <p>Gesamte Nettostromerzeugung öffentlicher und industrieller Kraftwerke. Die Live-Zahlen oben beziehen sich dagegen auf die öffentliche Nettostromerzeugung.</p>
  <p>Fraunhofer regionalisiert die Erzeugung: Wind und Solar anhand von Anlagen- und Wetterdaten, andere Energieträger anhand von Kraftwerksmeldungen und installierter Leistung. Die Werte sind teilweise modelliert und liegen etwa sechs Tage zurück.</p>
  <p>Datenstand: {zeitpunktInBerlin(data?.dataUntil)??'nicht verfügbar'}. Veröffentlichung: {zeitpunktInBerlin(data?.updatedAt)??'nicht verfügbar'}.</p>
  <p>Offshore-Wind wird vollständig in eigenen Balken für Nord- und Ostsee dargestellt, entsprechend der regionalen Aufteilung der Quelle. Die Positionen sind schematische Seegebietsmarker, keine Windparkstandorte. Eine zusätzliche Zurechnung zu Küstenländern würde diese Mengen doppelt zählen. Übrige &amp; Speicher umfasst Öl, nicht erneuerbaren Abfall und Pumpspeicher. Die Karte zeigt Erzeugung, nicht den Verbrauchsstrommix inklusive Importen.</p>
 </>}>
  {!hero&&!nested&&<div className={styles.controls} data-sc-export-ignore="">
   <Auswahl variant="quiet" titel={`${year}${year===currentYear?' bisher':''}`} aktiv={String(year)} onWahl={value=>{setRetry(0);setYear(Number(value));}} eintraege={Array.from({length:3},(_,i)=>({schluessel:String(currentYear-2+i),name:`${currentYear-2+i}${i===2?' bisher':''}`}))} pfeile breite={110}/>
   <Auswahl variant="quiet" titel={shapes.find(shape=>shape.id===selected)?.name??'Alle Länder und Seegebiete'} aktiv={selected} onWahl={setSelected} eintraege={[{schluessel:'',name:'Alle Länder und Seegebiete'},...shapes.map(shape=>({schluessel:shape.id,name:shape.name}))]} pfeile={false} suchPlatzhalter="Bundesland oder Seegebiet suchen" breite={230}/>
  </div>}
  {loading&&<p role="status"><LoadingDots/> Jahr wird geladen …</p>}
  {error&&<p role="alert">{error} {data&&`Angezeigt bleibt ${data.year}.`} <button type="button" onClick={()=>setRetry(value=>value+1)}>Erneut versuchen</button></p>}
  <div className={styles.regionalDetail} data-selected={Boolean(selectedValue)}>
  <div className={styles.regionalMapPane}>{selected&&<ChartDetailHeading breadcrumb={hero} title={shapes.find(shape=>shape.id===selected)?.name??'Deutschland'} onBack={selected?()=>setSelected(''):undefined} backLabel="Zurück zur Deutschlandkarte"/>}{data&&ready?<RegionKarte carrierColors={selected?carrierColors:undefined} onRegionReady={setArrivedRegion} highlightedBars={highlightedBars} onBarHover={hoverBar} sceneContext={sceneContext} shapes={shapes} metrics={metrics} focusSelection presentation="widget" framingScale={.9} member="Gebiet" overview="Länderübersicht" selectedPlace={selected} onSelectionChange={setSelected} onMetricChange={metricChanged} showSelectionSummary={false}/>:<div className={styles.placeholder} role="status"><LoadingDots/> Die Bundesländerkarte wird vorbereitet.</div>}</div>
  {selectedValue&&<div className={styles.regionalMix} data-exiting={(!selected||arrivedRegion!==selected)||undefined} inert={!selected||arrivedRegion!==selected} key={`mix-${detailSelected}`}><ShareDonut detailLayout slim showCenterLabel={false} onColorsChange={setCarrierColors} highlightLabel={highlightLabel} onSelection={row=>{const labels=row?(row.children??[row]).map(child=>child.label):[];setPinnedBars(labels);setHighlightedBars(labels);}} onHighlight={row=>{setHighlightLabel(null);setHighlightedBars(row?(row.children??[row]).map(child=>child.label):pinnedBars);}} title="Strommix" overview palette="accent-monochrome" legendColumns={3} label={`Strommix ${selectedValue.name}`} values={selectedGroups} totalCenter={{...selectedValue.formatted,label:'Stromerzeugung'}} formatValue={value=>({value:selectedValue.value?(value/selectedValue.value*100).toLocaleString('de-DE',{maximumFractionDigits:1}):'0',unit:'%'})}/></div>}
  </div>

 </ExportableWidgetFrame>
 </WidgetPresentationProvider></div>;
}
