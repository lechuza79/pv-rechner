import {gemeindeWetterpunkt} from './atlas-geo';
import {shardKey} from './icon-d2';
import {loadIconD2Shard} from './icon-d2-store';
import {solarTagAusModell} from './solar-tag-modell';
import {districtSolarCurve} from './district-solar-curve';

import type {DistrictSite} from './district-package';

/** Shared weather aggregation for a validated, complete set of member sites. */
export async function regionalSolarDay(sites:DistrictSite[],start:number,end:number){
 const locations=await Promise.all(sites.map(async site=>({...site,geo:await gemeindeWetterpunkt(site.ags)})));
 if(locations.some(s=>!s.geo||!Number.isFinite(s.geo.lat)||!Number.isFinite(s.geo.lon)))return null;
 const keys=[...new Set(locations.map(s=>shardKey(s.geo!.plz)))];
 const shards=new Map(await Promise.all(keys.map(async key=>[key,await loadIconD2Shard(key)] as const)));
 const points=districtSolarCurve(locations.map(s=>{const g=s.geo!,shard=shards.get(shardKey(g.plz));return {kwp:s.kwp,points:shard?solarTagAusModell(shard,g.plz,g.lat,g.lon,[start,end]):null};}));
 return points?{points,installedKwp:sites.reduce((sum,s)=>sum+s.kwp,0)}:null;
}
