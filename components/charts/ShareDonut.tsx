"use client";
import {useState} from 'react';
import './share-donut.css';
import {solarCategoryVisual} from "../../lib/solar-category-visual";
import {DONUT_INACTIVE_OPACITY,donutNeutralColor} from '../../lib/donut-style';
import {pvLeistungTeile} from "../../lib/atlas-format";
export {solarCategoryVisual} from "../../lib/solar-category-visual";
export type DonutValue={label:string;value:number;visual?:string;visualCrop?:{width:number;left:number;top:number}};
/**
 * The same active segment drives the ring, central value and visual legend.
 * The preset selects a category, not its permanent color. Every active category
 * uses the theme accent; inactive segments share the neutral treatment.
 * Values default to installed kWp; other variants supply their own formatter.
 */
export function ShareDonut({values,formatValue=pvLeistungTeile,defaultIndex,label="Solarleistung nach Anlagentyp",hideDefaultCard=false,centerVisual,centerVisualFocus=50,palette="neutral",showLegend=true,showCenter=true,overview=false,totalCenter,legendColumns}:{values:DonutValue[];formatValue?:(value:number)=>{value:string;unit:string};defaultIndex?:number;label?:string;hideDefaultCard?:boolean;centerVisual?:string;centerVisualFocus?:number;palette?:"accent"|"neutral"|"accent-monochrome";showLegend?:boolean;showCenter?:boolean;overview?:boolean;totalCenter?:{value:string;unit:string;label:string};legendColumns?:4}){
 const [active,setActive]=useState<number|null>(null);
 const total=values.reduce((sum,row)=>sum+row.value,0);
 const selectedIndex=active??(overview?undefined:defaultIndex);
 const selected=values[selectedIndex??-1];

 const shown=selected?.value??total;
 const center=!selected&&totalCenter?totalCenter:formatValue(shown);
 let offset=0;
 const highlightedIndex=selectedIndex;
 // Keep each arc at its real data extent; selection crossfades instead of sweeping through unrelated values.
 const arcs=values.map((row,index)=>({row,index,start:values.slice(0,index).reduce((sum,item)=>sum+item.value,0)/(total||1)*100,share:row.value/(total||1)*100}));
 return <div className="sc-share-donut" data-overview={overview||undefined}>
  <div className="sc-share-ring"><svg viewBox="0 0 220 220" aria-label={label}>
   {values.map((row,index)=>{const share=total?row.value/total*100:0;const start=offset;offset+=share;return <circle key={row.label} cx="110" cy="110" r="86" pathLength="100" fill="none" stroke={palette==="accent-monochrome"?`color-mix(in srgb, var(--widget-accent) ${Math.round(100-index/Math.max(1,values.length-1)*65)}%, var(--widget-surface))`:palette==="neutral"?donutNeutralColor(index):"var(--widget-accent)"} opacity={palette==="accent-monochrome"?1:palette==="neutral"?DONUT_INACTIVE_OPACITY:Math.max(.2,1-index*.3)*(selectedIndex===undefined?1:DONUT_INACTIVE_OPACITY)} strokeWidth={28} strokeDasharray={`${Math.max(0,share-.3)} ${100-Math.max(0,share-.3)}`} strokeDashoffset={-start} transform="rotate(-90 110 110)" tabIndex={0} role="button" aria-label={`${row.label}: ${formatValue(row.value).value} ${formatValue(row.value).unit}`} onMouseEnter={()=>setActive(index)} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive(index)} onBlur={()=>setActive(null)} onClick={()=>setActive(index)} onKeyDown={event=>{if(event.key==='Escape')setActive(null);if(event.key==='Enter'||event.key===' '){event.preventDefault();setActive(index);}}}/>;})}
  <circle cx="110" cy="110" r="72" fill="none" stroke="black" strokeOpacity=".16" strokeWidth="2" pointerEvents="none"/>
   {arcs.slice().sort((a,b)=>Number(a.index===selectedIndex)-Number(b.index===selectedIndex)).map(({row,index,start,share})=><circle key={row.label} className="sc-share-highlight" cx="110" cy="110" r="86" pathLength="100" fill="none" stroke="var(--widget-accent)" strokeWidth={!overview&&index===selectedIndex?36:28} opacity={index===selectedIndex?1:0} strokeDasharray={`${Math.max(0,share-.3)} ${100-Math.max(0,share-.3)}`} strokeDashoffset={-start} transform="rotate(-90 110 110)" pointerEvents="none" aria-hidden="true"/>)}
   </svg>
   {showCenter&&<div className="sc-share-center" aria-live="polite">
    {values.map((row,index)=>{
     const artwork=index===defaultIndex?(centerVisual??row.visual):row.visual;
     const crop=row.visualCrop;
     return artwork?<div key={row.label} className="sc-share-center-artwork" data-active={index===selectedIndex} aria-hidden="true"><img src={artwork} alt="" style={crop?{width:`${crop.width}%`,height:'auto',left:`${crop.left}%`,top:`${crop.top}%`}:{left:`${50-Math.max(0,Math.min(100,centerVisualFocus))*1.5}%`}}/></div>:null;
    })}
    <div className="sc-share-value" key={selectedIndex??'total'}><strong style={{color:selected?"var(--widget-accent)":undefined}}>{center.value}</strong><span>{center.unit}</span><small>{selected?.label??totalCenter?.label??'Gesamt'}</small></div>
   </div>}
  </div>
  {showLegend&&<div className="sc-share-legend" data-columns={legendColumns}>{values.map((row,index)=>hideDefaultCard&&index===defaultIndex?null:<button key={row.label} type="button" onMouseEnter={()=>setActive(index)} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive(index)} onBlur={()=>setActive(null)} onClick={()=>setActive(index)} aria-pressed={highlightedIndex===index}>{(row.visual??solarCategoryVisual(row.label))&&<img src={row.visual??solarCategoryVisual(row.label)} alt="" loading="lazy"/>}<span>{row.label}</span><div className="sc-share-metric"><strong>{formatValue(row.value).value}</strong><small>{formatValue(row.value).unit}</small></div></button>)}</div>}
 </div>;
}
