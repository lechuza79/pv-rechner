import "server-only";
import {readFile} from "node:fs/promises";
import path from "node:path";
import plz from "../public/plz.json";
import {polygons,type RegionGeometry} from "./region-perspektive";
import {loadIconD2Shard} from "./icon-d2-store";
import {modelWeatherAt,shardKey} from "./icon-d2";
import {usableWind,type WindConditions} from "./wind-animation";
import {windDay} from "./wind-day";
import {solarTagAusModell} from "./solar-tag-modell";
import {berlinTagesgrenzen} from "./zeit";
import {isWindWeatherTown} from "./wind-map";

/** One representative weather point for the municipality, using the existing weather store. */
export async function loadWindConditions(id:string):Promise<WindConditions|null>{
  if(!isWindWeatherTown(id))return null;
  try{
    const collection=JSON.parse(await readFile(path.join(process.cwd(),"public/geo/gemeinden",`${id.slice(0,5)}.geo.json`),"utf8"));
    const feature=collection.features.find((f:RegionGeometry)=>f.properties.id===id) as RegionGeometry;
    const points=polygons(feature).flat(2),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const lon=(Math.min(...xs)+Math.max(...xs))/2,lat=(Math.min(...ys)+Math.max(...ys))/2;
    const nearest=Object.entries(plz as unknown as Record<string,[number,number]>).reduce((a,b)=>{
      const distance=(p:typeof a)=>((p[1][0]-lat)**2+((p[1][1]-lon)*Math.cos(lat*Math.PI/180))**2);
      return distance(a)<distance(b)?a:b;
    });
    const shard=await loadIconD2Shard(shardKey(nearest[0]),nearest[0]).catch(()=>null);
    const now=new Date();
    const elevated=shard?modelWeatherAt(shard,nearest[0],now,100):null;
    const model=elevated?.windSpeed!=null&&elevated.windDirection!=null?elevated:shard?modelWeatherAt(shard,nearest[0],now):null;
    const primary:WindConditions|null=model?.windSpeed!=null&&model.windDirection!=null?
      {speedMs:model.windSpeed,directionDeg:model.windDirection,validAt:model.validAt,modelRun:model.runInit,postcode:nearest[0],heightMetres:model===elevated?100:10}:null;
    if(usableWind(primary))return primary;
    return null;
  }catch{return null;}
}

/** Complete local-day profiles; missing hours never become artificial zeroes. */
export async function loadPreviewDay(id:string){
  const current=await loadWindConditions(id);
  if(!current||current.source==="open-meteo")return null;
  const shard=await loadIconD2Shard(shardKey(current.postcode),current.postcode);
  if(!shard)return null;
  const [lat,lon]=(plz as unknown as Record<string,[number,number]>)[current.postcode];
  const bounds=berlinTagesgrenzen();
  const wind=windDay(shard,current.postcode,bounds);
  const solar=solarTagAusModell(shard,current.postcode,lat,lon,bounds);
  return {modelRun:shard.runInit,from:new Date(bounds[0]).toISOString(),until:new Date(bounds[1]).toISOString(),
    wind,
    solar:solar?.map(p=>({time:p.time,value:p.powerPct}))??null};
}
