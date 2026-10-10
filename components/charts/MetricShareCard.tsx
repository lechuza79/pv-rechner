"use client";
import {useLayoutEffect,useRef} from "react";
import styles from './MetricShareCard.module.css';

/** Compact selected-place annotation, using the same metric as the map. */
export default function MetricShareCard({name,value,unit,share,context}:{name:string;value:string;unit:string;share:number|null;context:string}) {
  const numberRef=useRef<HTMLElement>(null);
  useLayoutEffect(()=>{
    const number=numberRef.current;
    if(!number)return;
    const fit=()=>{number.style.fontSize='15px';const available=number.parentElement!.clientWidth;if(number.scrollWidth>available)number.style.fontSize=`${15*available/number.scrollWidth}px`;};
    fit();const observer=new ResizeObserver(fit);observer.observe(number.parentElement!);void document.fonts.ready.then(fit);
    return()=>observer.disconnect();
  },[value]);
  const fraction=Math.max(0,Math.min(1,(share??0)/100));
  const angle=fraction*Math.PI*2;
  const endX=Number((40+30*Math.sin(angle)).toFixed(3)),endY=Number((40-30*Math.cos(angle)).toFixed(3));
  return <div className={styles.card} data-map-selection>
    <div className={styles.donut}>
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="30" fill="none" stroke="color-mix(in srgb, #18323e 14%, white)" strokeWidth="10"/>
        {fraction>0&&<><circle cx="40" cy="40" r="30" fill="none" stroke="var(--widget-accent)" strokeWidth="10" pathLength="1" strokeDasharray={`${fraction} 1`} transform="rotate(-90 40 40)"/>{fraction<1&&<circle cx={endX} cy={endY} r="5" fill="var(--widget-accent)"/>}</>}
      </svg>
      <div><strong ref={numberRef}>{value}</strong><small>{unit}</small></div>
    </div>
    <div className={styles.text}><strong>{name}</strong><span>{share===null?'Anteil nicht verfügbar':`${share.toLocaleString('de-DE',{maximumFractionDigits:1})} %`}<br/>{share!==null&&context}</span></div>
  </div>;
}
