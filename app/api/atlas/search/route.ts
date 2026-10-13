import {searchAssociations} from '../../../../lib/verband-directory';
import {livePreviewResponse} from "../../../../lib/preview-data";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { searchRegions } from "../../../../lib/atlas";

// Namenssuche für das Karten-Autosuggest: q → passende Regionen (Bundesland,
// Kreis, Gemeinde) mit AGS + Ebene. Die Auswahl navigiert der Client über
// /api/atlas/goto?ags=… (der die Slug-Kette serverseitig auflöst). So bleibt die
// ~11.000-Zeilen-Slug-Tabelle auf dem Server.
//
// force-dynamic: liest je Query frisch aus der DB. Der CDN-Cache (s-maxage)
// federt Wiederholungen ab, der Client debounct zusätzlich.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const live = await livePreviewResponse(req);
  if (live) {
    // Preview data comes from production; include locally added directory entries.
    if (!live.ok || req.nextUrl.searchParams.has('level')) return live;
    const payload=await live.json();
    const groups=searchAssociations(req.nextUrl.searchParams.get('q')??'').map(group=>({region_id:group.id,name:group.name,label:'Verbandsgemeinde',parent_region_id:group.districtId}));
    const ids=new Set(groups.map(group=>group.region_id));
    return NextResponse.json({...payload,hits:[...groups,...(payload.hits??[]).filter((hit:{region_id:string})=>!ids.has(hit.region_id))].slice(0,8)},{headers:live.headers});
  }
  const limited = rateLimit(req, "atlas-search");
  if (limited) return limited;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ hits: [] });

  try {
    const level = req.nextUrl.searchParams.get("level");
    const hits = await searchRegions(q, undefined, level === "landkreis" ? ["landkreis"] : level === "bundesland" ? ["bundesland"] : undefined);
    return NextResponse.json(
      { hits },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json({ hits: [] }, { status: 200 });
  }
}
