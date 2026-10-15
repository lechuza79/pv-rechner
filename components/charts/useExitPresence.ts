"use client";
import {useEffect,useState} from 'react';
/** Retain the outgoing detail long enough for its CSS exit transition. */
export function useExitPresence(value:string,duration=400){
 const [shown,setShown]=useState(value);
 useEffect(()=>{
  if(value){setShown(value);return;}
  const timer=setTimeout(()=>setShown(''),window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:duration);
  return()=>clearTimeout(timer);
 },[value,duration]);
 return value||shown;
}
