'use client';
import {useEffect,useState} from 'react';
import {useWidgetResource} from '../components/dashboard/WidgetData';
import type {MicrochartData} from './microchart-data';
import {usableWind,type WindConditions} from './wind-animation';

/** Rotor and sign use the exact same model value, timestamp and height. */
export function microchartWind(data:MicrochartData|null,now=Date.now()):WindConditions|null{
 if(!data?.conditions)return null;
 const external=data.windSource==='open-meteo-preview';
 const wind:WindConditions={...data.conditions,heightMetres:100,postcode:data.postcode??'',
  modelRun:external?null:data.windModelRun??data.modelRun,...(external?{source:'open-meteo' as const}:{})};
 return usableWind(wind,now)?wind:null;
}
/** All scene signs share the widget request owner and retain usable observations. */
export function useMicrocharts(municipality:string|null,districtId?:string,tour?:string,stop?:string){
 const endpoint=municipality?`/api/windraeder-vorschau/microcharts?${new URLSearchParams({gemeinde:municipality,...(districtId?{kreis:districtId}:{}),...(tour&&stop?{tour,stop}:{})})}`:null;
 const {data:result,loading}=useWidgetResource<{data:MicrochartData|null}|null>(endpoint,null);
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
 const data=result?.data??null;
 return {data,weather:microchartWind(data,now),loading};
}
