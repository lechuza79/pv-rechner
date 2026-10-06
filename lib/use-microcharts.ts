'use client';
import {useEffect,useState} from 'react';
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
/** One request owner; hidden views never start a periodic weather request. */
export function useMicrocharts(municipality:string|null,districtId?:string,tour?:string,stop?:string){
 const requestKey=municipality?municipality+':'+(districtId??'')+':'+(tour??'')+':'+(stop??''):null;
 const [state,setState]=useState<{municipality:string|null;data:MicrochartData|null;settled?:boolean}>({municipality:null,data:null});
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{
  setState({municipality:requestKey,data:null});
  if(!municipality)return;
  let disposed=false,controller:AbortController|null=null;
  const load=async()=>{
   if(document.hidden)return;
   controller?.abort();const request=new AbortController();controller=request;
   const timeout=setTimeout(()=>request.abort(),15000);
   try{
    const response=await fetch(`/api/windraeder-vorschau/microcharts?${new URLSearchParams({gemeinde:municipality,...(districtId?{kreis:districtId}:{}),...(tour&&stop?{tour,stop}:{})})}`,{signal:request.signal});
    if(!response.ok)throw new Error('Weather unavailable');
    const result=await response.json();
    if(!disposed){setState({municipality:requestKey,data:result.data,settled:true});setNow(Date.now());}
   }catch{if(!disposed)setState({municipality:requestKey,data:null,settled:true});}
   finally{clearTimeout(timeout);}
  };
  void load();const timer=setInterval(load,300000),expiry=setInterval(()=>setNow(Date.now()),30000);
  document.addEventListener('visibilitychange',load);
  return()=>{disposed=true;controller?.abort();clearInterval(timer);clearInterval(expiry);document.removeEventListener('visibilitychange',load);};
 },[municipality,districtId,tour,stop,requestKey]);
 const data=state.municipality===requestKey?state.data:null;
 // Loading until the first answer for this exact request; a failure is settled, not loading.
 const loading=Boolean(requestKey)&&!(state.municipality===requestKey&&state.settled);
 return {data,weather:microchartWind(data,now),loading};
}
