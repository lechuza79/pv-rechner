'use client';
import {useEffect,useState} from 'react';
import HeroLandscapeTour,{type LandscapeTourData} from './HeroLandscapeTour';
import {municipalityTour,preparedLandscapeTour} from '../../lib/landscape-tour';
export default function MunicipalityHeroPreview({municipality='05774040',name='Bad Wünnenberg',sceneOnly=false,onReady}:{municipality?:string;name?:string;sceneOnly?:boolean;onReady?:(ready:boolean)=>void}){
 const [data,setData]=useState<LandscapeTourData|null>(null),[error,setError]=useState(false);
 useEffect(()=>{
  setData(null);setError(false);
  const controller=new AbortController();
  const read=async(url:string)=>{const response=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error('Scene data missing');return response.json();};
  const load=async()=>{
   if(municipality!=='05774040')return preparedLandscapeTour(await read(`/geo/landscape-tours/${municipality}/scene.json`));
   const [feature,terrain,context,register,buildings]=await Promise.all(['/geo/wind-boundaries/05774040.geo.json','/geo/wind-terrain/05774040.json','/geo/wind-context/05774040.json','/geo/wuennenberg-preview/register.json','/geo/wuennenberg-preview/buildings.json'].map(read));
   return municipalityTour(feature,{...terrain,context},register.turbines,buildings.buildings);
  };
  void load().then(value=>{if(!controller.signal.aborted)setData(value);}).catch(()=>{if(!controller.signal.aborted){setError(true);onReady?.(false);}});
  return()=>controller.abort();
 },[municipality]);
 return data?<HeroLandscapeTour key={municipality} data={data} sceneOnly={sceneOnly} onReady={onReady}/>:<p role="status">{error?`Die Landschaftsdaten für ${name} sind noch nicht vollständig verfügbar.`:`${name} lädt …`}</p>;
}
