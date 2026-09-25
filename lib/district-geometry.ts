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
