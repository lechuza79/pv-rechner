import React from 'react';
import {CurrentPower,MonitorWidget} from './MunicipalDataPreview';
import data from './charts.json';
import foundation from '@solar-check/story-source/components/social/atlas-foundations.module.css';

/** The hero renders the monitor components directly, with the same data and controls. */
export default function HeroWidgetPreview(){
 const widget=new URLSearchParams(location.search).get('widget')??'feed-in-value';
 const item=data.charts.find(item=>item.template===widget);
 return <div className={`${foundation.foundation} municipal-data sc-dashboard monitor-hero`} data-story-scheme="dark">{widget==='live'?<CurrentPower/>:item?<MonitorWidget item={item}/>:null}</div>;
}
