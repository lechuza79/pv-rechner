import {NextRequest,NextResponse} from 'next/server';
import {unstable_cache} from 'next/cache';
import {getRegionById,getChildren} from '../../../../lib/atlas';
import {loadDistrictMonitor} from '../../../../lib/district-monitor-server';
import {gemeindeGeo} from '../../../../lib/atlas-geo';
import {shardKey} from '../../../../lib/icon-d2';
import {loadIconD2Shard} from '../../../../lib/icon-d2-store';
import {solarTagAusModell} from '../../../../lib/solar-tag-modell';
import {districtSolarCurve} from '../../../../lib/district-solar-curve';
import {berlinTagesgrenzen} from '../../../../lib/zeit';
import {rateLimit} from '../../../../lib/rate-limit';
import {ATLAS_DATEN_TAG} from '../../../../lib/atlas-revalidate-routen';

const load=unstable_cache(async(id:string,start:number,end:number)=>{
 const region=await getRegionById(id);
 if(!region||region.level!=='landkreis')return null;
 const towns=(await getChildren(region)).filter(t=>t.parent_region_id===id&&t.bezeichnung!=='Gemeindefreies Gebiet');
 const monitor=await loadDistrictMonitor(towns.map(t=>t.region_id),region.name);
 if(!monitor.sites?.length)return null;
 const locations=await Promise.all(monitor.sites.map(async site=>({...site,geo:await gemeindeGeo(site.ags)})));
 if(locations.some(s=>!s.geo||!Number.isFinite(s.geo.lat)||!Number.isFinite(s.geo.lon)))return null;
 const keys=[...new Set(locations.map(s=>shardKey(s.geo!.plz)))];
 const shards=new Map(await Promise.all(keys.map(async key=>[key,await loadIconD2Shard(key)] as const)));
 const points=districtSolarCurve(locations.map(s=>{const g=s.geo!,shard=shards.get(shardKey(g.plz));return {kwp:s.kwp,points:shard?solarTagAusModell(shard,g.plz,g.lat,g.lon,[start,end]):null};}));
 return points?{points,installedKwp:monitor.sites.reduce((sum,s)=>sum+s.kwp,0)}:null;
},['district-solar-day-v1'],{revalidate:300,tags:[ATLAS_DATEN_TAG]});
export async function GET(req:NextRequest){
 const limited=rateLimit(req,'landkreis-solartag');if(limited)return limited;
 const id=req.nextUrl.searchParams.get('ags')??'';
 if(!/^\d{5}$/.test(id))return NextResponse.json({error:'Ungültiger Landkreis'},{status:400});
 const result=await load(id,...berlinTagesgrenzen());
 return result?NextResponse.json(result,{headers:{'Cache-Control':'public, s-maxage=300'}}):NextResponse.json({error:'Vollständige Landkreis-Wetterdaten derzeit nicht verfügbar'},{status:503,headers:{'Cache-Control':'no-store'}});
}
