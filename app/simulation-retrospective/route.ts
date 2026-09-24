import { NextRequest, NextResponse } from "next/server";
import { rueckblickFuerPlz } from "../../lib/solar-rueckblick-server";

// Ten-year retrospective in the shape the approved simulation page reads
// ({ pv, combined }); the numbers are precomputed per postcode
// (scripts/solar-rueckblick-vorbereiten.ts). Missing is 404, never zero.
export async function GET(req: NextRequest) {
  const plz = req.nextUrl.searchParams.get("plz") ?? "";
  if (!/^\d{5}$/.test(plz)) return NextResponse.json({ error: "Invalid plz" }, { status: 400 });
  let r;
  try {
    r = await rueckblickFuerPlz(plz);
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
  if (!r) return NextResponse.json({ error: "Not available" }, { status: 404, headers: { "Cache-Control": "public, s-maxage=600" } });
  return NextResponse.json(
    { plz, pv: r.vorteilOhneWp, combined: r.vorteilMitWp, from: 2016, to: 2025, source: r.wetterquelle },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
