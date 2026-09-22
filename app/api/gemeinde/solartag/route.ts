import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { shardKey } from "../../../../lib/icon-d2";
import { loadIconD2Shard } from "../../../../lib/icon-d2-store";
import { solarTagAusModell } from "../../../../lib/solar-tag-modell";
import { berlinTagesgrenzen } from "../../../../lib/zeit";
import plzCoords from "../../../../public/plz.json";

/**
 * Today's modelled solar curve for the municipality page's energy monitor.
 *
 * Its own route, not part of /scene-data: the scene's value is "now" and the
 * curve is "today" — two answers with different lifetimes do not share one
 * response. Reads only our hourly snapshot; no weather service per visitor.
 */
const COORDS = plzCoords as unknown as Record<string, [number, number]>;

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "gemeinde-solartag");
  if (limited) return limited;
  const plz = req.nextUrl.searchParams.get("plz") ?? "";
  const coords = /^\d{5}$/.test(plz) ? COORDS[plz] : null;
  if (!coords) return NextResponse.json({ error: "Unbekannte Postleitzahl" }, { status: 400 });
  const shard = await loadIconD2Shard(shardKey(plz));
  const points = shard ? solarTagAusModell(shard, plz, coords[0], coords[1], berlinTagesgrenzen()) : null;
  if (!points) {
    return NextResponse.json({ error: "Wetterdaten für heute unvollständig" }, { status: 503, headers: { "Cache-Control": "public, s-maxage=60" } });
  }
  return NextResponse.json({ points }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
}
