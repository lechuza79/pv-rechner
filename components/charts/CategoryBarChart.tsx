"use client";
import {useState,useRef,useLayoutEffect,type CSSProperties,type ReactNode} from 'react';
import './category-bar-chart.css';
import ChartFlag from './ChartFlag';
import MetricValue from '../MetricValue';
export type CategoryBar = {id:string; label:string; labelContent?:ReactNode; value:number; partial?:boolean; highlighted?:boolean};
/** Numeric plotting only; period semantics come from the adapter. */
export function CategoryBarChart({rows, unit, label, orientation="vertical",paired=false}:{rows:CategoryBar[];unit:string;label:string;orientation?:"vertical"|"horizontal";paired?:boolean}) {
 const [active,setActive]=useState<string|null>(null);
 const pairRef=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const pair=pairRef.current;
  const flag=pair?.querySelector<HTMLElement>('.sc-category-pair-saving');
  if(!pair||!flag)return;
  // Let section separators follow the actual flag height, including wrapped text.
  const measure=()=>pair.style.setProperty('--pair-flag-height',`${flag.getBoundingClientRect().height}px`);
  measure();
  const observer=new ResizeObserver(measure);
  observer.observe(flag);
  return ()=>observer.disconnect();
 },[paired,orientation]);
 const max=Math.max(0,...rows.map(row=>row.value));
 const describe=(row:CategoryBar)=>`${row.label}: ${row.value.toLocaleString('de-DE')} ${unit}${row.partial?' · Laufendes Jahr, noch nicht vollständig.':''}`;
 if(orientation === "horizontal" && paired && rows.length===2) {
  const [reference,current]=rows;
  const difference=reference.value-current.value;
  const percentage=reference.value>0?Math.abs(difference)/reference.value*100:null;
  const width=(value:number)=>`${max?Math.max(0,value)/max*100:0}%`;
  return <div ref={pairRef} className="sc-category-pair" role="group" aria-label={label}>
   <div className="sc-category-horizontal-label"><div>{reference.labelContent??reference.label}</div><strong>{Math.round(reference.value).toLocaleString('de-DE')} <small>{unit}</small></strong></div>
   <div className="sc-category-pair-bars" style={{"--saving-anchor":`${max?(Math.min(reference.value,current.value)+Math.abs(difference)/2)/max*100:50}cqw`} as CSSProperties}>
    <div className="sc-category-horizontal-track"><div style={{width:width(reference.value)}}/></div>
    <div className="sc-category-horizontal-track sc-category-pair-current"><div style={{width:width(current.value)}}/></div>
    <div className="sc-category-pair-difference" data-negative={difference<0} style={{left:width(Math.min(reference.value,current.value)),width:width(Math.abs(difference))}}/>
    <ChartFlag placement="below" className={`sc-category-pair-saving${difference<0?" is-negative":""}`}><MetricValue value={Math.abs(difference)} unit={unit}/><span>{difference<0?"Mehrkosten":"Ersparnis"}{percentage!==null?` · ${percentage.toLocaleString('de-DE',{maximumFractionDigits:1})} %`:""}</span></ChartFlag>
   </div>
   <div className="sc-category-horizontal-label"><span>{current.labelContent??current.label}</span><strong>{Math.round(current.value).toLocaleString('de-DE')} <small>{unit}</small></strong></div>
  </div>;
 }
 if(orientation === "horizontal") return <div className="sc-category-horizontal" role="group" aria-label={label}>
  {rows.map(row=><div key={row.id} className="sc-category-horizontal-row">
   <div className="sc-category-horizontal-label"><span>{row.label}</span><strong>{Math.round(row.value).toLocaleString('de-DE')} <small>{unit}</small></strong></div>
   <div className="sc-category-horizontal-track" aria-hidden="true"><div data-highlighted={row.highlighted} style={{width:`${max?Math.max(0,row.value)/max*100:0}%`}}/></div>
  </div>)}
 </div>;
 return <div className="sc-category-bars" role="group" aria-label={label}>
  <div className="sc-category-plot">
   {rows.map((row,index)=><button key={row.id} type="button" aria-label={describe(row)} onFocus={()=>setActive(row.id)} onMouseEnter={()=>setActive(row.id)} onClick={()=>setActive(row.id)} onBlur={()=>setActive(null)} onMouseLeave={()=>setActive(null)} className="sc-category-column" data-active={row.id===active}>
    <span className="sc-category-bar" data-partial={row.partial} style={{height:`${max?row.value/max*100:0}%`}}>
     {active===row.id&&<ChartFlag tooltip edge={index===0?'start':index===rows.length-1?'end':'middle'}><span>{row.label}</span><strong>{row.value.toLocaleString('de-DE')} <small>{unit}</small></strong>{row.partial&&<span className="sc-category-note">Laufendes Jahr · noch nicht vollständig.</span>}</ChartFlag>}
    </span>
   </button>)}
  </div>
  <div className="sc-category-axis" aria-hidden="true">{rows.map((row,index)=><span key={row.id}>{rows.length<=8||index%2===0||index===rows.length-1?row.label:''}</span>)}</div>
 </div>;
}
