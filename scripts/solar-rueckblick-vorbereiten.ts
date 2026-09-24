/**
 * Precompute the ten-year solar retrospective (2016–2025) for every postcode
 * and store it in `solar_rueckblick`, where /api/solar-rueckblick reads it.
 *
 * Why offline: the ERA5 archive lives only in the local block store (and its
 * reader must not ship — see the era5 import guard), and an hourly simulation
 * over ten years has no business running on a page request.
 *
 * Weather point per postcode exactly as the live-weather run chooses it: the
 * town point where the postcode centroid sits on a hill, else the centroid,
 * with its DEM height (the ERA5 cell and the temperature both depend on it).
 *
 *   npm run rueckblick:vorbereiten -- --trocken --plz=10115,79098,97204
 *   npm run rueckblick:vorbereiten -- --schreiben          (all postcodes)
 *
 * Without --schreiben nothing is written. Prerequisite:
 *   npm run era5:sync -- --year=JJJJ   for 2016 … 2025
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { era5Weather, ERA5_ATTRIBUTION } from "../lib/era5-weather";
import { era5Orography } from "../lib/era5-orography";
import { solarRueckblick, RUECKBLICK_VON, RUECKBLICK_BIS, type WetterJahr } from "../lib/solar-rueckblick";
import { SOLAR_RUECKBLICK_SQL } from "../lib/solar-rueckblick-sql";
import plzCoordinates from "../public/plz.json";
import plzElevation from "../lib/plz-elevation.json";
import plzWeatherPoint from "../lib/plz-weather-point.json";

const WURZEL = resolve(__dirname, "..");
const schreiben = process.argv.includes("--schreiben");
const auswahl = process.argv.find((a) => a.startsWith("--plz="))?.slice(6).split(",").filter(Boolean);

function ladeEnv(): void {
  const p = resolve(WURZEL, ".env.local");
  if (!existsSync(p)) return;
  for (const zeile of readFileSync(p, "utf8").split("\n")) {
    const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const coordinates = plzCoordinates as unknown as Record<string, [number, number]>;
const elevations = (plzElevation as { elevations: Record<string, number> }).elevations;
const townPoints = (plzWeatherPoint as { points: Record<string, { latitude: number; longitude: number; elevation: number }> }).points;

function wetterpunkt(plz: string): { latitude: number; longitude: number; elevation: number } | null {
  const town = townPoints[plz];
  if (town) return town;
  const c = coordinates[plz];
  const elevation = elevations[plz];
  if (!c || elevation === undefined) return null;
  return { latitude: c[0], longitude: c[1], elevation };
}

/** Ten calendar years on the UTC axis the model expects. */
function wetterJahre(p: { latitude: number; longitude: number; elevation: number }): WetterJahr[] {
  const antwort = era5Weather({
    latitude: p.latitude,
    longitude: p.longitude,
    targetElevation: p.elevation,
    startDate: `${RUECKBLICK_VON}-01-01`,
    endDate: `${RUECKBLICK_BIS}-12-31`,
    wind: false,
    orography: era5Orography,
    tilted: { tilt: 35, azimuth: 0 },
  });
  const h = antwort.weather.hourly;
  const g = h.global_tilted_irradiance;
  if (!g) throw new Error("Geneigte Einstrahlung fehlt");
  const jahre: WetterJahr[] = [];
  let start = 0;
  for (let jahr = RUECKBLICK_VON; jahr <= RUECKBLICK_BIS; jahr++) {
    const n = (Date.UTC(jahr + 1, 0, 1) - Date.UTC(jahr, 0, 1)) / 3_600_000;
    // The axis must start exactly at 1 Jan 00:00 UTC of the year; a shifted
    // slice would silently move the sun against the household's clock.
    if (h.time[start] !== new Date(Date.UTC(jahr, 0, 1)).toISOString().slice(0, 16)) {
      throw new Error(`Zeitachse verschoben bei ${jahr}: ${h.time[start]}`);
    }
    jahre.push({
      jahr,
      temperaturC: h.temperature_2m.slice(start, start + n),
      einstrahlungGeneigtWm2: g.slice(start, start + n),
    });
    start += n;
  }
  return jahre;
}

async function main() {
  ladeEnv();
  const alle = auswahl ?? Object.keys(coordinates).sort();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (schreiben && (!url || !key)) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen (.env.local).");
  const sb = schreiben ? createClient(url!, key!) : null;
  if (sb) {
    const { error } = await sb.rpc("exec_sql", { sql: SOLAR_RUECKBLICK_SQL });
    if (error) throw new Error(`Tabelle: ${error.message}`);
  }

  const puffer: Record<string, unknown>[] = [];
  let fertig = 0;
  const fehler: string[] = [];
  const t0 = Date.now();
  const leeren = async () => {
    if (!sb || puffer.length === 0) return;
    const { error } = await sb.from("solar_rueckblick").upsert(puffer.splice(0), { onConflict: "plz" });
    if (error) throw new Error(`Schreiben: ${error.message}`);
  };

  for (const plz of alle) {
    const punkt = wetterpunkt(plz);
    if (!punkt) {
      fehler.push(`${plz}: kein Wetterpunkt`);
      continue;
    }
    try {
      const r = solarRueckblick(wetterJahre(punkt));
      const zeile = {
        plz,
        vorteil_ohne_wp: Math.round(r.vorteilOhneWp * 100) / 100,
        vorteil_mit_wp: Math.round(r.vorteilMitWp * 100) / 100,
        jahre: r.jahre.map((j) => ({
          jahr: j.jahr,
          vorteilOhneWp: Math.round(j.vorteilOhneWp),
          vorteilMitWp: Math.round(j.vorteilMitWp),
          erzeugungKwh: Math.round(j.erzeugungKwh),
        })),
        annahmen: r.annahmen,
        wetterquelle: ERA5_ATTRIBUTION,
        berechnet_am: new Date().toISOString(),
      };
      if (!sb) console.log(plz, Math.round(r.vorteilOhneWp), Math.round(r.vorteilMitWp), `${Math.round(r.jahre[0].erzeugungKwh)} kWh 2016`);
      puffer.push(zeile);
      if (puffer.length >= 200) await leeren();
    } catch (e) {
      fehler.push(`${plz}: ${(e as Error).message}`);
    }
    if (++fertig % 250 === 0) {
      const s = (Date.now() - t0) / 1000;
      console.log(`${fertig}/${alle.length} · ${Math.round(s)} s · ${fehler.length} Fehler`);
    }
  }
  await leeren();
  console.log(`Fertig: ${fertig - fehler.length} von ${alle.length} Postleitzahlen${schreiben ? " geschrieben" : " (trocken)"}.`);
  if (fehler.length) console.log(`Fehler (${fehler.length}):\n  ` + fehler.slice(0, 20).join("\n  "));
  // A run that leaves postcodes out is a run to look at, not a success.
  if (fehler.length > alle.length * 0.01) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
