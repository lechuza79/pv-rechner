import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_AIRCON_CONFIG as CFG } from "../../../lib/aircon-config";
import { rateLimit } from "../../../lib/rate-limit";

// ─── Akute Hitzewelle (16-Tage-Vorhersage) ───────────────────────────────────
//
// Bewusst eine EIGENE Route, getrennt von /api/cooling-degree.
//
// Kühlgradstunden sind Klimatologie — praktisch stationär, deshalb liegen sie
// 30 Tage im CDN. Die Hitzewellen-Vorhersage stand bis 29.07.2026 in derselben
// Antwort und erbte damit dieselben 30 Tage: Der erste Abruf einer PLZ fror den
// Satz "in den nächsten 16 Tagen bis X °C" für einen Monat am Edge ein. In
// Produktion nachgemessen — zweiter Abruf derselben PLZ kam als HIT zurück, mit
// der Julihitze darin. Eine Vorhersage, die einen Monat alt sein darf, ist keine
// Vorhersage mehr, sondern eine falsche Aussage auf der Seite.
//
// Getrennte Route = getrennte Haltbarkeit: Klimadaten behalten ihre 30 Tage,
// die Vorhersage bekommt eine Stunde.
const CDN_CACHE_FORECAST = "public, s-maxage=3600, stale-while-revalidate=3600"; // 1 h

export async function GET(req: NextRequest) {
  // Ein externer Aufruf pro Miss — deutlich billiger als die Klimadaten-Route,
  // deshalb ein weiteres Fenster.
  const limited = rateLimit(req, "heatwave", 60, 60_000);
  if (limited) return limited;

  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");
  if (isNaN(lat) || isNaN(lon) || lat < 47 || lat > 55 || lon < 5 || lon > 16) {
    return NextResponse.json(
      { heatwave: null },
      { headers: { "Cache-Control": CDN_CACHE_FORECAST } },
    );
  }

  const heatwave = await fetchHeatwave(Math.round(lat * 100) / 100, Math.round(lon * 100) / 100);
  return NextResponse.json(
    { heatwave },
    { headers: { "Cache-Control": CDN_CACHE_FORECAST } },
  );
}

async function fetchHeatwave(
  lat: number,
  lon: number,
): Promise<{ maxTemp: number; hotDays: number; active: boolean } | null> {
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
