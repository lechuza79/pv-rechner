'use client';
import {createElement,useEffect,useId,useRef,useState} from 'react';
import {roundedRadialPath} from '../../lib/radial-path';
import './radar-chart.css';
import Script from 'next/script';
export type RadarValue={id:string;label:string;value:number};
/** Stable axes and one explicit scale; hosts supply data and period controls. */
export function RadarChart({rows,max:providedMax,unit='%',label,artwork}:{rows:RadarValue[];max?:number;unit?:string;label:string;artwork?:string}){
 const titleId=useId();const [hovered,setHovered]=useState<string|null>(null);
 const [animatedRows,setAnimatedRows]=useState(rows);
 const currentRows=useRef(rows);
 const [runtimeReady,setRuntimeReady]=useState(false);
 const [artReady,setArtReady]=useState(false);
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){currentRows.current=rows;setAnimatedRows(rows);return;}
  const from=new Map(currentRows.current.map(row=>[row.id,row.value]));
  const start=performance.now();let frame=0;
  const tick=(now:number)=>{
   const t=Math.min(1,(now-start)/240);const eased=t;
   const next=rows.map(row=>({...row,value:(from.get(row.id)??row.value)+(row.value-(from.get(row.id)??row.value))*eased}));
   currentRows.current=next;setAnimatedRows(next);
   if(t<1)frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[rows]);
 const displayRows=animatedRows.length===rows.length?animatedRows:rows;
 const max=providedMax??Math.max(5,Math.ceil(Math.max(0,...rows.map(row=>row.value))*1.15/5)*5);
 if(rows.length<3||!Number.isFinite(max)||max<=0)return null;
 const largest=rows.reduce((best,row)=>row.value>best.value?row:best,rows[0]);
 const active=hovered??largest?.id;
 const point=(index:number,radius:number)=>{const a=index/rows.length*Math.PI*2-Math.PI/2;return [300+Math.cos(a)*radius,280+Math.sin(a)*radius];};
 const gridPath=(radius:number)=>roundedRadialPath(rows.map((_,i)=>point(i,radius)),8);
 const vertices=displayRows.map((row,i)=>point(i,175*Math.max(0,Math.min(max,row.value))/max));
 return <div className="sc-radar" role="group" aria-label={label} onPointerMove={event=>{
  event.currentTarget.querySelectorAll<HTMLElement & {canMove?:()=>boolean;move?:(x:number,y:number)=>void}>('solar-illustration').forEach(motif=>{if(!motif.canMove?.())return;const b=motif.getBoundingClientRect();motif.move?.(Math.max(-1,Math.min(1,(event.clientX-b.left)/b.width*2-1)),Math.max(-1,Math.min(1,(event.clientY-b.top)/b.height*2-1)));});
 }} onPointerLeave={event=>event.currentTarget.querySelectorAll<HTMLElement & {move?:(x:number,y:number)=>void}>('solar-illustration').forEach(motif=>motif.move?.(0,0))}>
 {artwork&&<><Script src="/illustrations-motion/solar-illustrations.js" onReady={()=>setRuntimeReady(true)}/>{runtimeReady&&<Script src="/illustrations-motion/radar-v4/register.js" onReady={()=>setArtReady(true)}/>}<div className="sc-radar-art" aria-hidden="true">{artReady&&rows.map((row,i)=>{const [x,y]=point(i,225);return <div key={row.id} className="sc-radar-motif" style={{left:`${x/6}%`,top:`${y/5.6}%`}}>{createElement('solar-illustration',{motif:`radar-${row.id}`,label:row.label,thumbnail:''})}</div>;})}</div></>}
 <svg viewBox="0 0 600 560" aria-labelledby={titleId}><title id={titleId}>{label}</title>
 <defs><radialGradient id={`${titleId}-fill`} gradientUnits="userSpaceOnUse" cx="300" cy="280" r="175"><stop offset="0" stopColor="var(--widget-accent)" stopOpacity=".03"/><stop offset="1" stopColor="var(--widget-accent)" stopOpacity=".32"/></radialGradient></defs>
 {[1/3,2/3,1].map((r,i)=><path key={r} d={gridPath(175*r)} className="sc-radar-grid" strokeDasharray={i===1?'2 6':undefined}/>)}
 {rows.map((row,i)=>{const [x,y]=point(i,175);return <line key={row.id} x1="300" y1="280" x2={x} y2={y} className="sc-radar-axis"/>;})}
 <path className="sc-radar-series" d={roundedRadialPath(vertices,5)} fill={`url(#${titleId}-fill)`} stroke="var(--widget-accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
 {displayRows.map((row,i)=>{const [x,y]=point(i,225);return <g key={row.id}>
 <g tabIndex={0} role="button" aria-label={`${row.label}: ${row.value.toLocaleString('de-DE',{maximumFractionDigits:1})} ${unit}`} onFocus={()=>setHovered(row.id)} onBlur={()=>setHovered(null)} onMouseEnter={()=>setHovered(row.id)} onMouseLeave={()=>setHovered(null)} onClick={()=>setHovered(row.id)} onKeyDown={e=>{if(e.key==='Escape')setHovered(null);if(e.key==='Enter'||e.key===' '){e.preventDefault();setHovered(row.id);}}} className="sc-radar-label" data-active={row.id===active}>
 <rect x={x-68} y={y-23} width="136" height="54" rx="8" fill="transparent"/>
 <text x={x} y={y-4} textAnchor="middle" fill="var(--widget-ink)">{row.label}</text>
 <text x={x} y={y+23} textAnchor="middle" fill="var(--widget-accent)" className="sc-radar-value">{row.value.toLocaleString('de-DE',{maximumFractionDigits:1})}<tspan className="sc-radar-unit"> {unit}</tspan></text>
 </g></g>;})}
 </svg></div>;
}
