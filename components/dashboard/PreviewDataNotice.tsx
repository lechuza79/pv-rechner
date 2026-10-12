'use client';
import {useEffect,useState} from 'react';

/** One status for the local gallery, separate from chart source attribution. */
export default function PreviewDataNotice(){
  const [snapshot,setSnapshot]=useState<string|null>(null);
  useEffect(()=>{
    if(process.env.NODE_ENV!=='development')return;
    const controller=new AbortController();
    const check=async()=>{
      if(document.hidden)return;
      try{
        const response=await fetch('/api/widget-preview-status',{signal:controller.signal,cache:'no-store'});
        if(!response.ok)return;
        const data=await response.json();
        setSnapshot(data.stale?data.fetchedAt:null);
      }catch { /* The notice must not interrupt the preview. */ }
    };
    void check();
    const timer=setInterval(check,15_000);
    document.addEventListener('visibilitychange',check);
    return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',check);};
  },[]);
  return snapshot?<p role="status">Einige Vorschaudaten werden aus dem letzten erfolgreichen Abruf angezeigt ({new Date(snapshot).toLocaleString('de-DE')}). Die Aktualisierung läuft im Hintergrund.</p>:null;
}
