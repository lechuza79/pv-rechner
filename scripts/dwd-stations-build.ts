/**
 * Build the committed list of DWD stations with hourly report files.
 *
 *   npm run dwd:stationen
 *
 * Joins the MOSMIX station catalogue (positions, heights) with the directory of
 * `*-BEOB.csv` files (who actually reports). A station in the catalogue without
 * a report file is useless for live weather; one with a file but no catalogue
 * entry cannot be placed and is listed as missing rather than dropped silently.
 */
import { renameSync, writeFileSync } from 'node:fs';
import { degreesMinutes } from '../lib/dwd-stations';

const CATALOGUE = 'https://www.dwd.de/DE/leistungen/met_verfahren_mosmix/mosmix_stationskatalog.cfg?view=nasPublication&nn=16102';
const REPORTS = 'https://opendata.dwd.de/weather/weather_reports/poi/';
/** Germany plus a margin, so a border town can use a station across the border. */
const BOX = { south: 46.5, north: 56, west: 4.5, east: 16.5 };

async function text(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000), headers: { 'user-agent': 'solar-check-dwd-stations' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return new TextDecoder('latin1').decode(await response.arrayBuffer());
}

async function main() {
  const [catalogue, listing] = await Promise.all([text(CATALOGUE), text(REPORTS)]);
  const reporting = new Set(Array.from(listing.matchAll(/href="([0-9A-Z]{5})-BEOB\.csv"/g), (m) => m[1]));
  const stations = [];
  const placed = new Set<string>();
  for (const line of catalogue.split(/\r?\n/).slice(2)) {
    // Fixed columns: ID 0–4, ICAO 6–9, NAME 11–30, LAT 33–38, LON 40–46, ELEV 48–
    const id = line.slice(0, 5).trim();
    if (!/^[0-9A-Z]{5}$/.test(id) || !reporting.has(id)) continue;
    const latitude = degreesMinutes(Number(line.slice(32, 39)));
    const longitude = degreesMinutes(Number(line.slice(39, 47)));
    const elevation = Number(line.slice(47).trim());
    if (![latitude, longitude, elevation].every(Number.isFinite)) continue;
    if (latitude < BOX.south || latitude > BOX.north || longitude < BOX.west || longitude > BOX.east) continue;
    stations.push({ id, name: line.slice(11, 31).trim(), latitude: Number(latitude.toFixed(4)), longitude: Number(longitude.toFixed(4)), elevation });
    placed.add(id);
  }
  stations.sort((a, b) => a.id.localeCompare(b.id));
  const out = 'lib/dwd-stations.json';
  writeFileSync(out + '.tmp', JSON.stringify({ builtAt: new Date().toISOString(), catalogue: CATALOGUE, reports: REPORTS, stations }, null, 1));
  renameSync(out + '.tmp', out);
  const unplaced = Array.from(reporting).filter((id) => !placed.has(id)).length;
  console.log(`${stations.length} Stationen im Gebiet; ${reporting.size} Meldedateien insgesamt, davon ${unplaced} außerhalb oder ohne Katalogeintrag.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
