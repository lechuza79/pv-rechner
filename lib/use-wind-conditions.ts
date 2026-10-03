"use client";
import {useState,useEffect} from "react";
import {usableWind,type WindConditions} from "./wind-animation";
export function useWindConditions(id:string,initialWind:WindConditions|null=null){
  const [weather,setWeather]=useState<WindConditions|null>(initialWind);
  useEffect(()=>{
    let disposed=false;let controller:AbortController|null=null;
    const refresh=async()=>{
      if(document.hidden)return;
      controller?.abort();const request=new AbortController();controller=request;
      const timeout=setTimeout(()=>request.abort(),15000);
      try{
        const response=await fetch(`/api/windraeder-vorschau/wind?gemeinde=${id}`,{signal:request.signal});
        if(!response.ok)throw new Error("Wind unavailable");
        const {wind}=await response.json() as {wind:WindConditions|null};
        if(!disposed)setWeather(usableWind(wind)?wind:null);
      }catch{if(!disposed)setWeather(previous=>usableWind(previous)?previous:null);}
      finally{clearTimeout(timeout);}
    };
    void refresh();
    const poll=setInterval(refresh,5*60*1000);
    const expiry=setInterval(()=>setWeather(previous=>usableWind(previous)?previous:null),30000);
    document.addEventListener("visibilitychange",refresh);
    return()=>{disposed=true;controller?.abort();clearInterval(poll);clearInterval(expiry);document.removeEventListener("visibilitychange",refresh);};
  },[id]);
  return weather;
}
