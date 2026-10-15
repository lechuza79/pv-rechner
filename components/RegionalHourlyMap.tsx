'use client';
import {useEffect,useMemo,useState} from 'react';
import {Auswahl} from './Auswahl';
import RegionKarte from './landkreis/RegionKarte';
import ContentTable from './ContentTable';
import {ExportableWidgetFrame} from './dashboard/ExportableWidgetFrame';
import {WidgetPresentationProvider} from './dashboard/WidgetPresentationContext';
import {LoadingDots} from './LoadingDots';
import {formatMWIn} from '../lib/chart-utils';
import {STATE_MIX_GROUPS} from '../lib/state-electricity';
import {regionalMixGroups,hourlyMixCategory} from '../lib/regional-mix-groups';
import {ChartDetailHeading} from './charts/ChartDetailHeading';
import {useExitPresence} from './charts/useExitPresence';
import {ShareDonut} from './charts/ShareDonut';
import {co2RegionShapes,type RegionalHourlyData} from '../lib/co2map';
import type {ProjectedRegion} from '../lib/region-perspektive';
import type {SceneContext} from '../lib/wind-context';
import {WIDGETS} from '../lib/widget-registry';
import {LIVE_DATA_CHECK_MS} from '../lib/live-data-time';
import {zeitpunktInBerlin} from '../lib/zeit';
import styles from './StateElectricityMap.module.css';
const carrierGroups:Record<string,string>={Solar:'solar','Wind Onshore':'wind','Wind Offshore':'wind',Biomass:'bio',Hydro:'water','Other renewable':'other',Lignite:'coal','Hard coal':'coal',Gas:'gas',Nuclear:'nuclear','Other fossil':'other',Storage:'other'};
const carrierColor=(id:string)=>STATE_MIX_GROUPS.find(group=>group.id===carrierGroups[id])!.color;
const amount=(mw:number)=>({value:mw===0?'0':formatMWIn(mw,'GW').replace(/\s*GW$/,''),unit:'GW'});
const hourLabel=(ts:string)=>new Date(ts).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'})+' Uhr';
const pickerHourLabel=(ts:string,now:string)=>{
 const date=new Date(ts),reference=new Date(now);
 const day=(d:Date)=>d.toLocaleDateString('de-DE',{timeZone:'Europe/Berlin'});
 const prefix=day(date)===day(reference)?'Heute':date.toLocaleDateString('de-DE',{day:'numeric',month:'short',timeZone:'Europe/Berlin'});
 return `${prefix}, ${date.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'})}`;
};
export default function RegionalHourlyMap({shapes,sceneContext,initialData,standalone=false,initialSelected="",initialTime="latest"}:{standalone?:boolean;initialSelected?:string;initialTime?:string;shapes:ProjectedRegion[];sceneContext:SceneContext;initialData:RegionalHourlyData|null}){
 const [carrierColors,setCarrierColors]=useState<Record<string,string>>({});
 const [arrivedRegion,setArrivedRegion]=useState('');
 const [pinnedBars,setPinnedBars]=useState<string[]>([]);
 const [highlightedBars,setHighlightedBars]=useState<string[]>([]);
 const [highlightLabel,setHighlightLabel]=useState<string|null>(null);
 const hoverBar=(label:string|null)=>{setHighlightLabel(label);setHighlightedBars(label?[label]:pinnedBars);};
 const [data,setData]=useState(initialData),[error,setError]=useState(''),[selected,setSelected]=useState(initialSelected),[time,setTime]=useState(initialTime);
 const detailSelected=useExitPresence(selected===arrivedRegion?selected:'',180);
 useEffect(()=>{setPinnedBars([]);setHighlightedBars([]);setHighlightLabel(null);},[selected]);
 useEffect(()=>{const controller=new AbortController();let running=false;
  const load=async()=>{if(document.hidden||running)return;running=true;try{const response=await fetch('/api/strommix-regional',{signal:controller.signal});if(!response.ok)throw new Error();setData(await response.json());setError('');}catch{if(!controller.signal.aborted)setError('Aktualisierung fehlgeschlagen.');}finally{running=false;}};
  if(!initialData)void load();const timer=setInterval(load,LIVE_DATA_CHECK_MS);let lastVisible=Date.now();const visible=()=>{if(!document.hidden&&Date.now()-lastVisible>=LIVE_DATA_CHECK_MS){lastVisible=Date.now();void load();}};document.addEventListener('visibilitychange',visible);
  return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[initialData]);
 useEffect(()=>{if(data&&time!=='latest'&&!data.hours.some(h=>h.ts===time))setTime('latest');},[data,time]);
 const regions=useMemo(()=>co2RegionShapes(shapes),[shapes]);
 const hour=data?.hours.find(h=>h.ts===time)??data?.hours.at(-1);
 const metrics=useMemo(()=>[{id:'hourly',label:'Stromerzeugung nach Energieträger',values:(hour?.regions??[]).map(region=>{const known=region.carriers.filter(c=>c.mw!==null);const total=known.reduce((sum,c)=>sum+c.mw!,0);return {id:region.id,name:region.name,href:null,value:total,formatted:amount(total),bars:known.map(c=>({label:c.label,value:c.mw!,color:carrierColor(c.id),formatted:amount(c.mw!)}))};})}],[hour]);
 const incomplete=hour?.regions.some(r=>r.carriers.some(c=>c.mw===null));
 const selection=hour?.regions.find(r=>r.id===detailSelected);
 const selectionValues=selection?.carriers.filter(c=>c.mw!==null).map(c=>({label:c.label,value:c.mw!,color:carrierColor(c.id)}))??[];
 const selectionGroups=regionalMixGroups((selection?.carriers??[]).filter(c=>c.mw!==null).map(c=>({label:c.label,value:c.mw!,color:carrierColor(c.id),category:hourlyMixCategory(c)})));
 const selectionTotal=selectionValues.reduce((sum,c)=>sum+c.value,0);
 const table=hour?<ContentTable caption={`Stundenmittel ab ${hourLabel(hour.ts)} · alle Werte in GW · – = fehlender Wert`} compact><thead><tr><th scope="col">Region</th><th scope="col">Energieträger</th><th scope="col">Leistung</th></tr></thead><tbody>{hour.regions.flatMap(r=>r.carriers.map(c=><tr key={r.id+c.id}><th scope="row">{r.name}</th><td>{c.label}</td><td>{c.mw===null?'–':amount(c.mw).value}</td></tr>))}</tbody></ContentTable>:undefined;
 return <div className={styles.map}><WidgetPresentationProvider appearance={{theme:'dark',autoplay:true}}><ExportableWidgetFrame data-story-scheme="dark" data-sc-export-css="background:var(--atlas-surface);" widget={WIDGETS.regionalHourlyMix} place="Deutschland" title="Regionaler Strommix" kind="time-series" stand={hour?.ts??''} filename="regionaler-strommix" dataTable={table} exportDescription={incomplete?'Unvollständige Einzelwerte':undefined} sourceVisible={standalone} sourcePlacement="footer" einbetten={{params:{selected,time},height:760}} sharePath={standalone?'/embed/regional-hourly-mix':undefined} shareParams={standalone?{selected,time}:{variante:'regional'}} help={<>
 <p>CO2Map.de regionalisiert die Erzeugung modellbasiert. Das ist keine direkte Messung in jedem Bundesland. Die Werte sind mittlere Leistungen über eine Stunde, in GW.</p>
 <p>Berlin und Brandenburg, Bremen und Niedersachsen sowie Hamburg und Schleswig-Holstein bilden jeweils eine gemeinsame Region. Offshore ist in den Regionalwerten der Quelle enthalten; die zusätzlichen Seebalken der Jahreskarte werden hier deshalb nicht addiert.</p>
 <p>Messzeitraum ab {zeitpunktInBerlin(hour?.ts)??'nicht verfügbar'}, für eine Stunde. Abruf: {zeitpunktInBerlin(data?.retrievedAt)??'nicht verfügbar'}. Die Quelle liefert mit mindestens einer Stunde Verzögerung. Fehlende Daten bleiben als solche gekennzeichnet.</p>
 </>}>
 {!standalone&&<div className={styles.hourlyControls} data-sc-export-ignore=""><Auswahl fluid titel={hour?pickerHourLabel(hour.ts,data!.retrievedAt):'Keine Stunden'} aktiv={time} onWahl={setTime} pfeile suchbar={false} eintraege={(data?.hours??[]).map((h,index)=>({schluessel:index===data!.hours.length-1?'latest':h.ts,name:pickerHourLabel(h.ts,data!.retrievedAt)}))}/><Auswahl fluid titel={regions.find(r=>r.id===selected)?.name??'Alle Regionen'} aktiv={selected} onWahl={setSelected} pfeile={false} menuAlign="end" eintraege={[{schluessel:'',name:'Alle 13 Regionen'},...regions.map(r=>({schluessel:r.id,name:r.name}))]}/></div>}
 {error&&<p role="status">{error} {data?'Der letzte verfügbare Stand bleibt sichtbar.':'Die Jahresansicht bleibt verfügbar.'}</p>}
 <div className={styles.regionalDetail} data-sc-export-css="padding:0 var(--widget-padding);" data-selected={Boolean(selection)}>
 <div className={styles.regionalMapPane}>{selected&&<ChartDetailHeading title={regions.find(region=>region.id===selected)?.name??'Deutschland'} onBack={selected?()=>setSelected(''):undefined} backLabel="Zurück zur Deutschlandkarte"/>}{hour?<RegionKarte carrierColors={selected?carrierColors:undefined} onRegionReady={setArrivedRegion} highlightedBars={highlightedBars} onBarHover={hoverBar} shapes={regions} sceneContext={sceneContext} metrics={metrics} focusSelection presentation="widget" framingScale={.9} member="Region" selectedPlace={selected} onSelectionChange={setSelected} showSelectionSummary={false}/>:<p role="status">{error?'Keine stündlichen Daten verfügbar.':<><LoadingDots/> Stündliche Regionaldaten werden geladen.</>}</p>}</div>
 {selection&&<div className={styles.regionalMix} data-exiting={(!selected||arrivedRegion!==selected)||undefined} inert={!selected||arrivedRegion!==selected} key={selection.id}><ShareDonut detailLayout slim showCenterLabel={false} onColorsChange={setCarrierColors} highlightLabel={highlightLabel} onSelection={row=>{const labels=row?(row.children??[row]).map(child=>child.label):[];setPinnedBars(labels);setHighlightedBars(labels);}} onHighlight={row=>{setHighlightLabel(null);setHighlightedBars(row?(row.children??[row]).map(child=>child.label):pinnedBars);}} title="Strommix" overview palette="accent-monochrome" legendColumns={3} label={`Strommix ${selection.name}`} values={selectionGroups} totalCenter={{...amount(selectionTotal),label:'Erfasste Erzeugung'}} formatValue={mw=>({value:selectionTotal?(mw/selectionTotal*100).toLocaleString('de-DE',{maximumFractionDigits:1}):'0',unit:'%'})}/>{selection.carriers.some(c=>c.mw===null)&&<p className={styles.status}>Nicht verfügbar: {selection.carriers.filter(c=>c.mw===null).map(c=>c.label).join(', ')}. Anteile beziehen sich auf die erfasste Erzeugung.</p>}</div>}
 </div>
 </ExportableWidgetFrame></WidgetPresentationProvider></div>;
}
