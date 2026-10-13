'use client';
import {WidgetPresentationProvider} from './dashboard/WidgetPresentationContext';
import {useState} from 'react';
import {WidgetPresetButtons} from './dashboard/WidgetControls';
import RegionalHourlyMap from './RegionalHourlyMap';
import StateElectricityMap from './StateElectricityMap';
import type {RegionalHourlyData} from '../lib/co2map';
import type {StateElectricity} from '../lib/state-electricity';
import type {ProjectedRegion} from '../lib/region-perspektive';
import type {SceneContext} from '../lib/wind-context';
import styles from './StateElectricityMap.module.css';
export default function RegionalElectricityViews({shapes,sceneContext,annual,hourly}:{shapes:ProjectedRegion[];sceneContext:SceneContext;annual:StateElectricity|null;hourly:RegionalHourlyData|null}){
 const [view,setView]=useState('hourly');
 return <WidgetPresentationProvider appearance={{theme:'dark'}}><div className="sc-dashboard" data-story-scheme="dark"><div className={styles.controls}><WidgetPresetButtons label="Zeitraum des regionalen Strommix" value={view} onChange={setView} options={[{value:'hourly',label:'Stündlich'},{value:'annual',label:'Jahresmengen'}]}/></div>
 {view==='hourly'?<RegionalHourlyMap shapes={shapes} sceneContext={sceneContext} initialData={hourly}/>:<StateElectricityMap shapes={shapes} sceneContext={sceneContext} initialData={annual} review/>}</div></WidgetPresentationProvider>;
}
