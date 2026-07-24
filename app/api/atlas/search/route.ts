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
  const limited = rateLimit(req, "atlas-search");
  if (limited) return limited;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ hits: [] });

  try {
    const hits = await searchRegions(q);
    return NextResponse.json(
      { hits },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json({ hits: [] }, { status: 200 });
  }
}
