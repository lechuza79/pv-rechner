import 'server-only';
import {computeNuclearImport,type NuclearImportResponse} from './nuclear-import';
import {usesLivePreviewData,livePreviewJson} from './preview-data';
/** One real-data loader for the embed and visual reference. */
export async function nuclearPreviewData(now=new Date()):Promise<NuclearImportResponse|null> {
 try {return usesLivePreviewData()?await livePreviewJson('/api/energy/nuclear-import?hours=168') as unknown as NuclearImportResponse:await computeNuclearImport(new Date(now.getTime()-168*3600000).toISOString(),now.toISOString(),168);} catch {return null;}
}

/** Fetch raw intervals in short ranges so the source adapter never downsamples them. */
export async function nuclearEnergyPreviewData(now=new Date()):Promise<NuclearImportResponse|null> {
 if (usesLivePreviewData()) {
  // Two overlapping calendar windows stay below the live service's hourly
  // downsampling threshold. Daily energy still uses raw quarter-hour values.
  const day=(offset:number)=>new Date(now.getTime()-offset*86400000).toISOString().slice(0,10);
  try {
   const parts=await Promise.all([
    livePreviewJson(`/api/energy/nuclear-import?start=${day(9)}&end=${day(5)}`),
    livePreviewJson(`/api/energy/nuclear-import?start=${day(5)}&end=${day(0)}`),
   ]) as unknown as NuclearImportResponse[];
   const data=[...new Map(parts.flatMap(part=>part.data).map(point=>[point.ts,point])).values()].sort((a,b)=>a.ts.localeCompare(b.ts));
   return {...parts[1],data};
  } catch { return null; }
 }
 const {previewData}=await import('./preview-data');
 const end=now.toISOString();
 const middle=new Date(now.getTime()-108*3600000).toISOString();
 const start=new Date(now.getTime()-216*3600000).toISOString();
 try {return await previewData('nuclear-energy-raw-216h',async()=>{
  const parts=await Promise.all([computeNuclearImport(start,middle,108),computeNuclearImport(middle,end,108)]);
  const data=[...new Map(parts.flatMap(part=>part.data).map(point=>[point.ts,point])).values()].sort((a,b)=>a.ts.localeCompare(b.ts));
  return {...parts[1],data};
 });}catch{return nuclearPreviewData(now);}
}
