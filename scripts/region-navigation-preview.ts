/** Read-only local preview: add child summaries to a copy of a published package. Never upload. */
import {loadEnvConfig} from '@next/env';
import {brotliDecompressSync} from 'node:zlib';
import {mkdir,writeFile} from 'node:fs/promises';
import {regionNavigationEnergy} from '../lib/region-navigation-energy';
import type {EnergyPacket} from '../lib/district-energy';
loadEnvConfig(process.cwd());
async function main(){
 const id=process.argv[2],dir=process.argv[3];
 if(!/^(de|\d{2}|\d{5})$/.test(id??'')||!dir)throw Error('Pass region ID and local output directory');
 const origin=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;
 if(!origin||!key)throw Error('Storage credentials unavailable');
 const headers={apikey:key,Authorization:`Bearer ${key}`};
 const read=async(path:string)=>{const r=await fetch(`${origin}/storage/v1/object/gemeinde-pakete/${path}`,{headers});if(!r.ok)throw Error(`Storage read failed: ${r.status}`);const b=Buffer.from(await r.arrayBuffer());return JSON.parse((path.endsWith('.br')?brotliDecompressSync(b):b).toString('utf8'));};
 const manifest=await read('kreise/v1/aktuell.json'),kind=id.length===5?'district':'region';
 const entry=kind==='district'?manifest.districts[id]:manifest.regions?.[id];
 if(!entry)throw Error('Published parent package unavailable');
 const pkg=await read(entry.path),ids:string[]=kind==='district'?pkg.members:pkg.parts,parts:(EnergyPacket|null)[]=[];
 // Sequential bounded reads: this is a one-off preview, not a page-request fallback.
 for(const child of ids){
  if(kind==='district'){parts.push(await read(`${child}.json.br`));continue;}
  const partEntry=id==='de'?manifest.regions?.[child]:manifest.districts[child];
  if(partEntry){const p=await read(partEntry.path);if(p.missing.length||p.editions.length!==1){parts.push(null);continue;}parts.push({ags:child,registerStand:p.editions[0],monitorHistory:null,monitorPeriods:p.content.monitor.energy,aggregate:true});continue;}
  const r=await fetch(`${origin}/rest/v1/mastr_regions?parent_region_id=eq.${child}&level=eq.gemeinde&select=region_id`,{headers});
  if(!r.ok)throw Error(`Register read failed: ${r.status}`);
  const children=await r.json();if(children.length!==1)throw Error('Independent city membership is ambiguous');
  const town=await read(`${children[0].region_id}.json.br`);parts.push({...town,ags:child});
 }
 const empty:string[]=kind==='district'?(pkg.empty??[]):(pkg.excluded??[]);
 const allIds=kind==='district'?ids:[...ids,...empty];
 const allParts=kind==='district'?parts:[...parts,...empty.map(()=>null)];
 pkg.content.childEnergy=regionNavigationEnergy(allIds,allParts,pkg.content.monitor.energy,new Set(empty));
 await mkdir(dir,{recursive:true});await writeFile(`${dir}/${kind}-${id}.json`,JSON.stringify(pkg));
 console.log({region:id,month:pkg.content.childEnergy?.month??null,children:pkg.content.childEnergy?.values.length??0,totalMwh:pkg.content.childEnergy?.totalMwh??null,sourceGeneration:manifest.generation,localOnly:true});
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
