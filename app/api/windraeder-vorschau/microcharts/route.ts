import stops from '../../../../public/geo/landscape-wind-stops.json';
import {NextRequest,NextResponse} from 'next/server';
import {loadMicrocharts} from '../../../../lib/microchart-server';
import {isWindWeatherTown} from '../../../../lib/wind-map';
import {rateLimit} from '../../../../lib/rate-limit';
export async function GET(req:NextRequest){
 const limited=rateLimit(req,'weather-now');if(limited)return limited;
 const id=req.nextUrl.searchParams.get('gemeinde')??'';
 if(!isWindWeatherTown(id))return NextResponse.json({error:'Unknown preview municipality'},{status:400});
 const district=req.nextUrl.searchParams.get('kreis')??undefined;
 if(district&&(!/^\d{5}$/.test(district)||!id.startsWith(district)))return NextResponse.json({error:'District does not contain weather municipality'},{status:400});
 const tour=req.nextUrl.searchParams.get('tour'),stop=req.nextUrl.searchParams.get('stop');
 const position=tour&&stop?(stops as Record<string,Record<string,{latitude:number;longitude:number}>>)[tour]?.[stop]:undefined;
 if((tour||stop)&&!position)return NextResponse.json({error:'Unknown prepared wind destination'},{status:400});
 const data=await loadMicrocharts(id,district??id,new Date(),district,position?{...position,parkKey:`${tour}:${stop}`}:undefined);
 return NextResponse.json({data},{headers:{'Cache-Control':'private, max-age=60'}});
}
