import type { ProjectedRegion } from './region-perspektive';
import {buildingTerrainSurface} from './building-terrain';
import {terrainHeight} from './wind-terrain';
import type { SceneTurbine } from './wind-map';
import type {SolarFootprint} from '../components/landkreis/solar-layer';

export type SceneLocation = { id:string; name:string; x:number; z:number; labelX?:number; labelZ?:number; labelElevation?:number };
export type BuildingPoint = [number, number, number];
export type BuildingSurface = { kind: string; points: BuildingPoint[]; holes?: BuildingPoint[][] };
export type SceneBuilding = { id: string; surfaces: BuildingSurface[] };
export type BuildingPreview = {
  locations?:SceneLocation[];
  stops?:(SceneLocation & {kind:'town'|'wind'|'solar';zoom:number})[];
  solar?:SolarFootprint[];
  turbines?: (SceneTurbine & { locationUncertain?: boolean })[];
  origin: BuildingPoint; crs: string; heightReference: string; buildings: SceneBuilding[];
  terrain: { width: number; height: number; groundBounds: [number, number, number, number]; elevations: (number|null)[]; coverage?:'explicit-outer-mask'; minimum: number; maximum: number };
};

/** Both inputs already use the SAME local UTM origin. Apply one uniform scale. */
export function projectBuildingPreview(data: BuildingPreview, unitsPerMetre = 1.4, centre: [number, number] = [0, 0]) {
  if (data.crs !== 'ETRS89_UTM32' || data.heightReference !== 'DHHN2016_NH') throw new Error('Unsupported building reference');
  const t = data.terrain;
  if (t.elevations.length !== t.width * t.height || !t.elevations.every(value=>Number.isFinite(value)||(value===null&&t.coverage==='explicit-outer-mask'))) throw new Error('Incomplete terrain');
  const elevations=t.elevations.map(value=>value===null?Number.NaN:value);
  const groundBounds = t.groundBounds.map((v, i) => (v - centre[i % 2]) * unitsPerMetre) as [number, number, number, number];
  const [w, n, e, s] = groundBounds;
  const ring: [number, number][] = [[w, n], [e, n], [e, s], [w, s], [w, n]];
  const shape: ProjectedRegion = { id: 'nidda-marktplatz', name: 'Nidda · Marktplatz', ground: [[ring]], groundAnchor: [0, 0], groundTrees: [], trees: [], path: '', anchor: [0, 0], bounds: [w, n, e, s] };
  // Keep original source heights for every ground lookup. Only distant display
  // triangles are reduced; buildings and installations retain original cells.
  const detailBounds:[number,number,number,number][]=[];
  const include=(left:number,top:number,right:number,bottom:number,padding:number)=>detailBounds.push([(left-padding-centre[0])*unitsPerMetre,(top-padding-centre[1])*unitsPerMetre,(right+padding-centre[0])*unitsPerMetre,(bottom+padding-centre[1])*unitsPerMetre]);
  for(const building of data.buildings){
    let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
    for(const surface of building.surfaces)for(const [x,,z] of surface.points){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,z);bottom=Math.max(bottom,z);}
    if(Number.isFinite(left))include(left,top,right,bottom,20);
  }
  for(const turbine of data.turbines??[])include(turbine.x,turbine.z,turbine.x,turbine.z,100);
  for(const stop of [...(data.stops??[]),...(data.locations??[])])include(stop.x,stop.z,stop.x,stop.z,200);
  for(const field of data.solar??[]){
    let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
    for(const [x,z] of field.ring){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,z);bottom=Math.max(bottom,z);}
    if(Number.isFinite(left))include(left,top,right,bottom,20);
  }
  const terrain=buildingTerrainSurface({...t,elevations,id:shape.id,groundBounds,unitsPerMetre,reference:data.origin[2]},detailBounds,data.turbines||data.solar?1:2);
  if(t.coverage==='explicit-outer-mask'){
    const positions:[number,number][]=[...(data.turbines??[]).map(p=>[p.x,p.z] as [number,number]),...(data.stops??[]).map(p=>[p.x,p.z] as [number,number]),...(data.solar??[]).flatMap(p=>p.ring),...data.buildings.flatMap(b=>b.surfaces.flatMap(s=>[s.points,...(s.holes??[])].flatMap(r=>r.map(p=>[p[0],p[2]] as [number,number]))))];
    if(positions.some(([x,z])=>!Number.isFinite(terrainHeight(terrain,(x-centre[0])*unitsPerMetre,(z-centre[1])*unitsPerMetre))))throw new Error('Object intersects missing terrain');
  }
  const point = (p: BuildingPoint): BuildingPoint => [(p[0]-centre[0])*unitsPerMetre,p[1]*unitsPerMetre,(p[2]-centre[1])*unitsPerMetre];
  const buildings = data.buildings.map(b => ({ ...b, surfaces: b.surfaces.map(s => ({ ...s, points: s.points.map(point), holes: s.holes?.map(r => r.map(point)) })) }));
  const turbines = (data.turbines ?? []).map(t => ({...t,x:(t.x-centre[0])*unitsPerMetre,z:(t.z-centre[1])*unitsPerMetre,
    hub:t.locationUncertain||t.hub===null?null:t.hub*unitsPerMetre,rotor:t.locationUncertain||t.rotor===null?null:t.rotor*unitsPerMetre}));
  const solar=data.solar?.map(field=>({...field,ring:field.ring.map(([x,z])=>[(x-centre[0])*unitsPerMetre,(z-centre[1])*unitsPerMetre] as [number,number])}));
  const locations=data.locations?.map(p=>({...p,x:(p.x-centre[0])*unitsPerMetre,z:(p.z-centre[1])*unitsPerMetre}));
  return { locations, shapes: [shape], terrain, buildings, turbines, solar };
}
