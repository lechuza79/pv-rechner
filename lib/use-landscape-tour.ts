'use client';
import {useMemo} from 'react';
import {useWidgetResource} from '../components/dashboard/WidgetData';
import {landscapeResourceUrl} from './landscape-resource';
import {municipalityTour,preparedLandscapeTour,niddaLandscapeTour} from './landscape-tour';
import type {BuildingPreview} from './building-scene';
export function useLandscapeTour(municipality:string){
 const special=municipality==='05774040',nidda=municipality==='06440016';
 const scene=useWidgetResource<Parameters<typeof preparedLandscapeTour>[0]|null>(special||nidda?null:landscapeResourceUrl(`/geo/landscape-tours/${municipality}/scene.json`),null,3600000);
 const feature=useWidgetResource<Parameters<typeof municipalityTour>[0]|null>(special?landscapeResourceUrl('/geo/wind-boundaries/05774040.geo.json'):null,null,3600000);
 const terrain=useWidgetResource<Parameters<typeof municipalityTour>[1]|null>(special?landscapeResourceUrl('/geo/wind-terrain/05774040.json'):null,null,3600000);
 const context=useWidgetResource<NonNullable<Parameters<typeof municipalityTour>[1]['context']>|null>(special?landscapeResourceUrl('/geo/wind-context/05774040.json'):null,null,3600000);
 const register=useWidgetResource<{turbines:Parameters<typeof municipalityTour>[2]}|null>(special?landscapeResourceUrl('/geo/wuennenberg-preview/register.json'):null,null,3600000);
 const buildings=useWidgetResource<{buildings:Parameters<typeof municipalityTour>[3]}|null>(special?landscapeResourceUrl('/geo/wuennenberg-preview/buildings.json'):null,null,3600000);
 const niddaScene=useWidgetResource<BuildingPreview|null>(nidda?landscapeResourceUrl('/geo/nidda-preview/scene.json'):null,null,3600000);
 const niddaSolar=useWidgetResource<BuildingPreview|null>(nidda?landscapeResourceUrl('/geo/nidda-preview/solar.json'):null,null,3600000);
 const niddaWind=useWidgetResource<Pick<BuildingPreview,'terrain'|'turbines'>|null>(nidda?landscapeResourceUrl('/geo/nidda-preview/wind-overview.json'):null,null,3600000);
 const data=useMemo(()=>niddaScene.data&&niddaSolar.data&&niddaWind.data?niddaLandscapeTour(niddaScene.data,niddaWind.data,niddaSolar.data):scene.data?preparedLandscapeTour(scene.data):feature.data&&terrain.data&&context.data&&register.data&&buildings.data?municipalityTour(feature.data,{...terrain.data,context:context.data},register.data.turbines,buildings.data.buildings):null,[niddaScene.data,niddaSolar.data,niddaWind.data,scene.data,feature.data,terrain.data,context.data,register.data,buildings.data]);
 const error=[scene,feature,terrain,context,register,buildings,niddaScene,niddaSolar,niddaWind].some(resource=>resource.error);
 return {data,error};
}
