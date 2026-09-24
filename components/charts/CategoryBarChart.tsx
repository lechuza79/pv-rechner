"use client";
import {useState} from 'react';
import './category-bar-chart.css';
export type CategoryBar = {id:string; label:string; value:number; partial?:boolean; highlighted?:boolean};
/** Numeric plotting only; period semantics come from the adapter. */
export function CategoryBarChart({rows, unit, label}:{rows:CategoryBar[];unit:string;label:string}) {
 const [active,setActive]=useState<string|null>(null);
 const max=Math.max(0,...rows.map(row=>row.value));
 const describe=(row:CategoryBar)=>`${row.label}: ${row.value.toLocaleString('de-DE')} ${unit}${row.partial?' · Laufendes Jahr, noch nicht vollständig.':''}`;
 return <div className="sc-category-bars" role="group" aria-label={label}>
  <div className="sc-category-plot">
   {rows.map((row,index)=><button key={row.id} type="button" aria-label={describe(row)} onFocus={()=>setActive(row.id)} onMouseEnter={()=>setActive(row.id)} onClick={()=>setActive(row.id)} onBlur={()=>setActive(null)} onMouseLeave={()=>setActive(null)} className="sc-category-column" data-active={row.id===active}>
    <span className="sc-category-bar" data-partial={row.partial} style={{height:`${max?row.value/max*100:0}%`}}>
     {active===row.id&&<span role="tooltip" className="sc-category-flag" data-edge={index===0?'start':index===rows.length-1?'end':'middle'}><span>{row.label}</span><strong>{row.value.toLocaleString('de-DE')} <small>{unit}</small></strong>{row.partial&&<span className="sc-category-note">Laufendes Jahr · noch nicht vollständig.</span>}</span>}
    </span>
   </button>)}
  </div>
  <div className="sc-category-axis" aria-hidden="true">{rows.map((row,index)=><span key={row.id}>{rows.length<=8||index%2===0||index===rows.length-1?row.label:''}</span>)}</div>
 </div>;
}
