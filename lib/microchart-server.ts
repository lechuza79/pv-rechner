import 'server-only';
import {gemeindeWetterpunkt} from './atlas-geo';
import {loadIconD2Shard,loadSnapshotFile} from './icon-d2-store';
import {PARK_WIND_PATH,parkWindDay} from './park-wind-snapshot';
import type {IconD2Shard} from './icon-d2';
import {modelWeatherAt,shardKey} from './icon-d2';
import {solarTagAusModell} from './solar-tag-modell';
import {berlinTagesgrenzen} from './zeit';
import {supabase} from './supabase-server';
import {withDbTimeout} from './db-timeout';
import {solarPowerProfile,windPowerProfile} from './microchart-power';
import type {MicrochartData} from './microchart-data';
import {districtCapacity} from './microchart-capacity';

/** One location, model run and clock for the gallery and all microchart consumers. */
export async function loadMicrocharts(ags:string,place:string,now=new Date(),districtId?:string,position?:{latitude:number;longitude:number;parkKey?:string}):Promise<MicrochartData>{
 const at=now.toISOString(),bounds=berlinTagesgrenzen(now);
 const result:MicrochartData={place,at,until:new Date(bounds[1]).toISOString(),modelRun:null,solar:null,wind:null,conditions:null};
 const park=position?.parkKey?parkWindDay(await loadSnapshotFile<IconD2Shard>(PARK_WIND_PATH),position.parkKey,now):null;
 const applyPark=(capacity:number|null)=>{
  if(!park)return;
  result.conditions=park.current;result.wind=windPowerProfile(park.day,capacity,100);result.windPerKw=windPowerProfile(park.day,1,100);
  result.windSource='icon-d2';result.windModelRun=park.runInit;result.windHeightMetres=100;
 };
 applyPark(null);
 const location=await gemeindeWetterpunkt(ags);
 if(!location||!supabase)return result;
 result.postcode=location.plz;
 const stockQuery=districtId?supabase.from('mastr_gemeinde_award').select('region_id,solar_kwp,wind_kwp',{count:'exact'}).like('region_id',districtId+'%').range(0,999):supabase.from('mastr_gemeinde_award').select('region_id,solar_kwp,wind_kwp',{count:'exact'}).eq('region_id',ags).range(0,999);
 const [shard,stock]=await Promise.all([loadIconD2Shard(shardKey(location.plz),location.plz),withDbTimeout(stockQuery,'microchart capacity').catch(()=>null)]);


 const capacity=(key:'solar_kwp'|'wind_kwp')=>districtId?districtCapacity(stock?.error?null:stock?.data,districtId,key,stock?.count):stock?.error||stock?.data?.length!==1||stock.data[0][key]==null?null:Number(stock.data[0][key]);
 result.solarCapacityKw=capacity('solar_kwp');result.windCapacityKw=capacity('wind_kwp');
 applyPark(capacity('wind_kwp'));
 if(!shard)return result;
 const runAge=now.getTime()-Date.parse(shard.runInit);
 if(!Number.isFinite(runAge)||runAge< -60000||runAge>12*3600000)return result;
 result.modelRun=shard.runInit;
 const solar=solarTagAusModell(shard,location.plz,location.lat,location.lon,bounds);
 // Interpolate the existing quarter-hour model curve at the shared current time.
 const samples=solar?.map(p=>({time:p.time,value:p.powerPct}))??null;
 if(samples){
  const before=samples.filter(p=>Date.parse(p.time)<=now.getTime()).at(-1);
  const after=samples.find(p=>Date.parse(p.time)>=now.getTime());
  if(before&&after){const span=Date.parse(after.time)-Date.parse(before.time);samples.push({time:at,value:span?before.value+(after.value-before.value)*(now.getTime()-Date.parse(before.time))/span:before.value});}
 }
 const solarSamples=samples?.filter((p,i,a)=>a.findIndex(x=>x.time===p.time)===i).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time))??null;
 result.solar=solarPowerProfile(solarSamples,capacity('solar_kwp'));
 result.solarPerKw=solarPowerProfile(solarSamples,1);
 // Prepared parks use only their stored model file; unavailable parks stay null.
 if(position?.parkKey)return result;
 const windNow=modelWeatherAt(shard,location.plz,now,100);
 if(windNow?.windSpeed!=null&&windNow.windDirection!=null)result.conditions={speedMs:windNow.windSpeed,directionDeg:windNow.windDirection,validAt:at};
 const wind=[];
 for(let time=bounds[0];time<bounds[1];time+=900000){
  const speed=modelWeatherAt(shard,location.plz,new Date(time),100)?.windSpeed;
  if(speed==null){break;}
  wind.push({time:new Date(time).toISOString(),value:speed});
 }
 const expectedPoints=(bounds[1]-bounds[0])/900000;
 if(position||wind.length!==expectedPoints){
  if(position)result.conditions=null;
  return result;
 }
 if(windNow?.windSpeed!=null&&!wind.some(p=>p.time===at))wind.push({time:at,value:windNow.windSpeed});
 wind.sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
 result.windModelRun=shard.runInit;result.windHeightMetres=100;
 result.wind=windPowerProfile(wind,capacity('wind_kwp'),100);
 result.windPerKw=windPowerProfile(wind,1,100);
 return result;
}
