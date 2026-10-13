import {NextResponse} from 'next/server';
import {loadRegionalHourly} from '../../../lib/co2map-server';
export async function GET(){
 try{return NextResponse.json(await loadRegionalHourly(),{headers:{'Cache-Control':'public, s-maxage=900, stale-while-revalidate=900'}});}
 catch{return NextResponse.json({error:'Die stündlichen Regionaldaten sind derzeit nicht verfügbar.'},{status:503});}
}
