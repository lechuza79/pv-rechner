import windStops from '../public/geo/landscape-wind-stops.json';
import {projectRegions,regionProjection,type RegionGeometry} from './region-perspektive';
import {terrainHeight,projectWindTerrain,type WindTerrain} from './wind-terrain';
import {sceneTurbines,type WindTurbine} from './wind-map';
import type {SceneBuilding,BuildingPoint} from './building-scene';
import type {LandscapeTourData} from '../components/landkreis/HeroLandscapeTour';

/** The same projection and metric scale are applied to every source. */
export function municipalityTour(feature:RegionGeometry,terrainData:WindTerrain,rows:WindTurbine[],geographicBuildings:SceneBuilding[]):LandscapeTourData{
 const projection=regionProjection([feature]),terrain=projectWindTerrain(feature,terrainData);
 terrain.display='contours';
 const convert=([lon,lat,height]:BuildingPoint):BuildingPoint=>{const [x,z]=projection.groundPoint([lon,lat]);return [x,(height-terrain.reference)*projection.unitsPerMetre,z];};
 const buildings=geographicBuildings.map(b=>({...b,surfaces:b.surfaces.map(s=>({...s,points:s.points.map(convert),holes:s.holes?.map(r=>r.map(convert))}))}));
 const turbines=sceneTurbines(feature,rows);
 const place=terrainData.context?.places.find(p=>p.name===feature.properties.name);
 if(!place)throw new Error('Municipal destination missing');
 const [x,z]=projection.groundPoint(place.point);
 const nearby=turbines.filter(t=>t.hub!==null&&t.rotor!==null).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z)).slice(0,5);
 if(!nearby.length)throw new Error('No dimensioned turbines for a tour');
 const centre={x:nearby.reduce((s,t)=>s+t.x,0)/nearby.length,z:nearby.reduce((s,t)=>s+t.z,0)/nearby.length};
 return {municipality:feature.properties.id,name:feature.properties.name,shapes:projectRegions([feature]),terrain,buildings,turbines,stops:[
  {id:'town',name:feature.properties.name,kind:'town',x,z,zoom:12},
  {id:'wind',name:`Windanlagen bei ${feature.properties.name}`,kind:'wind',...centre,zoom:8,throughPark:true,capacityKw:null}
 ]};
}

import {projectBuildingPreview,type BuildingPreview} from './building-scene';
import type {TourStop} from '../components/landkreis/HeroLandscapeTour';
export type PreparedLandscapeTour=BuildingPreview & {
 municipality:string;name:string;weatherMunicipality?:string;stops:TourStop[];
 context?:{streams:[number,number][][];areas:{kind:'water'|'settlement';rings:[number,number][][]}[];places:[]};
};
/** Prepared towns share one metric reference and the accepted scene/flight renderer. */
export function preparedLandscapeTour(data:PreparedLandscapeTour):LandscapeTourData{
 const [w,n,e,s]=data.terrain.groundBounds;
 const scale=700/Math.max(e-w,s-n),centre:[number,number]=[(w+e)/2,(n+s)/2];
 if(!data.stops.length)throw new Error('Tour has no destination');
 const projected=projectBuildingPreview(data,scale,centre);
 projected.shapes[0].id=data.municipality;projected.shapes[0].name=data.name;
 projected.terrain.id=data.municipality;projected.terrain.display='contours';
 const point=([x,z]:[number,number]):[number,number]=>[(x-centre[0])*scale,(z-centre[1])*scale];
 if(data.context)projected.terrain.sceneContext={unitsPerMetre:scale,streams:data.context.streams.map(ps=>ps.map(point)),areas:data.context.areas.map(a=>({...a,rings:a.rings.map(r=>r.map(point))})),places:[]};
 const stops:TourStop[]=data.stops.map(p=>{
  const [x,z]=point([p.x,p.z]);
  // Keep town signs near the ground on a clear site, rather than above the
  // tallest roof in a wide radius. The camera destination remains unchanged.
  let labelX=x,labelZ=z,labelElevation: number|undefined;
  if(p.kind==='town'){
   const boxes=data.buildings.map(b=>b.surfaces.flatMap(s=>s.points)).filter(ps=>ps.length).map(ps=>({w:Math.min(...ps.map(v=>v[0])),e:Math.max(...ps.map(v=>v[0])),n:Math.min(...ps.map(v=>v[2])),s:Math.max(...ps.map(v=>v[2]))})).filter(b=>b.w<p.x+100&&b.e>p.x-100&&b.n<p.z+100&&b.s>p.z-100);
   const clear=(a:number,b:number)=>boxes.every(box=>a<box.w-3||a>box.e+3||b<box.n-3||b>box.s+3);
   let site:[number,number]|undefined=clear(p.x,p.z)?[p.x,p.z]:undefined;
   for(let radius=5;!site&&radius<=80;radius+=5)for(let i=0;i<64;i++){
    const a=p.x+Math.cos(i*Math.PI/32)*radius,b=p.z+Math.sin(i*Math.PI/32)*radius;
    if(clear(a,b)){site=[a,b];break;}
   }
   [labelX,labelZ]=point(site??[p.x,p.z]);
   labelElevation=terrainHeight(projected.terrain,labelX,labelZ)+4*scale;
  }
  const metadata=(windStops as Record<string,Record<string,{name:string}>>)[data.municipality]?.[p.id];
  return {...p,...(metadata?{name:metadata.name}:{}),x,z,zoom:p.kind==='town'?16:p.zoom,labelX,labelZ,labelElevation};
 });
 if(/^\d{5}$/.test(data.municipality)){
  // Reuse the prepared town's measured landscape and clear sign anchor.
  // District is the scope of the card, not a separate high-altitude camera mode.
  const start=stops.find(stop=>stop.kind==='town')??stops[0];
  const name=data.name.startsWith('Landkreis ')?data.name:`Landkreis ${data.name}`;
  stops.unshift({...start,id:'district',kind:'town',name,zoom:12,overview:true,capacityKw:undefined,cta:'Zur Kreisübersicht'});
 }
 return {...projected,municipality:data.municipality,name:data.name,weatherMunicipality:data.weatherMunicipality,stops};
}
