'use client';
import {useEffect} from 'react';
import {useLandscapeTour} from '../../lib/use-landscape-tour';
import HeroLandscapeTour from './HeroLandscapeTour';
export default function MunicipalityHeroPreview({municipality='05774040',name='Bad Wünnenberg',sceneOnly=false,onReady,initialStop,onStopChange,destinationTarget}:{municipality?:string;name?:string;sceneOnly?:boolean;onReady?:(ready:boolean)=>void;initialStop?:string;onStopChange?:(stop:string)=>void;destinationTarget?:HTMLElement|null}){
 const {data,error}=useLandscapeTour(municipality);
 useEffect(()=>{if(error&&!data)onReady?.(false);},[error,!!data]);
 return data?<HeroLandscapeTour key={municipality} data={data} sceneOnly={sceneOnly} onReady={onReady} initialStop={initialStop} onStopChange={onStopChange} destinationTarget={destinationTarget}/>:<p role="status">{error?`Die Landschaftsdaten für ${name} sind noch nicht vollständig verfügbar.`:`${name} lädt …`}</p>;
}
