/** Bounded park-only snapshot. Never replaces postcode weather files. */
import {mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {initWasm} from '@openmeteo/file-reader';
import {readWindow,readOrography} from './open-data-window';
import {ICON_D2_BASE,ICON_D2_CHUNK_HOURS,ICON_D2_GRID,ICON_D2_VARIABLES,type IconD2Shard,type IconD2Variable} from '../lib/icon-d2';
import {PARK_WIND_VARIABLES,parkWindCell,parkWindWindow,parkWindDay} from '../lib/park-wind-snapshot';
import {SEA_MARKER} from '../lib/regular-grid';
import stops from '../public/geo/landscape-wind-stops.json';
async function main(){
 await initWasm();
 const response=await fetch(ICON_D2_BASE+'static/meta.json',{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error(`Archive metadata: ${response.status}`);
 const meta=await response.json() as {data_end_time:number;last_run_initialisation_time:number};
 const now=new Date(),runInit=new Date(meta.last_run_initialisation_time*1000).toISOString();
 if(now.getTime()-Date.parse(runInit)>12*3600000||Date.parse(runInit)>now.getTime()+60000)throw new Error('Archive model run is stale or in the future');
 const {firstHour,hours}=parkWindWindow(now,meta.data_end_time);
 const shard:IconD2Shard={version:1,model:'dwd_icon_d2',runInit,generatedAt:now.toISOString(),firstHour:new Date(firstHour*3600000).toISOString(),hours,variables:[...PARK_WIND_VARIABLES],scale:{...ICON_D2_VARIABLES},points:{}};
 const tiles=new Map<string,{row:number;column:number;points:{key:string;row:number;column:number}[]}>();
 for(const [tour,parks] of Object.entries(stops))for(const [stop,position] of Object.entries(parks)){
  const cell=parkWindCell(position.latitude,position.longitude),row=Math.floor(cell.row/16)*16,column=Math.floor(cell.column/16)*16,key=`${row}:${column}`;
  if(!tiles.has(key))tiles.set(key,{row,column,points:[]});
  tiles.get(key)!.points.push({key:`${tour}:${stop}`,...cell});
 }
 const tasks=[...tiles.values()];let cursor=0;
 await Promise.all(Array.from({length:2},async()=>{while(cursor<tasks.length){
  const tile=tasks[cursor++],window={rowFrom:tile.row,rowTo:Math.min(tile.row+16,ICON_D2_GRID.ny),columnFrom:tile.column,columnTo:Math.min(tile.column+16,ICON_D2_GRID.nx)},width=window.columnTo-window.columnFrom;
  const orography=await readOrography(ICON_D2_BASE,window,SEA_MARKER);
  const values=new Map<IconD2Variable,Float32Array>();
  for(const variable of PARK_WIND_VARIABLES)values.set(variable,await readWindow({base:ICON_D2_BASE,variable,chunkHours:ICON_D2_CHUNK_HOURS,window,firstHour,hours}));
  for(const point of tile.points){
   const index=(point.row-tile.row)*width+point.column-tile.column;
   const series=PARK_WIND_VARIABLES.map(variable=>Array.from({length:hours},(_,h)=>{const raw=values.get(variable)![index*hours+h];return Number.isFinite(raw)?Math.round(raw*ICON_D2_VARIABLES[variable]):null;}));
   if(series.some(s=>s.some(v=>v===null)))throw new Error(`Incomplete park wind: ${point.key}`);
   shard.points[point.key]={cell:[ICON_D2_GRID.latMin+point.row*ICON_D2_GRID.dy,ICON_D2_GRID.lonMin+point.column*ICON_D2_GRID.dx],elevation:orography(point.row,point.column),values:series};
  }
  console.log(`Read tile ${tile.row}:${tile.column} (${tile.points.length} parks)`);
 }}));
 for(const key of Object.keys(shard.points))if(!parkWindDay(shard,key,now))throw new Error(`Invalid complete-day weather: ${key}`);
 const json=JSON.stringify(shard);
 if(process.argv.includes('--lokal')){const dir='scripts/.cache/icon-d2';mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/park-wind.json.tmp`,json);renameSync(`${dir}/park-wind.json.tmp`,`${dir}/park-wind.json`);}
 else{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL;
  const publicKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,key=process.env.PARK_WEATHER_UPLOAD_KEY;
  if(!url||!publicKey||!key)throw new Error('Restricted weather upload credentials missing');
  const result=await fetch(`${url}/rest/v1/rpc/upload_park_weather`,{
   method:'POST',signal:AbortSignal.timeout(30000),
   headers:{apikey:publicKey,Authorization:`Bearer ${publicKey}`,'Content-Type':'application/json'},
   body:JSON.stringify({p_key:key,p_payload:shard}),
  });
  if(!result.ok)throw new Error(`Weather upload failed: HTTP ${result.status}`);
 }
 console.log(`${Object.keys(shard.points).length} parks; ${tasks.length} bounded tiles; ${hours} hours; ${json.length} bytes; model ${runInit}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
