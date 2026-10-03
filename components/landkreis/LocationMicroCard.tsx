'use client';
import {useMicrocharts} from '../../lib/use-microcharts';
import {WeatherMicroTile} from '../charts/WeatherMicroTile';
import type {MicrochartData} from '../../lib/microchart-data';
import type {WindConditions} from '../../lib/wind-animation';
import styles from './wind-map.module.css';
import foundation from '../social/atlas-foundations.module.css';
/** Scene adapter only: the central widget owns the complete sign and chart design. */
export default function LocationMicroCard({name,weather,municipality='06440016',placeName='Nidda',kind,capacityKw,microcharts}:{microcharts?:MicrochartData|null;name:string;weather:WindConditions|null;municipality?:string;placeName?:string;kind?:'town'|'wind'|'solar';capacityKw?:number|null}){
 const provided=microcharts!==undefined;
 const loaded=useMicrocharts(provided?null:municipality);
 const data=provided?microcharts:loaded.data;
 const wind=kind?kind==='wind':name==='Windpark Fauerbach';
 // Park power must not inherit the capacity of the entire municipality.
 const points=wind?data?.wind:data?.solar;
 const municipalKw=wind?data?.windCapacityKw:data?.solarCapacityKw;
 const perKw=wind?data?.windPerKw:data?.solarPerKw;
 const profile=capacityKw===undefined?points:capacityKw===null?null:perKw?.map(p=>({...p,value:p.value*capacityKw}))??(!municipalKw?null:points?.map(p=>({...p,value:p.value*capacityKw/municipalKw})));
 const current=profile?.filter(p=>Date.parse(p.time)<=Date.parse(data?.at??'')).at(-1);
 const conditions=provided?weather:weather??loaded.weather;
 return <div className={`${foundation.foundation} ${styles.microSign}`} data-story-scheme="dark" data-location-weather data-current-place={name} data-capacity-kw={capacityKw??''} data-municipal-kw={municipalKw??''} data-profile-samples={profile?.length??0} data-wind-speed={conditions?.speedMs??''} data-weather-at={conditions?.validAt??''} onPointerDown={e=>e.stopPropagation()}>
  {wind?<WeatherMicroTile kind="wind" label={name} place={name} validAt={conditions?.validAt} layout="stacked" day={profile??null} chart={{speedMs:conditions?.speedMs??null,directionDeg:conditions?.directionDeg??null}}/>:
   <WeatherMicroTile kind="solar" label={name} place={kind==='town'?placeName:name} validAt={current?.time} chart={{points:profile??null,currentTime:current?.time,power:true}}/>}
 </div>;
}
