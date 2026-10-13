import {NextRequest,NextResponse} from 'next/server';
import {unstable_cache} from 'next/cache';
import {fetchCrossBorderFlows} from '../../../../lib/energy-api';
import {latestPhysicalFlows} from '../../../../lib/physical-flows';
import {rateLimit} from '../../../../lib/rate-limit';
const load=unstable_cache(async()=>{
 const end=new Date(),start=new Date(end.getTime()-48*3600000);
 const rows=await fetchCrossBorderFlows('de',start.toISOString(),end.toISOString());
 const snapshot=latestPhysicalFlows(rows);
 if(!snapshot)throw new Error('No complete German physical border snapshot');
 return {snapshot,retrievedAt:new Date().toISOString()};
},['german-physical-flows-v1'],{revalidate:300});
export async function GET(req:NextRequest){
 const limited=rateLimit(req,'physical-flows');if(limited)return limited;
 try{return NextResponse.json(await load());}catch{return NextResponse.json({snapshot:null,error:'Physikalische Grenzflüsse sind gerade nicht vollständig verfügbar.'},{status:503});}
}
