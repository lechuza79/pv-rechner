'use client';
import {createPortal} from 'react-dom';
import {useLandscapeWeather} from '../../lib/use-landscape-weather';
import {useMemo,useRef,useState} from 'react';
import {safeWindSignAnchor} from './location-sign';
import RegionScene,{type SceneControls} from './RegionScene';
import GemeindeHeroStage from '../gemeinde/GemeindeHeroStage';
import LocationMicroCard from './LocationMicroCard';
import {IconArrowRight,IconChevronLeft,IconChevronRight} from '../Icons';
import {WidgetIconButton} from '../dashboard/WidgetControls';
import {Auswahl} from '../Auswahl';
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
export default function HeroLandscapeTour({data,sceneOnly=false,onReady,initialStop,onStopChange,destinationTarget}:{data:LandscapeTourData;sceneOnly?:boolean;onReady?:(ready:boolean)=>void;initialStop?:string;onStopChange?:(stop:string)=>void;destinationTarget?:HTMLElement|null}){
 const start=Math.max(0,data.stops.findIndex(stop=>stop.id===initialStop));
 const controls=useRef<SceneControls|null>(null),pending=useRef(start),departed=useRef(false);
 const [current,setCurrent]=useState(start),[flying,setFlying]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[guide,setGuide]=useState(false);
 const locations=useMemo(()=>data.stops.map(stop=>{
  if(stop.kind!=='wind')return stop;
  const anchor=safeWindSignAnchor(stop,data.turbines,250,data.terrain.unitsPerMetre);
  return {...stop,labelX:anchor.x,labelZ:anchor.z};
 }),[data]);
 // Disambiguate equal destination names only in the widget navigation.
 const destinations=useMemo(()=>data.stops.map((item,index)=>({
  schluessel:item.id,
  name:data.stops.filter(other=>other.name===item.name).length>1
   ?`${item.name} · ${data.stops.slice(0,index+1).filter(other=>other.name===item.name).length}`:item.name,
 })),[data.stops]);
 const stop=data.stops[current],next=stop.overview?Math.max(1,data.stops.findIndex(p=>p.kind!=='town')):(current+1)%data.stops.length;
 const {data:microcharts,weather,loading:weatherLoading,municipality:weatherId}=useLandscapeWeather(data,stop);
 const fly=(index:number)=>{
  if(flying||index<0||index>=data.stops.length||index===current)return;
  pending.current=index;
  if(!departed.current&&current===0)controls.current?.leaveReferencePark(stop,data.stops[index]);
  else controls.current?.leaveReferencePark(stop,data.stops[index]);
  departed.current=true;
 };
 const destinationPicker=<Auswahl titel={flying?`Unterwegs: ${destinations[pending.current].name}`:destinations[current].name} eintraege={destinations} aktiv={stop.id} onWahl={id=>fly(data.stops.findIndex(item=>item.id===id))} breite={0} pfeile={false} transparent menuPlacement={destinationTarget?"bottom":"top"} menuAlign={destinationTarget?"start":"center"} disabled={flying}/>;
 const scene=
   <div data-map-hero-stage className={styles.municipalScene} data-flying={flying} data-building-map data-ready={ready}>
    <RegionScene {...data} locations={locations} locationCard={{id:stop.id,visible:true,content:<LocationMicroCard name={stop.name} municipality={weatherId} placeName={stop.kind==='town'?stop.name:data.name} kind={stop.kind} weather={weather} microcharts={microcharts} loading={weatherLoading} capacityKw={stop.capacityKw}/>}}
     values={values} heightEnvelope={envelope} selected="" hovered={null} windScale={1} windConditions={weather}
     onHover={()=>{}} onSelect={id=>{const i=data.stops.findIndex(p=>p.id===id);if(i>=0)fly(i);}}
     onFlight={(moving,arrived)=>{setFlying(moving);if(arrived){setCurrent(pending.current);onStopChange?.(data.stops[pending.current].id);}}}
     onControls={api=>{controls.current=api;}} onReady={ok=>{setReady(ok);setFailed(!ok);onReady?.(ok);if(ok){controls.current?.flyTo({...data.stops[start],zoom:data.stops[start].kind==='town'?20:data.stops[start].zoom},false);};}}/>
    {ready&&sceneOnly&&destinationTarget&&createPortal(destinationPicker,destinationTarget)}
    {ready&&sceneOnly&&<div className={styles.widgetTourControls} data-tour data-sc-export-ignore aria-label="Navigation in der Landschaft" aria-busy={flying}>
     <WidgetIconButton label="Vorheriges Ziel" disabled={flying} onClick={()=>fly((current-1+data.stops.length)%data.stops.length)}><IconChevronLeft size={16}/></WidgetIconButton>
   {destinationTarget?<span aria-hidden="true"/>:destinationPicker}
   <WidgetIconButton label="Nächstes Ziel" disabled={flying} onClick={()=>fly((current+1)%data.stops.length)}><IconChevronRight size={16}/></WidgetIconButton>
   <span className={styles.tourStatus} role="status">{flying?`Flug nach ${data.stops[pending.current].name}`:''}</span>
    </div>}
    {ready&&!sceneOnly&&<div className={`${styles.tour} ${styles.heroTour}`} data-tour data-sc-export-ignore>
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
