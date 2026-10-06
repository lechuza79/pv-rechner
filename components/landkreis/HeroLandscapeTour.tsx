'use client';
import windStops from '../../public/geo/landscape-wind-stops.json';
import {useMemo,useRef,useState} from 'react';
import {safeWindSignAnchor} from './location-sign';
import RegionScene,{type SceneControls} from './RegionScene';
import GemeindeHeroStage from '../gemeinde/GemeindeHeroStage';
import LocationMicroCard from './LocationMicroCard';
import {IconArrowRight} from '../Icons';
import {useMicrocharts} from '../../lib/use-microcharts';
import type {ProjectedRegion} from '../../lib/region-perspektive';
import type {SceneTerrain} from '../../lib/wind-terrain';
import type {SceneBuilding} from '../../lib/building-scene';
import type {SceneTurbine} from '../../lib/wind-map';
import type {SolarFootprint} from './solar-layer';
import styles from './wind-map.module.css';
export type TourStop={id:string;name:string;kind:'town'|'wind'|'solar';x:number;z:number;zoom:number;throughPark?:boolean;overview?:boolean;cta?:string;capacityKw?:number|null;labelX?:number;labelZ?:number;labelElevation?:number};
export type LandscapeTourData={municipality:string;name:string;weatherMunicipality?:string;shapes:ProjectedRegion[];terrain:SceneTerrain;buildings:SceneBuilding[];turbines:SceneTurbine[];solar?:SolarFootprint[];stops:TourStop[]};
const values:never[]=[];
const envelope={};
/** One hero, camera and flight controller for every prepared municipality. */
export default function HeroLandscapeTour({data,sceneOnly=false,onReady}:{data:LandscapeTourData;sceneOnly?:boolean;onReady?:(ready:boolean)=>void}){
 const controls=useRef<SceneControls|null>(null),pending=useRef(0),departed=useRef(false);
 const [current,setCurrent]=useState(0),[flying,setFlying]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[guide,setGuide]=useState(false);
 const locations=useMemo(()=>data.stops.map(stop=>{
  if(stop.kind!=='wind')return stop;
  const anchor=safeWindSignAnchor(stop,data.turbines,250,data.terrain.unitsPerMetre);
  return {...stop,labelX:anchor.x,labelZ:anchor.z};
 }),[data]);
 const weatherId=data.weatherMunicipality??data.municipality;
 const hasParkWeather=Boolean((windStops as Record<string,Record<string,unknown>>)[data.municipality]?.[data.stops[current].id]);
 const {data:microcharts,weather}=useMicrocharts(weatherId,data.stops[current].overview?data.municipality:undefined,hasParkWeather?data.municipality:undefined,hasParkWeather?data.stops[current].id:undefined);
 const stop=data.stops[current],next=stop.overview?Math.max(1,data.stops.findIndex(p=>p.kind!=='town')):(current+1)%data.stops.length;
 const fly=(index:number)=>{
  if(flying||index===current)return;
  pending.current=index;
  if(!departed.current&&current===0)controls.current?.leaveReferencePark(stop,data.stops[index]);
  else controls.current?.leaveReferencePark(stop,data.stops[index]);
  departed.current=true;
 };
 const scene=
   <div data-map-hero-stage className={styles.municipalScene} data-flying={flying} data-building-map data-ready={ready}>
    <RegionScene {...data} locations={locations} locationCard={{id:stop.id,visible:true,content:<LocationMicroCard name={stop.name} municipality={weatherId} placeName={stop.kind==='town'?stop.name:data.name} kind={stop.kind} weather={weather} microcharts={microcharts} capacityKw={stop.capacityKw}/>}}
     values={values} heightEnvelope={envelope} selected="" hovered={null} windScale={1} windConditions={weather}
     onHover={()=>{}} onSelect={id=>{const i=data.stops.findIndex(p=>p.id===id);if(i>=0)fly(i);}}
     onFlight={(moving,arrived)=>{setFlying(moving);if(arrived)setCurrent(pending.current);}}
     onControls={api=>{controls.current=api;}} onReady={ok=>{setReady(ok);setFailed(!ok);onReady?.(ok);if(ok){controls.current?.flyTo({...data.stops[0],zoom:20},false);};}}/>
    {ready&&<div className={`${styles.tour} ${styles.heroTour}`} data-tour>
     <p aria-live="polite">{flying?`Unterwegs · ${data.stops[pending.current].name}`:stop.name}</p>
     <div className={styles.referenceControls}>
      <label><input type="checkbox" checked={guide} onChange={e=>{setGuide(e.target.checked);controls.current?.showReferencePath(e.target.checked);}}/> Flugbahn zeigen</label>
      {data.stops.length>1&&<button type="button" disabled={flying} onClick={()=>fly(next)}>{flying?'Unterwegs':(data.stops[next].cta??(data.stops[next].kind==='wind'?'Zum Windpark':data.stops[next].kind==='solar'?'Zum Solarpark':`Nach ${data.stops[next].name}`))} <span aria-hidden="true"><IconArrowRight size={20}/></span></button>}
     </div>
    </div>}
    {!ready&&<p className={styles.loading}>{failed?'Die 3D-Ansicht ist in diesem Browser nicht verfügbar.':`${data.name} lädt …`}</p>}
   </div>;
 return sceneOnly?scene:<section data-map-hero-band className={`${styles.band} ${styles.municipalBand} ${styles.referenceMode}`}><GemeindeHeroStage productPreview name={data.name} parents={[]} description="Zeigen Sie, was sich in Ihrer Kommune bewegt." discoverHref="#landscape-notes" scene={scene}/></section>;
}
