import { NextRequest, NextResponse } from "next/server";
import plzCoords from "../../public/plz.json";
import plzAgs from "../../public/plz-ags.json";
import { szeneWetter, type WeatherNow } from "../../lib/szene-wetter";

/**
 * Scene data for the homepage/simulation stage, in the exact shape the approved
 * page expects (it was served by the design package's local helper).
 *
 *   weather — our DWD live weather (/api/weather-now) mapped to the fields the
 *             stage validates. If ANY required field is missing, `weather` is
 *             left out: the stage then shows its "Wetterdaten fehlen" state
 *             instead of a sky nobody measured.
 *   power   — /api/solar-now, passed through unchanged.
 *
 * Both sources are our own, CDN-cached per postcode; nothing here calls a
 * third-party weather service.
 */

const COORDS = plzCoords as unknown as Record<string, [number, number]>;
const ORTE = plzAgs as unknown as Record<string, { ort: string }[]>;

function ortsname(plz: string): string {
  const orte = ORTE[plz];
  return orte && orte.length === 1 ? orte[0].ort.replace(/,.*$/, "").trim() : `PLZ ${plz}`;
}

export async function GET(req: NextRequest) {
  const plz = req.nextUrl.searchParams.get("plz") || "79098";
  const c = COORDS[plz];
  if (!/^\d{5}$/.test(plz) || !c) return NextResponse.json({ error: "Unknown postcode" }, { status: 400 });
  // Local review can read live weather from production (the hourly DWD
  // snapshots exist only there); ignored on Vercel.
  const basis = (!process.env.VERCEL && process.env.SZENE_DATEN_BASIS) || req.nextUrl.origin;
  const holen = (pfad: string) =>
    fetch(basis + pfad, { signal: AbortSignal.timeout(6000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [wetter, leistung] = await Promise.all([holen(`/api/weather-now?plz=${plz}`), holen(`/api/solar-now?plz=${plz}`)]);
  const body: Record<string, unknown> = {
    location: { name: ortsname(plz), lat: c[0], lon: c[1], plz },
    fetchedAt: Date.now(),
  };
  const w = szeneWetter((wetter as WeatherNow | null)?.weather);
  if (w) body.weather = w;
  else body.weatherError = "Quelle derzeit nicht erreichbar";
  if (leistung) body.power = leistung;
  else body.powerError = "Quelle derzeit nicht erreichbar";
  return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}
