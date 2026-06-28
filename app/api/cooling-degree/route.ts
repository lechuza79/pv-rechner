import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase-server";
import { PLZ_BL } from "../../../lib/plz-bundesland";
import { DEFAULT_AIRCON_CONFIG as CFG } from "../../../lib/aircon-config";

// Cooling-degree-hours for a location are climatology — effectively stationary.
// Cache hard on the CDN so repeat requests skip the function entirely.
const CDN_CACHE_LONG = "public, s-maxage=2592000, stale-while-revalidate=2592000"; // 30 days
const CDN_CACHE_FALLBACK = "public, s-maxage=86400, stale-while-revalidate=604800"; // 1 day

// Schwelle, ab der gekühlt wird (Außentemperatur). Muss zur Klimatologie in
// aircon-config.ts passen (dort sind die Bundesland-Referenzwerte mit derselben
// Schwelle hinterlegt).
const COOL_BASE = 22;

// Kühlgradstunden = Σ max(0, T_außen − Schwelle) über die Stundenreihe.
function coolingDegreeHours(temps: number[]): number {
  let sum = 0;
  for (const t of temps) {
    if (typeof t === "number" && t > COOL_BASE) sum += t - COOL_BASE;
  }
  return Math.round(sum);
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");
  const plzPrefix = req.nextUrl.searchParams.get("plzPrefix") || "";
  const bl = PLZ_BL[plzPrefix] || null;
  const fallbackCdh = (bl && CFG.cdhByBundesland[bl]) || CFG.cdhNational;

  // Sofort-Fallback ohne gültige Koordinaten
  if (isNaN(lat) || isNaN(lon) || lat < 47 || lat > 55 || lon < 5 || lon > 16) {
    return NextResponse.json(
      { cdh: fallbackCdh, source: "fallback", heatwave: null },
      { headers: { "Cache-Control": CDN_CACHE_FALLBACK } },
    );
  }

  const rLat = Math.round(lat * 100) / 100;
  const rLon = Math.round(lon * 100) / 100;

  // Akuter Hitzewellen-Blick: 16-Tage-Vorhersage (Tagesmaxima). Inherent live,
  // daher nicht gecacht zusammen mit der Klimatologie — bewusst separat geholt.
  const heatwave = await fetchHeatwave(rLat, rLon);

  // 1. Supabase-Cache für die Klimatologie (Kühlgradstunden) prüfen
  if (supabase) {
    const { data: cached } = await supabase
      .from("klima_cache")
      .select("cdh")
      .eq("lat", rLat)
      .eq("lon", rLon)
      .maybeSingle();
    if (cached?.cdh) {
      return NextResponse.json(
        { cdh: cached.cdh, source: "cache", heatwave },
        { headers: { "Cache-Control": CDN_CACHE_LONG } },
      );
    }
  }

  // 2. Open-Meteo Historie: letzter vollständiger Sommer (Mai–Sep des Vorjahres).
  // Vorjahr zur Laufzeit berechnet → kein hardcoded Jahr (rollover-sicher).
  try {
    const year = new Date().getFullYear() - 1;
    const url = new URL("https://archive-api.open-meteo.com/v1/archive");
    url.searchParams.set("latitude", String(rLat));
    url.searchParams.set("longitude", String(rLon));
    url.searchParams.set("start_date", `${year}-05-01`);
    url.searchParams.set("end_date", `${year}-09-30`);
    url.searchParams.set("hourly", "temperature_2m");
    url.searchParams.set("timezone", "Europe/Berlin");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`archive ${res.status}`);
    const json = await res.json();
    const temps: number[] = json?.hourly?.temperature_2m ?? [];
    if (!temps.length) throw new Error("empty archive");

    const cdh = coolingDegreeHours(temps);
    // Plausibilität: Deutschland liegt grob bei 400–3000 Kh/Jahr.
    if (cdh < 100 || cdh > 5000) throw new Error("implausible cdh");

    if (supabase) {
      await supabase.from("klima_cache").upsert(
        { lat: rLat, lon: rLon, cdh },
        { onConflict: "lat,lon" },
      ).then(() => {});
    }

    return NextResponse.json(
      { cdh, source: "open-meteo", heatwave },
      { headers: { "Cache-Control": CDN_CACHE_LONG } },
    );
  } catch {
    return NextResponse.json(
      { cdh: fallbackCdh, source: "fallback", heatwave },
      { headers: { "Cache-Control": CDN_CACHE_FALLBACK } },
    );
  }
}

// Akute Hitzewelle aus der 16-Tage-Vorhersage: wärmster Tag + Hitzetage
// (Tagesmax ≥ Schwelle) + Hitzewellen-Flag (≥ N Tage am Stück).
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
    // Hitzewelle = mind. heatwaveMinDays Hitzetage am Stück
    let streak = 0, best = 0;
    for (const t of maxima) { streak = t >= CFG.heatwaveThreshold ? streak + 1 : 0; best = Math.max(best, streak); }
    return { maxTemp, hotDays, active: best >= CFG.heatwaveMinDays };
  } catch {
    return null;
  }
}
