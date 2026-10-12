import {NextRequest,NextResponse} from 'next/server';
import {loadRegionalRace} from '../../../../lib/regional-race-server';
import {parseRaceSettings} from '../../../../lib/race-settings';
export async function GET(request:NextRequest){
 const query=Object.fromEntries(request.nextUrl.searchParams);
 if(!/^(de|\d{2}|\d{5})$/.test(query.region??''))return NextResponse.json({error:'Ungültige Vergleichsebene'},{status:400});
 const race=await loadRegionalRace(query.region,parseRaceSettings(query));
 if(!race)return NextResponse.json({error:'Keine Vergleichsdaten verfügbar'},{status:404});
 return NextResponse.json({rows:race.rows.map(({id,name,value})=>({id,name,value}))});
}
