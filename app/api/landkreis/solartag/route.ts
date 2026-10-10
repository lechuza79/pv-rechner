import {NextRequest,NextResponse} from 'next/server';
import {unstable_cache} from 'next/cache';
import {getRegionById,getChildren} from '../../../../lib/atlas';
import {loadDistrictMonitor} from '../../../../lib/district-monitor-server';
import {isDistrictMember} from '../../../../lib/district-package';
import {regionalSolarDay} from '../../../../lib/regional-solar-day';
import {berlinTagesgrenzen} from '../../../../lib/zeit';
import {rateLimit} from '../../../../lib/rate-limit';
import {ATLAS_DATEN_TAG,KREIS_PAKET_TAG} from '../../../../lib/atlas-revalidate-routen';

const load=unstable_cache(async(id:string,start:number,end:number)=>{
 const region=await getRegionById(id);
 if(!region||region.level!=='landkreis')return null;
 const towns=(await getChildren(region)).filter(t=>isDistrictMember(t,id));
 // Only the site list is used here; its edition label does not matter.
 const monitor=await loadDistrictMonitor(id,towns.map(t=>t.region_id),'');
 if(!monitor.sites?.length)return null;
 return regionalSolarDay(monitor.sites,start,end);
},['district-solar-day-v3'],{revalidate:300,tags:[ATLAS_DATEN_TAG,KREIS_PAKET_TAG]});
export async function GET(req:NextRequest){
 const limited=rateLimit(req,'landkreis-solartag');if(limited)return limited;
 const id=req.nextUrl.searchParams.get('ags')??'';
 if(!/^\d{5}$/.test(id))return NextResponse.json({error:'Ungültiger Landkreis'},{status:400});
 const result=await load(id,...berlinTagesgrenzen());
 return result?NextResponse.json(result,{headers:{'Cache-Control':'public, s-maxage=300'}}):NextResponse.json({error:'Vollständige Landkreis-Wetterdaten derzeit nicht verfügbar'},{status:503,headers:{'Cache-Control':'no-store'}});
}
