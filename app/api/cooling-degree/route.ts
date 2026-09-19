import { NextRequest, NextResponse } from "next/server";
import { PLZ_BL } from "../../../lib/plz-bundesland";
import { DEFAULT_AIRCON_CONFIG as CFG } from "../../../lib/aircon-config";
import { nearestPlz } from "../../../lib/plz-nearest";
import kuehlgrad from "../../../lib/kuehlgrad.json";
import { klimaProjektionFaktor } from "../../../lib/klima-projektion";
import { rateLimit } from "../../../lib/rate-limit";

// Cooling-degree-hours for a location are climatology — effectively stationary.
// Cache hard on the CDN so repeat requests skip the function entirely.
const CDN_CACHE_LONG = "public, s-maxage=2592000, stale-while-revalidate=2592000"; // 30 days
const CDN_CACHE_FALLBACK = "public, s-maxage=86400, stale-while-revalidate=604800"; // 1 day


interface CdhModes {
  avg5: number;        // Ø der letzten N Sommer (ERA5, vorberechnet)
  lastSummer: number;  // letzter vollständiger Sommer (ERA5, vorberechnet)
  projection: number;  // Projektion ~20 Jahre (acht CMIP6-Modelle, vorberechnet; siehe projectionFor)
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "cooling-degree");
  if (limited) return limited;

  // Die akute Hitzewellen-Vorhersage hat eine eigene Route (/api/heatwave).
  // Grund: Sie darf nicht dieselbe 30-Tage-Haltbarkeit erben wie die
  // Klimatologie hier — sonst steht eine einen Monat alte Vorhersage als
  // "nächste 16 Tage" auf der Seite. Ausführlich dort im Kopfkommentar.

  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");
  const plzPrefix = req.nextUrl.searchParams.get("plzPrefix") || "";
  const bl = PLZ_BL[plzPrefix] || null;
  const base = (bl && CFG.cdhByBundesland[bl]) || CFG.cdhNational;
  const fallback: CdhModes = {
    avg5: base,
    lastSummer: Math.round(base * CFG.lastSummerFactor),
    projection: Math.round(base * CFG.projectionFactor),
  };

  // Sofort-Fallback ohne gültige Koordinaten
  if (isNaN(lat) || isNaN(lon) || lat < 47 || lat > 55 || lon < 5 || lon > 16) {
    return NextResponse.json(
      { ...fallback, source: "fallback" },
      { headers: { "Cache-Control": CDN_CACHE_FALLBACK } },
    );
  }

  // The past: computed once a year from our own ERA5 archive for every
  // postcode (scripts/kuehlgrad-build.ts), answered for the nearest one.
  const plz = nearestPlz(lat, lon);
  const own = plz ? (kuehlgrad as unknown as { points: Record<string, [number, number]> }).points[plz] : undefined;
  if (!own) {
    return NextResponse.json(
      { ...fallback, source: "fallback" },
      { headers: { "Cache-Control": CDN_CACHE_FALLBACK } },
    );
  }
  const [avg5, lastSummer] = own;

  const projection = projectionFor(lat, lon, avg5);
  return NextResponse.json(
    { avg5, lastSummer, projection, source: "era5" },
    { headers: { "Cache-Control": CDN_CACHE_LONG } },
  );
}

/**
 * The ~20-year projection: our own value of today times the change the climate
 * models expect for this 0.25° cell (lib/klima-projektion.ts, eight CMIP6
 * models from NASA NEX-GDDP-CMIP6, each compared with itself). No weather
 * service is asked and no stored third-party value is read — until 18.09.2026
 * this reused values from the Open-Meteo climate API, which is licensed for
 * non-commercial use only. Outside the grid: the documented national factor.
 */
function projectionFor(lat: number, lon: number, avg5: number): number {
  const cell = klimaProjektionFaktor(lat, lon);
  return Math.round(avg5 * (cell?.factor ?? CFG.projectionFactor));
}
