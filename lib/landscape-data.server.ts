import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {previewData} from './preview-data';
import {landscapeResourcePath} from './landscape-resource';
import {preparedLandscapeTour,niddaLandscapeTour,municipalityTour} from './landscape-tour';
export async function loadLandscapeAsset(asset:string){
 if(!landscapeResourcePath(asset))throw new Error('Unknown landscape asset');
 return previewData(`landscape-v1:${asset}`,async()=>{
   // Prepared geometry is a versioned release asset, unlike live weather.
   try{return JSON.parse(await readFile(path.join(process.cwd(),'public',asset),'utf8'));}
   catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
   const response=await fetch(new URL(asset,'https://solar-check.io'),{credentials:'omit',redirect:'error',next:{revalidate:3600},signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw new Error('Landscape unavailable');
   const data=await response.json();
   if(!data||typeof data!=='object'||'error' in data)throw new Error('Invalid landscape');
   return data;
  });
}
/** Compact metadata comes from the same prepared scene; no geometry reaches a card. */
export async function loadLandscapeStops(id:string){
 return previewData(`landscape-stops-v1:${id}`,async()=>{
  const load=loadLandscapeAsset;
  const data=id==='06440016'?niddaLandscapeTour(...await Promise.all([load('/geo/nidda-preview/scene.json'),load('/geo/nidda-preview/wind-overview.json'),load('/geo/nidda-preview/solar.json')]) as Parameters<typeof niddaLandscapeTour>):
   id==='05774040'?await (async()=>{const [feature,terrain,context,register,buildings]=await Promise.all([load('/geo/wind-boundaries/05774040.geo.json'),load('/geo/wind-terrain/05774040.json'),load('/geo/wind-context/05774040.json'),load('/geo/wuennenberg-preview/register.json'),load('/geo/wuennenberg-preview/buildings.json')]);return municipalityTour(feature,{...terrain,context},register.turbines,buildings.buildings);})():
   preparedLandscapeTour(await load(`/geo/landscape-tours/${id}/scene.json`));
  return {municipality:data.municipality,name:data.name,weatherMunicipality:data.weatherMunicipality,stops:data.stops};
 });
}
