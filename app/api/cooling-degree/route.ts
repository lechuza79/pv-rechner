import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase-server";
import { PLZ_BL } from "../../../lib/plz-bundesland";
import { DEFAULT_AIRCON_CONFIG as CFG } from "../../../lib/aircon-config";
import { cdhFromHourly, cdhFromDailyMinMax } from "../../../lib/aircon";
import { rateLimit } from "../../../lib/rate-limit";

// Cooling-degree-hours for a location are climatology — effectively stationary.
// Cache hard on the CDN so repeat requests skip the function entirely.
const CDN_CACHE_LONG = "public, s-maxage=2592000, stale-while-revalidate=2592000"; // 30 days
const CDN_CACHE_FALLBACK = "public, s-maxage=86400, stale-while-revalidate=604800"; // 1 day
const CLIMATE_MAX_YEAR = 2050; // Open-Meteo Climate API endet 2050

const BASE = CFG.coolBaseTemp;

interface CdhModes {
  avg5: number;        // Ø der letzten N Sommer (Wetterarchiv)
  lastSummer: number;  // letzter vollständiger Sommer
  projection: number;  // Projektion ~20 Jahre (CMIP6 Climate API)
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "cooling-degree");
  if (limited) return limited;

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
      { ...fallback, source: "fallback", heatwave: null },
      { headers: { "Cache-Control": CDN_CACHE_FALLBACK } },
    );
  }

  const rLat = Math.round(lat * 100) / 100;
  const rLon = Math.round(lon * 100) / 100;

  // Akuter Hitzewellen-Blick (16-Tage-Vorhersage) — inherent live, separat geholt.
  const heatwave = await fetchHeatwave(rLat, rLon);

  // Cache prüfen (alle drei Modi). Fehlt die Tabelle/Spalten → still recompute.
  if (supabase) {
    const { data: cached } = await supabase
      .from("klima_cache")
      .select("cdh_avg5, cdh_last_summer, cdh_projection")
      .eq("lat", rLat)
      .eq("lon", rLon)
      .maybeSingle();
    if (cached?.cdh_avg5) {
      return NextResponse.json(
        { avg5: cached.cdh_avg5, lastSummer: cached.cdh_last_summer, projection: cached.cdh_projection, source: "cache", heatwave },
        { headers: { "Cache-Control": CDN_CACHE_LONG } },
      );
    }
  }

  try {
    const thisYear = new Date().getFullYear();
    // Historie: letzte N vollständige Sommer (Vorjahr rückwärts).
    const histYears = Array.from({ length: CFG.avgYears }, (_, i) => thisYear - 1 - i);
    const histResults = await Promise.allSettled(histYears.map(y => fetchSummerCdh(rLat, rLon, y)));
    const perYear = histResults.map(r => (r.status === "fulfilled" ? r.value : null));
    const valid = perYear.filter((v): v is number => v != null && v >= 50 && v <= 5000);
    if (!valid.length) throw new Error("no valid summers");

    const avg5 = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
    const lastSummer = perYear[0] != null && perYear[0] >= 50 && perYear[0] <= 5000
      ? Math.round(perYear[0])
      : Math.round(avg5 * CFG.lastSummerFactor);

    // Projektion ~20 Jahre via CMIP6 Climate API (gegen 2050 geclamped).
    const pStart = Math.min(CLIMATE_MAX_YEAR, thisYear + CFG.projectionYearsAhead.start);
    const pEnd = Math.min(CLIMATE_MAX_YEAR, thisYear + CFG.projectionYearsAhead.end);
    let projection = Math.round(avg5 * CFG.projectionFactor); // Fallback
    try {
      const proj = await fetchProjectionCdh(rLat, rLon, pStart, pEnd);
      if (proj != null && proj >= 50 && proj <= 6000) projection = Math.round(proj);
    } catch { /* Faktor-Fallback bleibt */ }

    if (supabase) {
      await supabase.from("klima_cache").upsert(
        { lat: rLat, lon: rLon, cdh_avg5: avg5, cdh_last_summer: lastSummer, cdh_projection: projection },
        { onConflict: "lat,lon" },
      ).then(() => {});
    }

    return NextResponse.json(
      { avg5, lastSummer, projection, source: "open-meteo", heatwave },
      { headers: { "Cache-Control": CDN_CACHE_LONG } },
    );
  } catch {
    return NextResponse.json(
      { ...fallback, source: "fallback", heatwave },
      { headers: { "Cache-Control": CDN_CACHE_FALLBACK } },
    );
  }
}

// Ein Sommer (Mai–Sep) aus dem Wetterarchiv → Kühlgradstunden (echt stündlich).
async function fetchSummerCdh(lat: number, lon: number, year: number): Promise<number> {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("start_date", `${year}-05-01`);
  url.searchParams.set("end_date", `${year}-09-30`);
  url.searchParams.set("hourly", "temperature_2m");
  url.searchParams.set("timezone", "Europe/Berlin");
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`archive ${res.status}`);
  const json = await res.json();
  const temps: number[] = json?.hourly?.temperature_2m ?? [];
  if (!temps.length) throw new Error("empty archive");
  return cdhFromHourly(temps, BASE);
}

// Projektion: CMIP6-Modell über das Zukunftsfenster, Tages-Min/Max → synthetische
// Stunden → Kühlgradstunden, gemittelt pro Jahr. Wintertage tragen ~0 bei, daher
// kein Monatsfilter nötig.
async function fetchProjectionCdh(lat: number, lon: number, startYear: number, endYear: number): Promise<number | null> {
  const url = new URL("https://climate-api.open-meteo.com/v1/climate");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("start_date", `${startYear}-01-01`);
  url.searchParams.set("end_date", `${endYear}-12-31`);
  url.searchParams.set("models", CFG.climateModel);
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "Europe/Berlin");
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`climate ${res.status}`);
  const json = await res.json();
  const tmax: number[] = json?.daily?.temperature_2m_max ?? [];
  const tmin: number[] = json?.daily?.temperature_2m_min ?? [];
  if (!tmax.length || !tmin.length) return null;
  const years = endYear - startYear + 1;
  return cdhFromDailyMinMax(tmax, tmin, BASE) / years;
}

// Akute Hitzewelle aus der 16-Tage-Vorhersage.
async function fetchHeatwave(lat: number, lon: number): Promise<{ maxTemp: number; hotDays: number; active: boolean } | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("daily", "temperature_2m_max");
    url.searchParams.set("forecast_days", "16");
    url.searchParams.set("timezone", "Europe/Berlin");
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = await res.json();
    const maxima: number[] = json?.daily?.temperature_2m_max ?? [];
    if (!maxima.length) return null;
    const maxTemp = Math.round(Math.max(...maxima));
    const hotDays = maxima.filter(t => t >= CFG.heatwaveThreshold).length;
    let streak = 0, best = 0;
    for (const t of maxima) { streak = t >= CFG.heatwaveThreshold ? streak + 1 : 0; best = Math.max(best, streak); }
    return { maxTemp, hotDays, active: best >= CFG.heatwaveMinDays };
  } catch {
    return null;
  }
}
