'use client';
import SelectField from '../SelectField';
import {storyWeatherAttribution} from '../../lib/story-weather-attribution';
import {useState} from 'react';
import {IconChevronLeft,IconChevronRight,IconRefresh} from '../Icons';
import {formatStoryDate} from '../../lib/story-format';
import type {EnergyYear} from '../../lib/story-energy-year';
import {radialPreviewViewBox} from '../../lib/story-radial-viewbox';
import styles from './AnnualEnergyChart.module.css';
export function AnnualEnergyChart({data,compact=false}:{data:EnergyYear;compact?:boolean}){
 const [mode,setMode]=useState<'both'|'solar'|'wind'>('both');
 const [selected,setSelected]=useState<number|null>(null);
 const [hover,setHover]=useState<number|null>(null);
 const index=selected??hover,day=index===null?null:data.days[index];
 const value=(d:EnergyYear['days'][number])=>(mode==='wind'?0:d.solarMwh)+(mode==='solar'?0:d.windMwh);
 const maximum=Math.ceil(Math.max(...data.days.map(d=>d.solarMwh+d.windMwh))/20)*20;
 const solarTotal=data.days.reduce((sum,d)=>sum+d.solarMwh,0),windTotal=data.days.reduce((sum,d)=>sum+d.windMwh,0);
 const windShare=solarTotal+windTotal>0?windTotal/(solarTotal+windTotal)*100:0;
 const total=data.days.reduce((s,d)=>s+value(d),0);
 const point=(i:number,v:number)=>{const a=i/data.days.length*Math.PI*2-Math.PI/2,r=82+v/maximum*145;return [260+Math.cos(a)*r,260+Math.sin(a)*r];};
 const segment=(i:number,a:number,b:number)=>{const p=point(i,a),q=point(i,b);return `M${p.join(',')} L${q.join(',')}`;};
 const shift=(step:number)=>setSelected(selected===null?0:(selected+step+data.days.length)%data.days.length);
 return <div className={`${styles.chart} ${compact?styles.compact:''}`}>
 {!compact&&<header><h2>Solar und Wind: {data.town} im Energiejahr {data.year}</h2><p>Referenzmodell · Bestand Ende {data.year} · Stand {formatStoryDate(data.sourceDate)}</p></header>}
 <svg viewBox={compact?radialPreviewViewBox(data.days.map((day,i)=>point(i,day.solarMwh+day.windMwh)),260,82):"0 0 520 520"} role="img" aria-label={`Solar und Wind in ${data.town}, ${data.year}. Modellierte Tageserträge; Wind mit vereinfachter Referenzkurve.`}>
 {(compact?[0]:[0,maximum/2,maximum]).map((v,i)=><circle key={v} cx="260" cy="260" r={82+v/maximum*145} fill="none" stroke="var(--atlas-text)" strokeOpacity=".15" strokeDasharray={i%2===0?'2 5':undefined}/>)}
 {!compact&&Array.from({length:12},(_,month)=>{const d=new Date(Date.UTC(data.year,month,1)),i=(d.getTime()-Date.UTC(data.year,0,1))/86400000;const p=point(i,maximum*1.14);return <text key={month} x={p[0]} y={p[1]+4} textAnchor="middle" className={styles.label}>{new Intl.DateTimeFormat('de-DE',{month:'short',timeZone:'UTC'}).format(d)}</text>;})}
 {data.days.map((d,i)=>{const solar=mode==='wind'?0:d.solarMwh,wind=mode==='solar'?0:d.windMwh,active=index===i;return <g key={d.date} opacity={index===null||active?1:.25}>
 {solar>0&&<path d={segment(i,0,solar)} stroke="var(--atlas-action)" strokeWidth={active?2:1} strokeLinecap="round"/>}
 {wind>0&&<path d={segment(i,solar,solar+wind)} stroke="var(--atlas-text)" strokeWidth={active?2:1} strokeLinecap="round"/>}
 {!compact&&<path d={segment(i,0,maximum)} stroke="transparent" strokeWidth="5" onPointerEnter={()=>setHover(i)} onPointerLeave={()=>setHover(null)} onClick={()=>setSelected(selected===i?null:i)}><title>{formatStoryDate(d.date)} · Solar {Math.round(d.solarMwh)} MWh · Wind {Math.round(d.windMwh)} MWh</title></path>}
 </g>;})}
 <text x="260" y="250" textAnchor="middle" className={styles.total}>{(day?value(day):total/1000).toLocaleString('de-DE',{maximumFractionDigits:day?0:1})}</text>
 <text x="260" y="273" textAnchor="middle" className={styles.label}>{day?'MWh':'GWh'}</text>
 <text x="260" y="296" textAnchor="middle" className={styles.label}>{day?formatStoryDate(day.date):data.year}</text>
 {!compact&&<g transform={`translate(260,${260-82-145/2})`}><rect x="-23" y="-12" width="46" height="35" rx="2" fill="var(--atlas-card)"/><text textAnchor="middle" className={styles.label}><tspan x="0">{maximum/2}</tspan><tspan x="0" dy="16">MWh</tspan></text></g>}
 </svg>
 {!compact&&<div className={styles.legend}><span><i/>Solar</span><span><i/>Wind{!compact&&` · ${windShare.toLocaleString('de-DE',{maximumFractionDigits:2})} % im Jahr`}</span></div>}
 {!compact&&<><div className={styles.controls} role="group" aria-label="Energieart">{([['both','Zusammen'],['solar','Solar'],['wind','Wind']] as const).map(([key,label])=><button key={key} aria-pressed={mode===key} onClick={()=>setMode(key)}>{label}</button>)}</div>
 <div className={styles.controls}><button aria-label="Vorheriger Tag" onClick={()=>shift(-1)}><IconChevronLeft size={12}/></button><SelectField size="sm" ariaLabel="Tag auswählen" value={selected??''} onChange={e=>setSelected(e.target.value===''?null:Number(e.target.value))}><option value="">Ganzes Jahr</option>{data.days.map((d,i)=><option key={d.date} value={i}>{formatStoryDate(d.date)}</option>)}</SelectField><button aria-label="Nächster Tag" onClick={()=>shift(1)}><IconChevronRight size={12}/></button><button aria-label="Tagesauswahl aufheben" onClick={()=>{setSelected(null);setHover(null);}}><IconRefresh size={14}/></button></div>
 <footer>Datenbasis: <a href={storyWeatherAttribution(data.sourceUrl).url} target="_blank" rel="noreferrer">{storyWeatherAttribution(data.sourceUrl).label}</a> und Marktstammdatenregister</footer></>}
 </div>;
}
