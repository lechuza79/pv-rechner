import 'server-only';
import {liveWidgetDataUrl, validateLiveWidgetData} from './widget-data-services';
import {createHash} from 'node:crypto';
import {mkdir, readFile, rename, writeFile, unlink, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {serialize, deserialize} from 'node:v8';

export const usesLivePreviewData = () => process.env.NODE_ENV === 'development' && process.env.WIDGET_PREVIEW_DATA !== 'local';
const FRESH_MS = 5 * 60_000;
const MAX_AGE_MS = 24 * 60 * 60_000;
type Snapshot<T> = {version:1; fetchedAt:number; data:T};
const shared=globalThis as typeof globalThis & {widgetPreviewData?:{
  pending:Map<string,Promise<unknown>>;
  states:Map<string,{fetchedAt:number;stale:boolean}>;
  retryAfter?:Map<string,number>;
}};
const {pending,states}=shared.widgetPreviewData??= {pending:new Map(),states:new Map()};
const retryAfter=shared.widgetPreviewData!.retryAfter??=new Map<string,number>();
const directory = () => path.join(process.cwd(), '.cache/widget-preview-data');
const fileFor = (key:string) => path.join(directory(), createHash('sha256').update(key).digest('hex') + '.bin');

/** Local preview only. Store successful reads, not HTML, credentials or errors.
 * Existing source dates remain part of the payload; fetchedAt is retrieval time.
 * Production keeps its normal ISR/invalidation behavior.
 */
export async function previewData<T>(key:string, load:()=>Promise<T>):Promise<T> {
  if (!usesLivePreviewData()) return load();
  const filename = fileFor(key);
  let previous:Snapshot<T>|undefined;
  try {
    const candidate = deserialize(await readFile(filename)) as Snapshot<T>;
    if(candidate.version===1 && Number.isFinite(candidate.fetchedAt) && Date.now()-candidate.fetchedAt>=0 && Date.now()-candidate.fetchedAt<MAX_AGE_MS) previous=candidate;
  } catch { /* No valid previous snapshot. */ }
  if(previous && Date.now()-previous.fetchedAt<FRESH_MS){
    states.set(key,{fetchedAt:previous.fetchedAt,stale:false});
    return previous.data;
  }
  const refresh = async ():Promise<T> => {
    const existing=pending.get(key);
    if(existing)return existing as Promise<T>;
    const request=(async()=>{
      const data=await load();
      // An authoritative absence removes the old snapshot; failures throw instead.
      if(data!==null && data!==undefined){
        const snapshot:Snapshot<T>={version:1,fetchedAt:Date.now(),data};
        const bytes=serialize(snapshot);
        if(bytes.length<=8*1024*1024){
          try{
            await mkdir(directory(),{recursive:true});
            const temp=filename+'.'+process.pid+'.tmp';
            await writeFile(temp,bytes,{mode:0o600});
            await rename(temp,filename);
            // Bound the local disk cache; files are immutable successful reads.
            const names=(await readdir(directory())).filter(name=>name.endsWith('.bin'));
            if(names.length>128){
              const files=await Promise.all(names.map(async name=>({name,time:(await stat(path.join(directory(),name))).mtimeMs})));
              await Promise.all(files.sort((a,b)=>b.time-a.time).slice(128).map(file=>unlink(path.join(directory(),file.name))));
            }
          }catch { /* A read-only disk must not break live data. */ }
        }
        states.set(key,{fetchedAt:snapshot.fetchedAt,stale:false});
        if(states.size>128)states.delete(states.keys().next().value!);
      }else{
        states.delete(key);
        await unlink(filename).catch(()=>{});
      }
      return data;
    })();
    pending.set(key,request);
    try{const data=await request;retryAfter.delete(key);return data;}
    catch(error){retryAfter.set(key,Date.now()+30_000);if(retryAfter.size>128)retryAfter.delete(retryAfter.keys().next().value!);throw error;}
    finally{pending.delete(key);}
  };
  // Keep render fast during an outage; refresh once, outside the render path.
  if(previous){
    states.set(key,{fetchedAt:previous.fetchedAt,stale:true});
    if(Date.now()>=(retryAfter.get(key)??0))void refresh().catch(()=>{});
    return previous.data;
  }
  return refresh();
}

export function previewDataStatus(){
  const stale=[...states.values()].filter(value=>value.stale && Date.now()-value.fetchedAt<MAX_AGE_MS);
  return {stale:stale.length>0,fetchedAt:stale.length?new Date(Math.min(...stale.map(value=>value.fetchedAt))).toISOString():null};
}

class LiveDataError extends Error {
  constructor(readonly status: number) { super(`Live data unavailable (${status})`); }
}

export async function livePreviewJson(endpoint: string): Promise<Record<string, unknown>> {
  const url = liveWidgetDataUrl(endpoint);
  return previewData(`live-v2:${url.href}`, async () => {
    // Never forward local cookies, authorization, or arbitrary request headers.
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20_000), cache: 'no-store', redirect: 'error',
      credentials: 'omit', headers: {Accept: 'application/json'},
    });
    if (!response.ok) throw new LiveDataError(response.status);
    return validateLiveWidgetData(url, await response.json());
  });
}

/** Carry observation age across the server/browser cache boundary. */
export function livePreviewSnapshotState(endpoint:string){
  return states.get(`live-v2:${liveWidgetDataUrl(endpoint).href}`);
}

/** The shared GET boundary; writes and all production handlers stay local. */
export async function livePreviewResponse(request: Request): Promise<Response | null> {
  if (!usesLivePreviewData() || request.method !== 'GET') return null;
  const incoming = new URL(request.url);
  const endpoint = incoming.pathname + incoming.search;
  try { liveWidgetDataUrl(endpoint); }
  catch { return Response.json({error: 'Ungültige Datenanfrage.'}, {status: 400}); }
  const headers = {'Cache-Control': 'no-store', 'X-Widget-Data-Origin': 'https://solar-check.io'};
  try {
    const data=await livePreviewJson(endpoint);
    const state=livePreviewSnapshotState(endpoint);
    return Response.json(data, {headers:{...headers,...(state?{'X-Widget-Data-Fetched-At':String(state.fetchedAt),'X-Widget-Data-Stale':state.stale?'1':'0'}:{})}});
  }
  catch (error) {
    const status = error instanceof LiveDataError && [400, 404, 422, 429].includes(error.status) ? error.status : 503;
    return Response.json({error: 'Live-Daten gerade nicht verfügbar.'}, {status, headers});
  }
}
