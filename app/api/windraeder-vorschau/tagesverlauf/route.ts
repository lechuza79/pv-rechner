import {NextRequest,NextResponse} from "next/server";
import {rateLimit} from "../../../../lib/rate-limit";
import {isWindWeatherTown} from "../../../../lib/wind-map";
import {loadPreviewDay} from "../../../../lib/wind-animation-server";
export async function GET(req:NextRequest){
 const limited=rateLimit(req,"weather-now");if(limited)return limited;
 const id=req.nextUrl.searchParams.get("gemeinde")??"";
 if(!isWindWeatherTown(id))return NextResponse.json({error:"Unknown preview municipality"},{status:400});
 const day=await loadPreviewDay(id);
 return NextResponse.json({day},{headers:{"Cache-Control":day?"private, max-age=60":"no-store"}});
}
