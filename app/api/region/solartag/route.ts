import {NextRequest,NextResponse} from 'next/server';
import {loadSnapshotFile} from '../../../../lib/icon-d2-store';
import {REGION_SOLAR_DAY_PATH,regionToday,type RegionSolarDayFile} from '../../../../lib/region-solar-day';
import {heuteInBerlin} from '../../../../lib/zeit';
import {rateLimit} from '../../../../lib/rate-limit';

/**
 * Today's solar curve for a Bundesland ("01"…"16") or Deutschland ("de").
 * Same response shape as /api/landkreis/solartag ({points, installedKwp}), so
 * the shared current-power widget reads it unchanged. Reads ONE precomputed
 * file (lib/region-solar-day.ts), never the towns' weather; only today's German
 * date is served — a curve of another day answers 503, not as today.
 */
export async function GET(req:NextRequest){
 const limited=rateLimit(req,'region-solartag');if(limited)return limited;
 const id=req.nextUrl.searchParams.get('ags')??'';
 if(!/^(0[1-9]|1[0-6]|de)$/.test(id))return NextResponse.json({error:'Ungültige Region'},{status:400});
 const file=await loadSnapshotFile<RegionSolarDayFile>(REGION_SOLAR_DAY_PATH);
 const r=regionToday(file,id,heuteInBerlin());
 if(!r.ok)return NextResponse.json({error:'Vollständige Wetterdaten für diese Region derzeit nicht verfügbar',reason:r.reason},{status:503,headers:{'Cache-Control':'no-store'}});
 return NextResponse.json({points:r.points,installedKwp:r.installedKwp,towns:r.towns,day:r.day,runInit:r.runInit},{headers:{'Cache-Control':'public, s-maxage=300'}});
}
