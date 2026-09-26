import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {projectRegions, type RegionGeometry} from './region-perspektive';

/** Use the same checked-in boundaries as the municipality maps. */
export async function districtGeometry(id:string) {
  if(!/^\d{5}$/.test(id))throw new Error('Invalid district identifier');
  try {
    const data=JSON.parse(await readFile(path.join(process.cwd(),'public','geo','gemeinden',`${id}.geo.json`),'utf8')) as {features:RegionGeometry[]};
    return projectRegions(data.features);
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
