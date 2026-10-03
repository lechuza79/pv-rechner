import {NextRequest,NextResponse} from 'next/server';
import {ladeGemeindePaket} from '../../../../lib/gemeinde-paket-server';
import {rateLimit} from '../../../../lib/rate-limit';

/** Read the same public, prepared package used by municipal embeds. */
export async function GET(req:NextRequest){
 const limited=rateLimit(req,'kommunen-preview');if(limited)return limited;
 const ags=req.nextUrl.searchParams.get('ags')??'';
 if(!/^\d{8}$/.test(ags))return NextResponse.json({error:'Ungültiger Ort'},{status:400});
 try{
  const p=await ladeGemeindePaket(ags);
  if(!p)return NextResponse.json({error:'Ort nicht verfügbar'},{status:404});
  return NextResponse.json({ags:p.ags,name:p.name,stories:p.stories,widgetPlace:{ags:p.ags,name:p.name,districtId:p.kreis.ags,districtName:p.kreis.name,stateId:p.ags.slice(0,2),stateName:''}},{headers:{'Cache-Control':'public, s-maxage=3600, stale-while-revalidate=86400'}});
 }catch{return NextResponse.json({error:'Die Vorschau konnte nicht geladen werden.'},{status:503});}
}
