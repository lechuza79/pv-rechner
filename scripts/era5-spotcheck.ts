/**
 * Close the one gap the offline comparison cannot: mountains.
 *
 * The cached provider answers an earlier run left behind are almost entirely
 * northern and below 730 m, so the height correction has never been checked
 * against the provider where it is largest. This fetches a handful of named
 * high and coastal places from the hosted API and holds them against our own
 * reading of the archive.
 *
 * Deliberately a handful, named in the code: the provider's daily allowance is
 * shared with the preparation run, and a broad sweep would take it.
 *
 *   npm run era5:stichprobe -- --monat=2026-08
 */
import { existsSync, readFileSync } from 'node:fs';
import { era5Weather } from '../lib/era5-weather';
import { era5Orography } from '../lib/era5-orography';

const arg = (key: string, fallback = '') =>
  process.argv.find((a) => a.startsWith('--' + key + '='))?.slice(key.length + 3) ?? fallback;

/** Chosen for height and for coast, not at random; each is one request. */
const PLACES = [
  { name: 'Ramsau b.Berchtesgaden', id: '09172122' },
  { name: 'Oberstdorf', id: '09780139' },
  { name: 'Feldberg (Schwarzwald)', id: '08315035' },
  { name: 'Oberwiesenthal', id: '14521380' },
  { name: 'Eschenlohe', id: '09180116' },
  { name: 'Norderney', id: '03452016' },
  { name: 'List', id: '01054066' },
];

const month = arg('monat', '2026-08');
const [year, monthNumber] = month.split('-').map(Number);
const start = new Date(Date.UTC(year, monthNumber - 1, 0)).toISOString().slice(0, 10);
const end = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);

const pointsPath = 'scripts/.cache/era5-archive/points.json';
if (!existsSync(pointsPath)) throw new Error('Punktliste fehlt; zuerst era5:punkte laufen lassen.');
const points = JSON.parse(readFileSync(pointsPath, 'utf8')) as { id: string; name: string; latitude: number; longitude: number }[];
const elevations = JSON.parse(readFileSync('scripts/.cache/era5-archive/point-elevation.json', 'utf8')).elevations as Record<string, number>;

async function main() {
  console.log(`Stichprobe ${start} bis ${end}, ${PLACES.length} Orte\n`);
  const rows: { name: string; height: number; offset: number; cellOk: boolean; temperature: number; radiation: number }[] = [];
  for (const place of PLACES) {
    const point = points.find((candidate) => candidate.id === place.id || candidate.name === place.name);
    if (!point) { console.log(`  ${place.name}: nicht im Verzeichnis`); continue; }
    const elevation = elevations[`${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`];
    if (elevation === undefined) { console.log(`  ${place.name}: keine Ortshöhe`); continue; }

    const url = new URL('https://archive-api.open-meteo.com/v1/archive');
    for (const [key, value] of Object.entries({
      latitude: point.latitude, longitude: point.longitude, start_date: start, end_date: end,
      hourly: 'temperature_2m,shortwave_radiation', models: 'era5', timezone: 'UTC', wind_speed_unit: 'ms',
    })) url.searchParams.set(key, String(value));
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      const text = await response.text();
      console.log(`  ${place.name}: Anbieter antwortet HTTP ${response.status} – ${text.slice(0, 110)}`);
      if (response.status === 429) { console.log('\nTageslimit des Anbieters erreicht; später erneut.'); break; }
      continue;
    }
    const reference = (await response.json()) as { latitude: number; longitude: number; elevation: number; hourly: { temperature_2m: number[]; shortwave_radiation: number[] } };
    const mine = era5Weather({ latitude: point.latitude, longitude: point.longitude, targetElevation: elevation, startDate: start, endDate: end, wind: false, orography: era5Orography });
    const cellOk = Math.abs(mine.weather.latitude - reference.latitude) < 1e-9 && Math.abs(mine.weather.longitude - reference.longitude) < 1e-9;
    const worst = (a: number[], b: number[]) => Math.max(...a.map((value, index) => Math.abs(b[index] - value)));
    const row = {
      name: place.name, height: elevation, offset: mine.provenance.temperatureOffsetK, cellOk,
      temperature: worst(reference.hourly.temperature_2m, mine.weather.hourly.temperature_2m),
      radiation: worst(reference.hourly.shortwave_radiation, mine.weather.hourly.shortwave_radiation),
    };
    rows.push(row);
    console.log(
      `  ${place.name.slice(0, 24).padEnd(24)} ${String(elevation).padStart(5)} m  ` +
        `Anbieterhöhe ${String(reference.elevation).padStart(5)}  Zelle ${cellOk ? 'gleich' : 'ABWEICHEND'}  ` +
        `Korrektur ${row.offset >= 0 ? '+' : ''}${row.offset.toFixed(2)} K  ` +
        `max|dT| ${row.temperature.toFixed(3)} K  max|dG| ${row.radiation.toFixed(3)} W/m²`,
    );
  }
  if (rows.length) {
    console.log(
      `\n${rows.length} Orte: Zelle gleich ${rows.filter((row) => row.cellOk).length}/${rows.length}, ` +
        `größte Temperaturabweichung ${Math.max(...rows.map((row) => row.temperature)).toFixed(3)} K, ` +
        `größte Strahlungsabweichung ${Math.max(...rows.map((row) => row.radiation)).toFixed(3)} W/m².`,
    );
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
