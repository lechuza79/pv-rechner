'use client';
import {useEffect,useState} from 'react';
import {ControlField} from '../ControlPanel';
import SelectField from '../SelectField';
import OnsiteSearch,{type OnsiteSearchItem} from '../OnsiteSearch';
import {BUNDESLAENDER} from '../../lib/mastr-regions';
import {parseRaceSettings,raceSegments} from '../../lib/race-settings';
import {districtRaceViews,parseDistrictRaceConfig,districtRaceParams} from '../../lib/district-race-config';

const metrics=[{value:'count',label:'Zahl der Anlagen'},{value:'kwp',label:'Solarleistung insgesamt'},{value:'per-capita',label:'Solarleistung je Einwohner'}];
async function loadDistricts(query:string,signal:AbortSignal):Promise<OnsiteSearchItem[]> {
  const response=await fetch('/api/atlas/search?level=landkreis&q='+encodeURIComponent(query),{signal});
  if(!response.ok)throw new Error('Region search failed');
  const data=await response.json() as {hits:{region_id:string;name:string;label:string}[]};
  return data.hits.filter(hit=>!/Kreisfreie Stadt|Stadtkreis/i.test(hit.label)).map(hit=>({id:hit.region_id,label:hit.name,description:hit.label}));
}

/** The same data editor is used in the gallery and the persisted dashboard configuration. */
export default function RaceDataControls({src,onChange}:{src:string;onChange:(src:string)=>void}) {
  const url=new URL(src,'https://solar-check.io');
  const region=url.pathname.split('/').pop()!;
  const query=Object.fromEntries(url.searchParams);
  const [chooseDistrict,setChooseDistrict]=useState(false);
  const district=region.length===5||chooseDistrict;
  const level=district?'district':region==='de'?'country':'state';
  const comparison=district&&query.comparison==='district';
  const config=parseDistrictRaceConfig(region,query);
  const settings=parseRaceSettings(query);
  const [districtName,setDistrictName]=useState('Landkreis suchen');
  const [lastDistrict,setLastDistrict]=useState(district?region:'');
  const [lastState,setLastState]=useState(region==='de'?'':region.slice(0,2));
  const [rows,setRows]=useState<{id:string;name:string}[]>([]);
  const highlightQuery=new URLSearchParams(settings).toString();
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/widgets/racing?region='+region+'&'+highlightQuery,{signal:controller.signal}).then(async response=>response.ok?response.json():null).then(data=>{setRows(data?.rows??[]);if(region.length===5&&data?.name)setDistrictName(data.name);}).catch(()=>{});
    return()=>controller.abort();
  },[region,highlightQuery,comparison]);
  const update=(values:Record<string,string|undefined>,nextRegion=region)=>{
    for(const [key,value] of Object.entries(values))value===undefined?url.searchParams.delete(key):url.searchParams.set(key,value);
    url.pathname='/embed/regional-race/'+nextRegion;
    onChange(url.pathname+url.search);
  };
  const changeRegion=(id:string)=>{
    setChooseDistrict(false);
    if(id.length===5){setLastDistrict(id);setLastState(id.slice(0,2));}
    if(id.length===2)setLastState(id);
    update({comparison:id.length===5?query.comparison:undefined,highlight:'',cohort:id.length===2?query.cohort:'all'},id);
  };
  const field=(key:string,label:string,options:ReadonlyArray<{value:string;label:string}>,value=query[key]??'')=><ControlField key={key} label={label}><SelectField block size="md" ariaLabel={label} value={value} onChange={event=>update({[key]:event.target.value||undefined})}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</SelectField></ControlField>;
  return <>
    <ControlField label="Vergleichsebene"><SelectField block size="md" ariaLabel="Vergleichsebene" value={level} onChange={event=>{if(event.target.value==='district'&&!lastDistrict){setChooseDistrict(true);return;}changeRegion(event.target.value==='country'?'de':event.target.value==='state'?lastState||BUNDESLAENDER[0].ags:lastDistrict);}}>
      <option value="country">Bundesländer in Deutschland</option><option value="state">Kreise im Bundesland</option><option value="district">Gemeinden im Landkreis / Landkreisvergleich</option>
    </SelectField></ControlField>
    {district&&<ControlField label="Landkreis"><OnsiteSearch persistent align="left" ariaLabel="Landkreis suchen" placeholder={districtName} loadItems={loadDistricts} onPick={hit=>{setDistrictName(hit.label);changeRegion(hit.id);}}/></ControlField>}
    {level==='state'&&<ControlField label="Bundesland"><SelectField block size="md" ariaLabel="Bundesland" value={region} onChange={event=>changeRegion(event.target.value)}>{BUNDESLAENDER.map(state=><option key={state.ags} value={state.ags}>{state.name}</option>)}</SelectField></ControlField>}
    {district&&!chooseDistrict&&<ControlField label="Landkreis und Gemeinden vergleichen" toggle={{enabled:comparison,onChange:enabled=>update(enabled?districtRaceParams({...config,measures:{metric:settings.metric,segment:settings.segment}}):{comparison:undefined})}}/>}
    {chooseDistrict?<p>Bitte wähle einen Landkreis. Bis dahin bleibt die bisherige Vorschau erhalten.</p>:<>
    {comparison&&<>
      <ControlField label="Öffentlichen Umschalter anzeigen" toggle={{enabled:config.toggle,onChange:enabled=>update({toggle:enabled?'on':'off'})}}/>
      {field('view','Startansicht',districtRaceViews,config.view)}
    </>}
    {field('metric',comparison?'Gemeinsame Kennzahl':'Kennzahl',metrics,settings.metric)}
    {field('segment',comparison?'Gemeinsame Anlagenart':'Anlagenart',raceSegments,settings.segment)}
    {!comparison&&field('highlight','Hervorheben',[{value:'',label:'Keine Hervorhebung'},...rows.map(row=>({value:row.id,label:row.name})),...(settings.highlight&&!rows.some(row=>row.id===settings.highlight)?[{value:settings.highlight,label:'Gewählte Region'}]:[])],settings.highlight)}
    {comparison?districtRaceViews.map(view=><div key={view.value} style={{display:'contents'}}>
      {field(view.value+'Metric',view.label+' · Kennzahl',[{value:'',label:'Gemeinsame Kennzahl'},...metrics])}
      {field(view.value+'Segment',view.label+' · Anlagenart',[{value:'',label:'Gemeinsame Anlagenart'},...raceSegments])}
    </div>):level==='state'?field('cohort','Vergleichsgruppe',[{value:'all',label:'Landkreise und kreisfreie Städte'},{value:'districts',label:'Nur Landkreise'}],settings.cohort):null}
    </>}
  </>;
}
