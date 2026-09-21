import React,{useEffect,useState} from 'react';
import {CurrentPower} from './MunicipalDataPreview';
import {MunicipalChart} from '@solar-check/story-source/components/social/MunicipalChart';
import {MonitorMonthlySolarChart} from './MonitorMonthlySolarChart';
import data from './charts.json';
import foundation from '@solar-check/story-source/components/social/atlas-foundations.module.css';

/** Compact stories reuse monitor data without its dashboard controls. */
export default function HeroWidgetPreview(){
 const [widget,setWidget]=useState(new URLSearchParams(location.search).get('widget')??'feed-in-value');
 useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='atlas-hero-widget'&&['feed-in-value','live','radial'].includes(event.data.widget))setWidget(event.data.widget);};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
 const item=data.charts.find(item=>item.template===widget);
 const period=item?.story.solarMonth?.month??'2026-08';
 const month=new Intl.DateTimeFormat('de-DE',{month:'long',timeZone:'UTC'}).format(new Date(period+'-15T12:00:00Z'));
 useEffect(()=>{let active=true;Promise.all([document.fonts.ready,...Array.from(document.images).map(image=>image.decode().catch(()=>{}))]).then(()=>{if(active)parent.postMessage({type:'atlas-hero-ready'},location.origin);});return()=>{active=false;};},[widget]);
 return <div className={`${foundation.foundation} municipal-data sc-dashboard monitor-hero`} data-story-scheme="dark">
  {widget==='live'?<CurrentPower compact/>:item?<article className="hero-story">
   <h3>{widget==='radial'?'Solarerzeugung '+month:'Einspeisevergütung '+month}</h3>
   <div className="hero-story-visual">{item.story.solarMonth?<MonitorMonthlySolarChart data={item.story.solarMonth} compact/>:<MunicipalChart story={item.story as any} compact/>}</div>
  </article>:null}
 </div>;
}
