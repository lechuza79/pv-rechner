'use client';
import {useState} from 'react';
import type {EnergyYear} from '../../lib/story-energy-year';
import {WidgetSetting} from '../dashboard/WidgetSetting';
import {EnergyYearRadial} from '../charts/EnergyYearRadial';
import {EXPORT_CSS_ATTR,EXPORT_IGNORE_ATTR,EXPORT_ONLY_ATTR} from '../../lib/export-markers';
import styles from './MonitorAnnualEnergyChart.module.css';

export function MonitorAnnualEnergyChart({data:initialData, datasets=[initialData], compact=false}:{data:EnergyYear;datasets?:EnergyYear[];compact?:boolean}) {
 const [year,setYear]=useState(initialData.year);
 const data=datasets.find(item=>item.year===year)??initialData;
 const [mode,setMode]=useState<'both'|'solar'|'wind'>('both');
 const [selected,setSelected]=useState<number|null>(null);
 const [hover,setHover]=useState<number|null>(null);
 const index=selected??hover;
 const solarTotal=data.days.reduce((sum,entry)=>sum+entry.solarMwh,0);
 const windTotal=data.days.reduce((sum,entry)=>sum+entry.windMwh,0);
 const modeLabel={both:'Solar + Wind',solar:'Solar',wind:'Wind'}[mode];
 const controls=<div className={styles.settings} {...{[EXPORT_IGNORE_ATTR]:""}}>
  <WidgetSetting hideLabel label="Jahr" value={String(data.year)} onChange={value=>{setYear(Number(value));setSelected(null);setHover(null);}} stepper options={datasets.map(item=>({value:String(item.year),label:String(item.year)}))}/>
  <WidgetSetting hideLabel label="Energieart" value={mode} onChange={value=>setMode(value as typeof mode)} options={[{value:'both',label:'Solar + Wind'},{value:'solar',label:'Solar'},{value:'wind',label:'Wind'}]}/>
 </div>;
 return <div className={`${styles.chart} ${compact?styles.compact:''}`} data-legend-visible={selected!==null||hover!==null}>
  {!compact&&controls}
  {!compact&&<p className={styles.exportState} {...{[EXPORT_ONLY_ATTR]:"block"}} style={{display:'none'}}>{data.year} · {modeLabel}</p>}
  <EnergyYearRadial data={data} mode={mode} index={index} compact={compact} layout="monitor" labelClass={styles.label} totalClass={styles.total} showWind
   onHover={setHover} onToggle={i=>setSelected(selected===i?null:i)} ariaLabel={`Solar und Wind in ${data.town}, ${data.year}. Modellierte Tageserträge; Wind mit vereinfachter Referenzkurve.`}/>
  {!compact&&<div className={styles.legend} {...{[EXPORT_CSS_ATTR]:"opacity:1;visibility:visible;"}}><span><i/>Solar</span><span><i/>Wind · {windTotal+solarTotal>0?(windTotal/(windTotal+solarTotal)*100).toLocaleString('de-DE',{maximumFractionDigits:2}):'0'} % im Jahr</span></div>}
 </div>;
}

export default MonitorAnnualEnergyChart;
