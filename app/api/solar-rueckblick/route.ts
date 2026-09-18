import { NextRequest, NextResponse } from "next/server";
import { rueckblickFuerPlz } from "../../../lib/solar-rueckblick-server";

// Ten-year retrospective for one postcode, precomputed. The answer changes
// only when the preparation run changes it, so it is cached at the edge for a
// day. "Not yet available" is a 404 with its own message, never zero euros.

export async function GET(req: NextRequest) {
  const plz = req.nextUrl.searchParams.get("plz") ?? "";
  if (!/^\d{5}$/.test(plz)) return NextResponse.json({ error: "Invalid plz" }, { status: 400 });
  let ergebnis;
  try {
    ergebnis = await rueckblickFuerPlz(plz);
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
  if (!ergebnis) {
    return NextResponse.json({ error: "Not available for this postcode" }, { status: 404, headers: { "Cache-Control": "public, s-maxage=600" } });
  }
  return NextResponse.json(ergebnis, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
