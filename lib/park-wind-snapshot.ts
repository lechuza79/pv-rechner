import {ICON_D2_GRID, SNAPSHOT_HOURS_AFTER, SNAPSHOT_HOURS_BEFORE, lastModelHour, modelWeatherAt, type IconD2Shard} from './icon-d2';
import {gridRow,gridColumn} from './regular-grid';
import {berlinTagesgrenzen} from './zeit';
export const PARK_WIND_PATH='icon-d2/park-wind.json';
export const PARK_WIND_VARIABLES=['wind_u_component_80m','wind_v_component_80m','wind_u_component_120m','wind_v_component_120m'] as const;
export function parkWindWindow(now:Date,dataEnd:number){
 const current=Math.floor(now.getTime()/3600000),[start,end]=berlinTagesgrenzen(now);
 const [,reach]=berlinTagesgrenzen(new Date((current+SNAPSHOT_HOURS_AFTER)*3600000));
 const [,tomorrow]=berlinTagesgrenzen(new Date(end+12*3600000));
 const required=Math.max(current+SNAPSHOT_HOURS_AFTER,reach/3600000),available=lastModelHour(dataEnd);
 if(required>available)throw new Error('Archive does not cover the complete required day');
 const firstHour=Math.min(current-SNAPSHOT_HOURS_BEFORE,start/3600000);
 return {firstHour,hours:Math.max(required,Math.min(tomorrow/3600000,available))-firstHour+1};
}
export function parkWindCell(latitude:number,longitude:number){
 const row=gridRow(ICON_D2_GRID,latitude),column=gridColumn(ICON_D2_GRID,longitude);
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||row<0||row>=ICON_D2_GRID.ny||column<0||column>=ICON_D2_GRID.nx)throw new Error('Park outside model grid');
 return {row,column};
}
/** Missing fields remain unavailable; zero wind is a measured value. */
export function parkWindDay(shard:IconD2Shard|null,key:string,now:Date){
 if(!shard||shard.version!==1||shard.model!=='dwd_icon_d2'||!Array.isArray(shard.variables)||!shard.points?.[key]||!Array.isArray(shard.points[key].values)||!Number.isFinite(shard.hours)||shard.hours<2||!Number.isFinite(Date.parse(shard.firstHour)))return null;
 for(const variable of PARK_WIND_VARIABLES){
  const index=shard.variables.indexOf(variable),series=shard.points[key].values[index];
  if(index<0||!Number.isFinite(shard.scale?.[variable])||shard.scale[variable]<=0||!Array.isArray(series)||series.length!==shard.hours)return null;
 }
 const ahead=modelWeatherAt(shard,key,new Date(now.getTime()+SNAPSHOT_HOURS_AFTER*3600000),100);
 if(ahead?.windSpeed==null||!Number.isFinite(ahead.windSpeed))return null;
 const age=now.getTime()-Date.parse(shard.runInit),generated=now.getTime()-Date.parse(shard.generatedAt);
 if(!Number.isFinite(age)||age< -60000||age>12*3600000||!Number.isFinite(generated)||generated< -60000||generated>12*3600000)return null;
 const current=modelWeatherAt(shard,key,now,100);
 if(current?.windSpeed==null||current.windDirection==null||!Number.isFinite(current.windSpeed)||!Number.isFinite(current.windDirection))return null;
 const bounds=berlinTagesgrenzen(now),day=[];
 for(let time=bounds[0];time<bounds[1];time+=900000){
  const speed=modelWeatherAt(shard,key,new Date(time),100)?.windSpeed;
  if(speed==null||!Number.isFinite(speed))return null;
  day.push({time:new Date(time).toISOString(),value:speed});
 }
 if(!day.some(p=>p.time===now.toISOString()))day.push({time:now.toISOString(),value:current.windSpeed});
 day.sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
 return {day,current:{speedMs:current.windSpeed,directionDeg:current.windDirection,validAt:now.toISOString()},runInit:shard.runInit};
}
