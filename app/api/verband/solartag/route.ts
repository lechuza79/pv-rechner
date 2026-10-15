import {NextRequest,NextResponse} from 'next/server';
import {unstable_cache} from 'next/cache';
import {readAssociationReference} from '../../../../lib/verband-reference-server';
import {isAssociationSlug,type AssociationSlug} from '../../../../lib/verband-reference';
import {loadDistrictMonitor} from '../../../../lib/district-monitor-server';
import {regionalSolarDay} from '../../../../lib/regional-solar-day';
import {berlinTagesgrenzen} from '../../../../lib/zeit';
import {rateLimit} from '../../../../lib/rate-limit';
import {ATLAS_DATEN_TAG,KREIS_PAKET_TAG} from '../../../../lib/atlas-revalidate-routen';

const load=unstable_cache(async(slug:AssociationSlug,start:number,end:number)=>{
 const association=await readAssociationReference(slug);
 if(!association)return null;
 const monitor=await loadDistrictMonitor(association.id,association.members,'');
 return monitor.sites?.length?regionalSolarDay(monitor.sites,start,end):null;
},['association-solar-day-v1'],{revalidate:300,tags:[ATLAS_DATEN_TAG,KREIS_PAKET_TAG]});

export async function GET(request:NextRequest){
 const limited=rateLimit(request,'verband-solartag');if(limited)return limited;
 const slug=request.nextUrl.searchParams.get('verband')??'';
 if(!isAssociationSlug(slug))return new NextResponse(null,{status:404});
 const result=await load(slug,...berlinTagesgrenzen());
 return result?NextResponse.json(result,{headers:{'Cache-Control':'public, s-maxage=300'}}):NextResponse.json({error:'Vollständige Wetterdaten derzeit nicht verfügbar'},{status:503,headers:{'Cache-Control':'no-store'}});
}
