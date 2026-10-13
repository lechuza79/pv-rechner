import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {projectRegions, regionProjection, type ProjectedRegion, type Point, type RegionGeometry} from './region-perspektive';

/** Use the same checked-in boundaries as the municipality maps. */
export async function districtGeometry(id:string,members?:readonly string[]) {
  if(!/^\d{5}$/.test(id))throw new Error('Invalid district identifier');
  try {
    const data=JSON.parse(await readFile(path.join(process.cwd(),'public','geo','gemeinden',`${id}.geo.json`),'utf8')) as {features:RegionGeometry[]};
    const features=members ? data.features.filter(feature=>members.includes(feature.properties.id)) : data.features;
    if(members && members.some(id=>!features.some(feature=>feature.properties.id===id)))throw new Error('Association boundary missing');
    return projectRegions(features);
  } catch(error) {
    if((error as NodeJS.ErrnoException).code==='ENOENT')return [];
    throw error;
  }
}

/** Checked-in national boundary sets, read once per server instance. */
const nationalSets = new Map<string, Promise<RegionGeometry[]>>();
function nationalSet(file: 'de-landkreise' | 'de-bundeslaender') {
  let set = nationalSets.get(file);
  if (!set) {
    set = readFile(path.join(process.cwd(), 'public', 'geo', `${file}.geo.json`), 'utf8').then(text => (JSON.parse(text) as {features: RegionGeometry[]}).features);
    nationalSets.set(file, set);
  }
  return set;
}

/**
 * Boundaries of the children of a Bundesland (Landkreise AND kreisfreie Städte,
 * all members) or of Deutschland (the 16 Länder). The `kind` is dropped on
 * purpose: the district map shows a "Kreisfreie Stadt" as a non-member pin, but
 * on a Bundesland page it is a full member.
 */
export async function childGeometry(level: 'bundesland' | 'de', id: string) {
  if (level === 'bundesland' && !/^\d{2}$/.test(id)) throw new Error('Invalid state identifier');
  const features = level === 'bundesland'
    ? (await nationalSet('de-landkreise')).filter(f => (f.properties as {bl?: string}).bl === id)
    : await nationalSet('de-bundeslaender');
  return projectRegions(features.map(f => ({...f, properties: {id: f.properties.id, name: f.properties.name}})));
}

/** Schematic sea-area markers; no invented offshore boundaries or plant locations. */
export async function stateElectricityGeometry():Promise<ProjectedRegion[]> {
 const features=await nationalSet('de-bundeslaender');
 const shapes=await childGeometry('de','de');
 const projection=regionProjection(features);
 const markers:{id:string;name:string;point:Point}[]=[
  {id:'offshore-nordsee',name:'Nordsee (Offshore)',point:[7,54.5]},
  {id:'offshore-ostsee',name:'Ostsee (Offshore)',point:[13.5,54.8]},
 ];
 return [...shapes,...markers.map(marker=>{
  const anchor=projection.project(marker.point);
  return {id:marker.id,name:marker.name,kind:'Seegebiet',ground:[],groundAnchor:projection.groundPoint(marker.point),groundTrees:[],trees:[],path:'',anchor,bounds:[anchor[0]-8,anchor[1]-8,anchor[0]+8,anchor[1]+8] as [number,number,number,number]};
 })];
}

/** Decorative sea extent clipped to the same land geometry as the map. */
export async function stateElectricityWater():Promise<import('./wind-context').SceneContext> {
 const features=await nationalSet('de-bundeslaender');
 const projection=regionProjection(features);
 const shapes=await childGeometry('de','de');
 const seas:Point[][]=[
  [[5.7,53.3],[7.1,53.3],[8.7,53.7],[9.7,54.5],[10.7,53.9],[14.8,53.9],[14.8,55.4],[5.7,55.4]],
 ];
 return {waterStyle:'ripples',waterLand:shapes.flatMap(shape=>shape.ground),unitsPerMetre:1,streams:[],places:[],areas:seas.map(ring=>({kind:'water',rings:[ring.map(point=>projection.groundPoint(point))]}))};
}
