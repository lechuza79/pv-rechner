'use client';
import {WeatherMicroTile} from './WeatherMicroTile';
import type {MicrochartData} from '../../lib/microchart-data';
import foundation from '../social/atlas-foundations.module.css';

/** Identical compact tiles in the gallery and municipality consumers. */
export function WeatherMicroGrid({data}:{data:MicrochartData}){
 return <section className={foundation.foundation} data-story-scheme="dark" aria-label={`Mikrocharts für ${data.place}`} style={{padding:24,borderRadius:20,background:'var(--atlas-surface)',color:'var(--atlas-text)'}}>
  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
   <WeatherMicroTile place={data.place} validAt={data.at} kind="solar" chart={{power:true,points:data.solar,currentTime:data.at}}/>
   <WeatherMicroTile place={data.place} validAt={data.at} day={data.wind} kind="wind" chart={{speedMs:data.conditions?.speedMs??null,directionDeg:data.conditions?.directionDeg??null}}/>
  </div>
  <p style={{fontSize:'var(--font-size-small)',color:'var(--atlas-secondary)',margin:'16px 0 0'}}>Modellierte Leistung für {data.place}, keine Messwerte. Wind: Referenzkurve mit Wind in 100 m Höhe. Die Partikel zeigen denselben Höhenwind.</p>
 </section>;
}
