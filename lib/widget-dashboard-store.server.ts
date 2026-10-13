import 'server-only';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {parseDashboardConfiguration,type DashboardConfiguration} from './widget-dashboard';
import {supabase} from './supabase-server';
const validId=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
// A built local preview must never write test dashboards into production storage.
const local=()=>!process.env.VERCEL&&(process.env.NODE_ENV==='development'||process.env.WIDGET_PREVIEW_DATA==='live');
const directory=()=>join(process.cwd(),'scripts/.cache/widget-dashboards');
/** Immutable saved versions: existing partner links never change when an admin saves again. */
export async function saveWidgetDashboard(value:DashboardConfiguration){
 const configuration=parseDashboardConfiguration(JSON.stringify(value));
 const id=randomUUID();
 if(local()){
  await mkdir(directory(),{recursive:true});
  await writeFile(join(directory(),id+'.json'),JSON.stringify(configuration),{flag:'wx',mode:0o600});
 }else{
  if(!supabase)throw new Error('Dashboard storage unavailable');
  const {error}=await supabase.from('widget_dashboards').insert({id,configuration});
  if(error)throw new Error('Dashboard storage unavailable');
 }
 return id;
}
export async function loadWidgetDashboard(id:string):Promise<DashboardConfiguration|null>{
 if(!validId(id))return null;
 if(local()){
  try{return parseDashboardConfiguration(await readFile(join(directory(),id+'.json'),'utf8'));}
  catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
 }
 if(!supabase)throw new Error('Dashboard storage unavailable');
 const {data,error}=await supabase.from('widget_dashboards').select('configuration').eq('id',id).maybeSingle();
 if(error)throw new Error('Dashboard storage unavailable');
 return data?parseDashboardConfiguration(JSON.stringify(data.configuration)):null;
}
