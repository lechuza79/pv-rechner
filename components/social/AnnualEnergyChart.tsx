'use client';
import SelectField from '../SelectField';
import {storyWeatherAttribution} from '../../lib/story-weather-attribution';
import {useState} from 'react';
import {IconChevronLeft,IconChevronRight,IconRefresh} from '../Icons';
import {formatStoryDate} from '../../lib/story-format';
import {energyYearHasWind,energyYearTitle} from '../../lib/story-energy-year-labels';
import type {EnergyYear} from '../../lib/story-energy-year';
import {EnergyYearRadial} from '../charts/EnergyYearRadial';
import styles from './AnnualEnergyChart.module.css';
export function AnnualEnergyChart({data,compact=false,ohneBedienung=false}:{data:EnergyYear;compact?:boolean;ohneBedienung?:boolean}){
 const [mode,setMode]=useState<'both'|'solar'|'wind'>('both');
 const [selected,setSelected]=useState<number|null>(null);
 const [hover,setHover]=useState<number|null>(null);
 const index=selected??hover;
 const solarTotal=data.days.reduce((sum,d)=>sum+d.solarMwh,0),windTotal=data.days.reduce((sum,d)=>sum+d.windMwh,0);
 const hasWind=energyYearHasWind(data);
 const windShare=solarTotal+windTotal>0?windTotal/(solarTotal+windTotal)*100:0;
 const shift=(step:number)=>setSelected(selected===null?0:(selected+step+data.days.length)%data.days.length);
 return <div className={`${styles.chart} ${compact?styles.compact:''}`}>
 {!compact&&<header><h2>{energyYearTitle(data)}</h2><p>Referenzmodell · Bestand Ende {data.year} · Stand {formatStoryDate(data.sourceDate)}</p></header>}
 <EnergyYearRadial data={data} mode={mode} index={index} compact={compact} layout="story" labelClass={styles.label} totalClass={styles.total} showWind={hasWind}
  onHover={setHover} onToggle={i=>setSelected(selected===i?null:i)} ariaLabel={`${hasWind?"Solar und Wind":"Solarerzeugung"} in ${data.town}, ${data.year}. Modellierte Tageserträge.${hasWind?" Wind mit vereinfachter Referenzkurve.":""}`}/>
 {!compact&&<div className={styles.legend}><span><i/>Solar</span>{hasWind&&<span><i/>Wind{!compact&&` · ${windShare.toLocaleString('de-DE',{maximumFractionDigits:2})} % im Jahr`}</span>}</div>}
 {!compact&&!ohneBedienung&&<>{hasWind&&<div className={styles.controls} role="group" aria-label="Energieart">{([['both','Zusammen'],['solar','Solar'],['wind','Wind']] as const).map(([key,label])=><button key={key} aria-pressed={mode===key} onClick={()=>setMode(key)}>{label}</button>)}</div>}
 <div className={styles.controls}><button aria-label="Vorheriger Tag" onClick={()=>shift(-1)}><IconChevronLeft size={12}/></button><SelectField size="sm" ariaLabel="Tag auswählen" value={selected??''} onChange={e=>setSelected(e.target.value===''?null:Number(e.target.value))}><option value="">Ganzes Jahr</option>{data.days.map((d,i)=><option key={d.date} value={i}>{formatStoryDate(d.date)}</option>)}</SelectField><button aria-label="Nächster Tag" onClick={()=>shift(1)}><IconChevronRight size={12}/></button><button aria-label="Tagesauswahl aufheben" onClick={()=>{setSelected(null);setHover(null);}}><IconRefresh size={14}/></button></div>
 <footer>Datenbasis: <a href={storyWeatherAttribution(data.sourceUrl).url} target="_blank" rel="noreferrer">{storyWeatherAttribution(data.sourceUrl).label}</a> und Marktstammdatenregister</footer></>}
 </div>;
}
