import React from 'react';
import {CurrentPower} from './MunicipalDataPreview';
import {MunicipalChart} from '@solar-check/story-source/components/social/MunicipalChart';
import {MonitorMonthlySolarChart} from './MonitorMonthlySolarChart';
import data from './charts.json';
import foundation from '@solar-check/story-source/components/social/atlas-foundations.module.css';

/** Compact stories reuse monitor data without its dashboard controls. */
export default function HeroWidgetPreview(){
 const widget=new URLSearchParams(location.search).get('widget')??'feed-in-value';
 const item=data.charts.find(item=>item.template===widget);
 return <div className={`${foundation.foundation} municipal-data sc-dashboard monitor-hero`} data-story-scheme="dark">
  {widget==='live'?<CurrentPower compact/>:item?<article className="hero-story">
   <h3>{widget==='radial'?'Solarerzeugung im Tagesverlauf':'Einspeisevergütung'}</h3>
   <p>{item.story.period} · Modellrechnung</p>
   <div className="hero-story-visual">{item.story.solarMonth?<MonitorMonthlySolarChart data={item.story.solarMonth} compact/>:<MunicipalChart story={item.story as any} compact/>}</div>
  </article>:null}
 </div>;
}
