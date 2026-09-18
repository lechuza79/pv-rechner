import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase-server";
import { PLZ_BL } from "../../../lib/plz-bundesland";
import { DEFAULT_AIRCON_CONFIG as CFG } from "../../../lib/aircon-config";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "../../../lib/db-timeout";
import { nearestPlz } from "../../../lib/plz-nearest";
import kuehlgrad from "../../../lib/kuehlgrad.json";
import { rateLimit } from "../../../lib/rate-limit";

// Cooling-degree-hours for a location are climatology — effectively stationary.
// Cache hard on the CDN so repeat requests skip the function entirely.
const CDN_CACHE_LONG = "public, s-maxage=2592000, stale-while-revalidate=2592000"; // 30 days
const CDN_CACHE_FALLBACK = "public, s-maxage=86400, stale-while-revalidate=604800"; // 1 day


interface CdhModes {
  avg5: number;        // Ø der letzten N Sommer (ERA5, vorberechnet)
  lastSummer: number;  // letzter vollständiger Sommer (ERA5, vorberechnet)
  projection: number;  // Projektion ~20 Jahre (CMIP6, gespeichert; siehe projectionFor)
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

  const rLat = Math.round(lat * 100) / 100;
  const rLon = Math.round(lon * 100) / 100;
  const projection = await projectionFor(rLat, rLon, avg5);
  return NextResponse.json(
    { avg5, lastSummer, projection, source: "era5" },
    { headers: { "Cache-Control": CDN_CACHE_LONG } },
  );
}

/**
 * The ~20-year projection, without calling any weather service.
 *
 * The climate model's future (CMIP6 via the Open-Meteo climate API) is kept
 * per coordinate in klima_cache from earlier visits, next to the baseline it
 * was compared with then. That baseline came from another model (ERA5-Land,
 * measured 14–19 % below DWD stations), so the future value is carried over
 * as its ratio to that baseline and applied to ours — otherwise 7 % of places
 * would show LESS cooling in twenty years than today. Without a stored value:
 * the documented national factor.
 *
 * No new values are fetched: the climate API is licensed for non-commercial
 * use only, and its commercial plan is a decision still open.
 */
async function projectionFor(lat: number, lon: number, avg5: number): Promise<number> {
  const byFactor = Math.round(avg5 * CFG.projectionFactor);
  if (!supabase) return byFactor;
  try {
    const { data: cached } = await withDbTimeout(
      Promise.resolve(
        supabase.from("klima_cache").select("cdh_avg5, cdh_projection").eq("lat", lat).eq("lon", lon).maybeSingle(),
      ),
      "klima_cache projection",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (cached?.cdh_projection && cached.cdh_avg5) {
      return Math.round((cached.cdh_projection / cached.cdh_avg5) * avg5);
    }
  } catch {
    /* factor below */
  }
  return byFactor;
}
