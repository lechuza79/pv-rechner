"use client";
import {useState,useEffect} from 'react';
import {useWidgetResource} from '../components/dashboard/WidgetData';
import {usableWind,type WindConditions} from './wind-animation';
export function useWindConditions(id:string,initialWind:WindConditions|null=null){
 const {data}=useWidgetResource<{wind:WindConditions|null}>(`/api/windraeder-vorschau/wind?gemeinde=${id}`,{wind:initialWind});
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
 return usableWind(data.wind,now)?data.wind:null;
}
