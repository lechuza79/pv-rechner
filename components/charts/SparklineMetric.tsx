'use client';
import {useEffect,useRef,useState} from 'react';
import {CategoryBarChart,type CategoryBar} from './CategoryBarChart';
import MetricValue from '../MetricValue';
import styles from './SparklineMetric.module.css';

/** Compact trend plus explicit metric; hosts own period semantics and provenance. */
export default function SparklineMetric({rows,value,unit,label,valueLabel,maximumFractionDigits=2}:{rows:CategoryBar[];value:number|null;unit:string;label:string;valueLabel?:string;maximumFractionDigits?:number}) {
 const root=useRef<HTMLDivElement>(null);
 const [entered,setEntered]=useState(false);
 useEffect(()=>{
  const node=root.current;if(!node)return;
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){setEntered(true);observer.disconnect();}
  },{threshold:.15});
  observer.observe(node);return()=>observer.disconnect();
 },[]);
 return <div ref={root} className={styles.root} data-entered={entered}>
  <div className={styles.trend}><CategoryBarChart compact rows={rows} unit={unit} label={label}/></div>
  <div className={styles.metric}>
   {valueLabel&&<span className={styles.label}>{valueLabel}</span>}
   <MetricValue stacked value={value} unit={unit} maximumFractionDigits={maximumFractionDigits}/>
  </div>
 </div>;
}
