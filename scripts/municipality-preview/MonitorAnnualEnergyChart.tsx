'use client';
import {useState} from 'react';
import type {EnergyYear} from '@solar-check/story-source/lib/story-energy-year';
import {radialPreviewViewBox} from '@solar-check/story-source/lib/story-radial-viewbox';
import {formatStoryDate} from '@solar-check/story-source/lib/story-format';
import {WidgetSetting} from '../../components/dashboard/WidgetSetting';
import styles from './MonitorAnnualEnergyChart.module.css';

export function MonitorAnnualEnergyChart({data:initialData, datasets=[initialData], compact=false}:{data:EnergyYear;datasets?:EnergyYear[];compact?:boolean}) {
 const [year,setYear]=useState(initialData.year);
 const data=datasets.find(item=>item.year===year)??initialData;
 const [mode,setMode]=useState<'both'|'solar'|'wind'>('both');
 const [selected,setSelected]=useState<number|null>(null);
 const [hover,setHover]=useState<number|null>(null);
 const index=selected??hover;
 const day=index===null?null:data.days[index];
 const value=(entry:EnergyYear['days'][number])=>(mode==='wind'?0:entry.solarMwh)+(mode==='solar'?0:entry.windMwh);
 const maximum=Math.ceil(Math.max(...data.days.map(entry=>entry.solarMwh+entry.windMwh))/20)*20;
 const solarTotal=data.days.reduce((sum,entry)=>sum+entry.solarMwh,0);
 const windTotal=data.days.reduce((sum,entry)=>sum+entry.windMwh,0);
 const total=data.days.reduce((sum,entry)=>sum+value(entry),0);
 const point=(i:number,v:number)=>{const angle=i/data.days.length*Math.PI*2-Math.PI/2,r=82+v/maximum*145;return [260+Math.cos(angle)*r,260+Math.sin(angle)*r];};
 const segment=(i:number,a:number,b:number)=>{const p=point(i,a),q=point(i,b);return `M${p.join(',')} L${q.join(',')}`;};
 const controls=<div className={styles.settings}>
  <WidgetSetting hideLabel label="Jahr" value={String(data.year)} onChange={value=>{setYear(Number(value));setSelected(null);setHover(null);}} stepper options={datasets.map(item=>({value:String(item.year),label:String(item.year)}))}/>
  <WidgetSetting hideLabel label="Energieart" value={mode} onChange={value=>setMode(value as typeof mode)} options={[{value:'both',label:'Solar und Wind'},{value:'solar',label:'Solar'},{value:'wind',label:'Wind'}]}/>
 </div>;
 return <div className={`${styles.chart} ${compact?styles.compact:''}`} data-legend-visible={selected!==null||hover!==null}>
  {!compact&&controls}
  <svg tabIndex={compact?undefined:0} viewBox={compact?radialPreviewViewBox(data.days.map((entry,i)=>point(i,entry.solarMwh+entry.windMwh)),260,82):'-24 -24 568 568'} role="img" aria-label={`Solar und Wind in ${data.town}, ${data.year}. Modellierte Tageserträge; Wind mit vereinfachter Referenzkurve.`}>
   {(compact?[0]:[0,maximum/2,maximum]).map((v,i)=><circle key={v} cx="260" cy="260" r={82+v/maximum*145} fill="none" stroke="var(--atlas-text)" strokeOpacity=".15" strokeDasharray={i%2===0?'2 5':undefined}/>)}
   {!compact&&Array.from({length:12},(_,month)=>{const date=new Date(Date.UTC(data.year,month,1)),i=(date.getTime()-Date.UTC(data.year,0,1))/86400000;const p=point(i,maximum*1.14);return <text key={month} x={p[0]} y={p[1]+4} textAnchor="middle" className={styles.label}>{new Intl.DateTimeFormat('de-DE',{month:'short',timeZone:'UTC'}).format(date)}</text>;})}
   {data.days.map((entry,i)=>{const solar=mode==='wind'?0:entry.solarMwh,wind=mode==='solar'?0:entry.windMwh,active=index===i;return <g key={entry.date} opacity={index===null||active?1:.25}>
    {solar>0&&<path d={segment(i,0,solar)} stroke="var(--atlas-action)" strokeWidth={active?2:1} strokeLinecap="round"/>}
    {wind>0&&<path d={segment(i,solar,solar+wind)} stroke="var(--atlas-text)" strokeWidth={active?2:1} strokeLinecap="round"/>}
    {!compact&&<path d={segment(i,0,maximum)} stroke="transparent" strokeWidth="5" onPointerEnter={()=>setHover(i)} onPointerLeave={()=>setHover(null)} onClick={()=>setSelected(selected===i?null:i)}><title>{formatStoryDate(entry.date)} · Solar {Math.round(entry.solarMwh)} MWh · Wind {Math.round(entry.windMwh)} MWh</title></path>}
   </g>;})}
   <text x="260" y="250" textAnchor="middle" className={styles.total}>{(day?value(day):total/1000).toLocaleString('de-DE',{maximumFractionDigits:day?0:1})}</text><text x="260" y="273" textAnchor="middle" className={styles.label}>{day?'MWh':'GWh'}</text><text x="260" y="296" textAnchor="middle" className={styles.label}>{day?formatStoryDate(day.date):''}</text>
   {!compact&&<g transform={`translate(260,${260-82-145/2})`}><rect x="-23" y="-12" width="46" height="35" rx="2" fill="var(--atlas-card)"/><text textAnchor="middle" className={styles.label}><tspan x="0">{maximum/2}</tspan><tspan x="0" dy="16">MWh</tspan></text></g>}
  </svg>
  {!compact&&<div className={styles.legend}><span><i/>Solar</span><span><i/>Wind · {windTotal+solarTotal>0?(windTotal/(windTotal+solarTotal)*100).toLocaleString('de-DE',{maximumFractionDigits:2}):'0'} % im Jahr</span></div>}
 </div>;
}

export default MonitorAnnualEnergyChart;
