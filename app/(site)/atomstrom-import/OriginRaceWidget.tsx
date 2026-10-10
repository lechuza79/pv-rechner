'use client';
import {useEffect,useRef,useState} from 'react';
import {BarRaceHeading,useBarRacePlayback} from '../../../components/charts/BarRaceHeading';
import Script from 'next/script';
import {ExportableWidgetFrame} from '../../../components/dashboard/ExportableWidgetFrame';
import {WIDGETS} from '../../../lib/widget-registry';
import {IMPORT_COUNTRIES,type NuclearYearSnapshot} from '../../../lib/atomstrom-year';
import '../../../components/landkreis/district-race.css';

type Engine = (options:Record<string,unknown>)=>Promise<void>;
/** Monthly cumulative source data, rendered by the shared municipal race engine. */
export default function OriginRaceWidget({data}:{data:NuclearYearSnapshot}) {
 const stage=useRef<HTMLDivElement>(null),clock=useRef<HTMLSpanElement>(null);
 const [ready,setReady]=useState(false);
 const playback=useBarRacePlayback(stage,true);
 useEffect(()=>{
  const engine=(window as unknown as {solarDistrictRace?:Engine}).solarDistrictRace;
  if(!ready||!engine||!stage.current||!clock.current)return;
  let active=true;const node=stage.current;
  const totals:Record<string,number>={};
  const rows=Object.entries(IMPORT_COUNTRIES).map(([id,name])=>({id,name,href:null,value:data.countries[id as keyof typeof IMPORT_COUNTRIES]}));
  const history=data.months.map(month=>({year:new Date(`${month.month}-15T12:00:00Z`).toLocaleDateString('de-DE',{month:'short',year:'numeric'}),rows:rows.map(row=>({id:row.id,value:totals[row.id]=(totals[row.id]??0)+(month.countries[row.id as keyof typeof IMPORT_COUNTRIES]??0)}))}));
  void engine({stage:node,clockHost:clock.current,rows,history,label:`Rechnerischer Atomstrom-Import ${data.year}, seit Jahresbeginn`,format:(value:number)=>value.toLocaleString('de-DE',{maximumFractionDigits:0}),unit:()=> 'GWh',animate:!matchMedia('(prefers-reduced-motion: reduce)').matches,current:()=>active,skip:()=>false,onProgress:playback.onProgress});
  return()=>{active=false;node.replaceChildren();};
 },[ready,data]);
 return <><Script src="/gemeinde/landkreis-rennen.js" onReady={()=>setReady(true)}/><ExportableWidgetFrame place="Deutschland" widget={WIDGETS.atomstromJahr} title={`Atomstrom-Import nach Ländern ${data.year}`} kind="time-series" stand={String(data.year)} filename={`atomstrom-herkunft-${data.year}`} help="Rechnerische Importmengen, von Januar bis zum angezeigten Monat aufsummiert. Fünf Stunden mit fehlenden Quelldaten sind nicht enthalten. Die Bewegung verbindet Monatswerte; sie zeigt keine gemessenen Tageswerte." subtitle="Seit Jahresbeginn · GWh" headingMeta={<BarRaceHeading clock={clock} year={data.year} playback={playback}/>}>
 <div ref={stage} className="district-race-plot" data-chart-animation="race" data-race-size="content"/>

 </ExportableWidgetFrame></>;
}
