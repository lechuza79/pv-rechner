'use client';
import {useEffect,useRef,useState} from 'react';
import {SOLAR_DRAW_MS,solarEase} from './monthly-solar-animation';

/** Shared monthly-race interpolation; missing values never animate from zero. */
export function useAnimatedChartValue(target:number|null,enabled=true){
 const [value,setValue]=useState(target);
 const current=useRef(target);
 useEffect(()=>{
  if(!enabled||target===null||current.current===null||window.matchMedia('(prefers-reduced-motion: reduce)').matches){current.current=target;setValue(target);return;}
  const from=current.current,started=performance.now();let handle=0;
  const tick=(now:number)=>{const progress=Math.min(1,(now-started)/SOLAR_DRAW_MS);current.current=from+(target-from)*solarEase(progress);setValue(current.current);if(progress<1)handle=requestAnimationFrame(tick);};
  handle=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(handle);
 },[target,enabled]);
 return target===null?null:value;
}
