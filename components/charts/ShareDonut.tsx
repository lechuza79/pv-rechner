"use client";
import {useState} from 'react';
import './share-donut.css';
export type DonutValue={label:string;value:number;visual?:string};
/** The same active segment drives the ring, central value and visual legend. */
export function ShareDonut({values}:{values:DonutValue[]}){
 const [active,setActive]=useState<number|null>(null);
 const total=values.reduce((sum,row)=>sum+row.value,0);
 const selected=active===null?null:values[active];
 const shown=selected?.value??total;
 const unit='MWp';
 const formatted=(shown/1000).toLocaleString('de-DE',{maximumFractionDigits:2});
 let offset=0;
 return <div className="sc-share-donut">
  <div className="sc-share-ring"><svg viewBox="0 0 220 220" aria-label="Solarleistung nach Anlagentyp">
   {values.map((row,index)=>{const share=total?row.value/total*100:0;const start=offset;offset+=share;return <circle key={row.label} cx="110" cy="110" r="86" pathLength="100" fill="none" stroke={`color-mix(in srgb,var(--widget-accent) ${index===0?100:55}%,var(--widget-surface))`} strokeWidth={active===index?32:28} strokeDasharray={`${Math.max(0,share-.3)} ${100-Math.max(0,share-.3)}`} strokeDashoffset={-start} transform="rotate(-90 110 110)" tabIndex={0} role="button" aria-label={`${row.label}: ${row.value.toLocaleString('de-DE',{maximumFractionDigits:2})} kWp`} onMouseEnter={()=>setActive(index)} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive(index)} onBlur={()=>setActive(null)} onClick={()=>setActive(index)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setActive(index);}}}/>;})}
  <circle cx="110" cy="110" r={active===null?73:71} fill="none" stroke="black" strokeOpacity={active===null?.16:.2} strokeWidth={active===null?2:3} pointerEvents="none"/></svg><div className="sc-share-center" aria-live="polite"><strong>{formatted}</strong><span>{unit}</span><small>{selected?.label??'Gesamt'}</small></div></div>
  <div className="sc-share-legend">{values.map((row,index)=><button key={row.label} type="button" onMouseEnter={()=>setActive(index)} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive(index)} onBlur={()=>setActive(null)} onClick={()=>setActive(index)} aria-pressed={active===index}>{row.visual&&<img src={row.visual} alt="" loading="lazy"/>}<span>{row.label}</span><strong>{(row.value/1000).toLocaleString('de-DE',{maximumFractionDigits:2})}</strong><small>MWp</small></button>)}</div>
 </div>;
}
