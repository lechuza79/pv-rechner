import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_AIRCON_CONFIG as CFG } from "../../../lib/aircon-config";
import { rateLimit } from "../../../lib/rate-limit";
import { shardKey } from "../../../lib/icon-d2";
import { loadSnapshotFile } from "../../../lib/icon-d2-store";
import { nearestPlz } from "../../../lib/plz-nearest";
import { forecastPath, heatwaveFrom, maximaFrom, type ForecastShard } from "../../../lib/wetter-vorhersage";
import { heuteInBerlin } from "../../../lib/zeit";

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
  // Liest nur die Vorhersage-Datei (DWD ICON, dann NOAA GFS; alle sechs
  // Stunden geschrieben von scripts/wetter-vorhersage.ts) — kein Wetterdienst
  // pro Besucher.
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

  const plz = nearestPlz(lat, lon);
  const shard = plz ? await loadSnapshotFile<ForecastShard>(forecastPath(shardKey(plz))) : null;
  const maxima = shard && plz ? maximaFrom(shard, plz, heuteInBerlin()) : null;
  const heatwave = maxima ? heatwaveFrom(maxima, CFG.heatwaveThreshold, CFG.heatwaveMinDays) : null;
  return NextResponse.json(
    { heatwave },
    { headers: { "Cache-Control": CDN_CACHE_FORECAST } },
  );
}
