import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { ortVorschlaege } from "../../../../lib/suche";

// Type-ahead for the place fields in the "Vor Ort" menu (town and Landkreis).
// The query is not logged and not forwarded anywhere.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "suche");
  if (limited) return limited;
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const ebene = req.nextUrl.searchParams.get("ebene") === "kreis" ? "kreis" : "ort";
  try {
    const orte = await ortVorschlaege(q, ebene);
    return NextResponse.json({ q, orte }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch {
    // A failed lookup must not stick in the CDN, and must not read as "nothing found".
    return NextResponse.json({ q, orte: [], nichtVerfuegbar: true }, { headers: { "Cache-Control": "no-store" } });
  }
}
