import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../../../lib/rate-limit";
import { suche } from "../../../lib/suche";

// Site search for the header flyout. Pages come from code (no database); only a
// place lookup reads the database, with the soft budget, and a failure there is
// reported as such instead of as "no place found".
//
// The query is not logged and not forwarded anywhere.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "suche");
  if (limited) return limited;
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const ergebnis = await suche(q);
  return NextResponse.json(ergebnis, {
    headers: {
      // A failed place lookup must not stick in the CDN for five minutes.
      "Cache-Control": ergebnis.orteNichtVerfuegbar
        ? "no-store"
        : "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
