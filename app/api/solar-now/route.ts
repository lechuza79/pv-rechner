import { NextRequest, NextResponse } from "next/server";
import { readSolarNow } from "../../../lib/solar-now-service";
import plzCoords from "../../../public/plz.json";
const COORDS = plzCoords as unknown as Record<string, [number, number]>;
export async function GET(req: NextRequest) {
  const plzParam = req.nextUrl.searchParams.get("plz");
  const plz = plzParam && /^\d{5}$/.test(plzParam) ? plzParam : null;
  if (plzParam && !plz) {
    return NextResponse.json({ error: "Invalid plz" }, { status: 400 });
  }
  const coords = plz ? COORDS[plz] : null;
  if (plz && !coords) {
    return NextResponse.json({ error: "Unknown plz" }, { status: 404 });
  }

  const data = await readSolarNow(plz);
  return data ? NextResponse.json(data, { headers: {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
  } }) : NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
