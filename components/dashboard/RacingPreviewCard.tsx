'use client';
import {useEffect,useState} from 'react';
import WidgetPreviewCard from './WidgetPreviewCard';
import {ControlField,ControlPanel} from '../ControlPanel';
import SecondaryButton from '../SecondaryButton';
import SelectField from '../SelectField';
import OnsiteSearch, {type OnsiteSearchItem} from '../OnsiteSearch';
import {BUNDESLAENDER} from '../../lib/mastr-regions';

async function loadDistricts(query:string,signal:AbortSignal):Promise<OnsiteSearchItem[]> {
 const response=await fetch('/api/atlas/search?level=landkreis&q='+encodeURIComponent(query),{signal});
 if(!response.ok)throw new Error('Region search failed');
 const data=await response.json() as {hits:{region_id:string;name:string;label:string}[]};
 return data.hits.filter(hit=>!/Kreisfreie Stadt|Stadtkreis/i.test(hit.label)).map(hit=>({id:hit.region_id,label:hit.name,description:hit.label}));
}
import {defaultRaceSettings,raceSegments,raceQuery,type RaceSettings} from '../../lib/race-settings';
import type {GalleryEntry,GalleryPlace} from '../../lib/widget-gallery';

/** Data controls use the gallery's existing card, flyout and per-field reset. */
export default function RacingPreviewCard({entry,place,preset}:{entry:GalleryEntry;place:GalleryPlace;preset?:boolean}){
 const initialRegion=preset?'07':place.districtId??place.stateId;
 const initial:RaceSettings=preset?{metric:'per-capita',segment:'private-roofs',cohort:'districts',highlight:'07335'}:defaultRaceSettings;
 const [region,setRegion]=useState(initialRegion);
 const [district,setDistrict]=useState({id:place.districtId??'07335',name:place.districtName??'Landkreis Kaiserslautern'});
 const [state,setState]=useState(preset?'07':place.stateId);
 const level=region==='de'?'country':region.length===2?'state':'district';
 const changeRegion=(id:string)=>{setRegion(id);setSettings(s=>({...s,highlight:''}));};
 const [settings,setSettings]=useState(initial);
 const [applied,setApplied]=useState({region:initialRegion,settings:initial,label:preset?'Rheinland-Pfalz':place.districtName??place.stateName});
 const [saved,setSaved]=useState(false);
 const [data,setData]=useState<{key:string;rows:{id:string;name:string;value:number}[]}|null>(null);
 const [error,setError]=useState(false);
 const effective={...settings,cohort:region.length===2?settings.cohort:'all' as const};
 const query=raceQuery(effective);
 const key=region+'?'+query;
 useEffect(()=>{
  const controller=new AbortController();setError(false);
  fetch('/api/widgets/racing?region='+region+'&'+query,{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error('unavailable');return response.json()}).then(value=>setData({key,rows:value.rows})).catch(err=>{if(err.name!=='AbortError')setError(true)});
  return()=>controller.abort();
 },[region,query,key]);
 const rows=data?.key===key?data.rows:[];
 const dirty=region!==applied.region||raceQuery(effective)!==raceQuery(applied.settings);
 const appliedKey=applied.region+'?'+raceQuery(applied.settings);
 const save=()=>{setApplied({region,settings:effective,label:level==='district'?district.name:level==='state'?BUNDESLAENDER.find(item=>item.ags===region)?.name??'':'Deutschland'});setSaved(true);};
 const discard=()=>{setRegion(applied.region);setSettings(applied.settings);if(applied.region.length===5)setDistrict({id:applied.region,name:applied.label});if(applied.region.length===2)setState(applied.region);setSaved(false);};
 const highlighted=key===appliedKey?rows.find(row=>row.id===applied.settings.highlight):undefined;

 const field=<K extends keyof RaceSettings>(name:K,label:string,options:{value:string;label:string}[],disabled=false)=><ControlField label={label} onReset={settings[name]!==initial[name]?()=>setSettings(s=>({...s,[name]:initial[name]})):undefined}><SelectField block size="md" ariaLabel={label} value={effective[name]} disabled={disabled} onChange={event=>setSettings(s=>({...s,[name]:event.target.value}))}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</SelectField></ControlField>;
 return <WidgetPreviewCard entry={{...entry,placeLabel:applied.label,variants:[{label:'Racing-Chart',src:'/embed/regional-race/'+appliedKey,height:930}]}} notice={error?<p role="status">Vergleichsdaten konnten nicht geladen werden.</p>:highlighted?<p>{highlighted.name}: <strong>Platz {1+rows.filter(row=>row.value>highlighted.value).length} von {rows.length}</strong> · {settings.metric==='per-capita'?'je Einwohner':settings.metric==='kwp'?'Gesamtleistung':'Anlagenzahl'}</p>:null} settingsWide onSettingsClose={discard} settings={<><ControlPanel>
  <ControlField label="Vergleichsebene" onReset={region!==initialRegion?()=>{setRegion(initialRegion);setDistrict({id:place.districtId??'07335',name:place.districtName??'Landkreis Kaiserslautern'});setState(preset?'07':place.stateId);setSettings(s=>({...s,highlight:initial.highlight}));}:undefined}><SelectField size="md" block ariaLabel="Vergleichsebene" value={level} onChange={e=>changeRegion(e.target.value==='country'?'de':e.target.value==='state'?state:district.id)}>
   <option value="country">Bundesländer in Deutschland</option><option value="state">Landkreise in Bundesland</option><option value="district">Gemeinden in Landkreis</option>
  </SelectField></ControlField>
  {level==='district'&&<ControlField label="Landkreis"><OnsiteSearch key={district.id} persistent align="left" ariaLabel="Landkreis suchen" placeholder={district.name} loadItems={loadDistricts} onPick={hit=>{setDistrict({id:hit.id,name:hit.label});changeRegion(hit.id);}}/></ControlField>}
  {level==='state'&&<ControlField label="Bundesland"><SelectField size="md" block ariaLabel="Bundesland" value={region} onChange={e=>{setState(e.target.value);changeRegion(e.target.value);}}>{BUNDESLAENDER.map(item=><option key={item.ags} value={item.ags}>{item.name}</option>)}</SelectField></ControlField>}

  {field('cohort','Vergleichsgruppe',[{value:'all',label:region.length===2?'Alle einschließlich kreisfreier Städte':'Alle Gebiete dieser Ebene'},...(region.length===2?[{value:'districts',label:'Nur Landkreise'}]:[])],region.length!==2)}
  {field('metric','Kennzahl',[{value:'count',label:'Zahl der Anlagen'},{value:'kwp',label:'Solarleistung insgesamt'},{value:'per-capita',label:'Solarleistung je Einwohner'}])}
  {field('segment','Anlagen',raceSegments.map(({value,label})=>({value,label})))}
  {field('highlight','Hervorheben',[{value:'',label:'Keine Hervorhebung'},...rows.map(row=>({value:row.id,label:row.name})),...(settings.highlight&&!rows.some(row=>row.id===settings.highlight)?[{value:settings.highlight,label:data?.rows.find(row=>row.id===settings.highlight)?.name??(settings.highlight==='07335'?'Landkreis Kaiserslautern':'Auswahl wird geladen …')}]:[])])}
 </ControlPanel><div style={{display:'flex',alignItems:'center',gap:12,paddingBlock:16}}><SecondaryButton disabled={!dirty} onClick={save}>Speichern</SecondaryButton><span role="status">{dirty?'Ungespeicherte Änderungen':saved?'Gespeichert':''}</span></div></>}/>;
}
