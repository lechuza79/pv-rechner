import { NextRequest, NextResponse } from "next/server";
import plzCoords from "../../../public/plz.json";
import plzAgs from "../../../public/plz-ags.json";

// Coordinates of one postcode's centre (to place the sun) and its place name
// when the postcode belongs to exactly one municipality. Served from the bundled table, never a geocoder,
// so the answer is static and cached at the edge for a month.

const COORDS = plzCoords as unknown as Record<string, [number, number]>;
const ORTE = plzAgs as unknown as Record<string, { ort: string }[]>;

/** A place name only when the postcode belongs to exactly one municipality. */
function ortsname(plz: string): string | null {
  const orte = ORTE[plz];
  if (!orte || orte.length !== 1) return null;
  // The register appends the municipality type after a comma ("Freiburg im
  // Breisgau, Stadt", "Höchberg, M"); the place name is what comes before.
  return orte[0].ort.replace(/,.*$/, "").trim();
}

/** Nearest postcode centre to a point — for "use my location", on click only. */
function naechstePlz(lat: number, lon: number): string | null {
  let beste: string | null = null;
  let d = Infinity;
  const k = Math.cos((lat * Math.PI) / 180);
  for (const [plz, [a, b]] of Object.entries(COORDS)) {
    const x = (b - lon) * k;
    const y = a - lat;
    const e = x * x + y * y;
    if (e < d) { d = e; beste = plz; }
  }
  // Farther than ~30 km from any German postcode centre: not in Germany.
  return d < (30 / 111) ** 2 ? beste : null;
}

/**
 * "Use my location": the point travels in the request BODY, never in the URL —
 * a position in a query string ends up in access logs. Rounded to ~1 km by the
 * client, answered uncached, not stored.
 */
export async function POST(req: NextRequest) {
  let lat = NaN;
  let lon = NaN;
  try {
    const body = (await req.json()) as { lat?: unknown; lon?: unknown };
    lat = Number(body.lat);
    lon = Number(body.lon);
  } catch {
    // fall through to the validation below
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return NextResponse.json({ error: "Invalid point" }, { status: 400 });
  const naechste = naechstePlz(lat, lon);
  if (!naechste) return NextResponse.json({ error: "Outside Germany" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ plz: naechste }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: NextRequest) {
  const plz = req.nextUrl.searchParams.get("plz") ?? "";
  if (!/^\d{5}$/.test(plz)) return NextResponse.json({ error: "Invalid plz" }, { status: 400 });
  const c = COORDS[plz];
  if (!c) return NextResponse.json({ error: "Unknown plz" }, { status: 404 });
  return NextResponse.json(
    { plz, lat: c[0], lon: c[1], name: ortsname(plz) },
    { headers: { "Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=86400" } },
  );
}
