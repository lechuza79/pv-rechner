import {NextResponse} from 'next/server';
import {loadStateElectricity} from '../../../../lib/state-electricity-server';
import {jahrInBerlin} from '../../../../lib/zeit';
export async function GET(_request:Request,{params}:{params:Promise<{year:string}>}) {
 const {year}=await params;
 if(!/^\d{4}$/.test(year)||Number(year)<2015||Number(year)>jahrInBerlin())return NextResponse.json({error:'Ungültiges Jahr'},{status:400});
 try{return NextResponse.json(await loadStateElectricity(Number(year)),{headers:{'Cache-Control':'public, s-maxage=21600, stale-while-revalidate=86400'}});}
 catch{return NextResponse.json({error:'Die Bundeslanddaten sind gerade nicht verfügbar.'},{status:503});}
}
