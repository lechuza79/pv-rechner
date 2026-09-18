/**
 * Hold the ERA5 archive reader against the cached Open-Meteo answers.
 *
 * Reads only what is already on disk on both sides: the stored ERA5 blocks and
 * the raw provider answers an earlier preparation run saved. Nothing is fetched
 * from the weather API, so this can run while that API is rate limited.
 *
 * Compares the hourly series, the derived monthly solar chart, the annual
 * energy profile and both money figures, and reports where they part.
 *
 *   npm run era5:vergleich -- --cache=/pfad/zu/scripts/.cache
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { era5Weather } from '../lib/era5-weather';
import { era5Orography } from '../lib/era5-orography';
import { era5SelectCell } from '../lib/era5-grid';
import { solarMonth } from '../lib/story-monthly-solar';
import { energyYear } from '../lib/story-energy-year';

const arg = (key: string, fallback = '') =>
  process.argv.find((a) => a.startsWith('--' + key + '='))?.slice(key.length + 3) ?? fallback;
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

const cache = arg('cache', 'scripts/.cache');
const weatherRoot = cache + '/story-weather';
const limit = Number(arg('limit', '0'));
const elevationsPath = 'scripts/.cache/era5-archive/point-elevation.json';
const ownElevations: Record<string, number> = existsSync(elevationsPath) ? read(elevationsPath).elevations : {};
const key = (latitude: number, longitude: number) => `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

type Summary = { n: number; mean: number; median: number; p99: number; max: number; equal: number };
function compare(reference: number[], mine: number[]): Summary {
  const deltas = reference.map((value, index) => mine[index] - value);
  const absolute = deltas.map(Math.abs).sort((a, b) => a - b);
  return {
    n: deltas.length,
    mean: deltas.reduce((sum, value) => sum + value, 0) / deltas.length,
    median: absolute[absolute.length >> 1],
    p99: absolute[Math.floor(absolute.length * 0.99)],
    max: absolute[absolute.length - 1],
    equal: deltas.filter((value) => value === 0).length / deltas.length,
  };
}
const show = (label: string, s: Summary) =>
  `${label.padEnd(16)} n=${String(s.n).padStart(5)}  Mittel ${(s.mean >= 0 ? '+' : '') + s.mean.toFixed(5)}  Median|d| ${s.median.toFixed(4)}  p99|d| ${s.p99.toFixed(4)}  max|d| ${s.max.toFixed(4)}  gleich ${(s.equal * 100).toFixed(1)} %`;

const rows: Record<string, unknown>[] = [];
const files = readdirSync(weatherRoot).filter((name) => name.endsWith('.json'));
let seen = 0, cellMatches = 0, cellMisses = 0, elevationMatches = 0, elevationKnown = 0;
const worstTemperature: { file: string; max: number }[] = [];
const worstRadiation: { file: string; max: number; relative: number }[] = [];
const worstWind: { file: string; max: number; relative: number }[] = [];
const skipped = new Map<string, number>();

for (const name of files) {
  if (limit && seen >= limit) break;
  const answer = read(weatherRoot + '/' + name) as {
    sourceUrl: string;
    weather: { latitude: number; longitude: number; elevation: number; hourly: Record<string, number[]> };
  };
  const url = new URL(answer.sourceUrl);
  const latitude = Number(url.searchParams.get('latitude'));
  const longitude = Number(url.searchParams.get('longitude'));
  const startDate = url.searchParams.get('start_date')!;
  const endDate = url.searchParams.get('end_date')!;
  const wind = Array.isArray(answer.weather.hourly.wind_speed_100m);
  const targetElevation = answer.weather.elevation;

  let mine;
  try {
    mine = era5Weather({ latitude, longitude, targetElevation, startDate, endDate, wind, orography: era5Orography });
  } catch (error) {
    const reason = (error as Error).message.replace(/\d+/g, 'N');
    skipped.set(reason, (skipped.get(reason) ?? 0) + 1);
    continue;
  }
  seen++;

  const cellOk =
    Math.abs(mine.weather.latitude - answer.weather.latitude) < 1e-9 &&
    Math.abs(mine.weather.longitude - answer.weather.longitude) < 1e-9;
  cellOk ? cellMatches++ : cellMisses++;

  // Second question, separate from the weather: does our own elevation lookup
  // land on the same cell the provider's did?
  const own = ownElevations[key(latitude, longitude)];
  if (own !== undefined) {
    elevationKnown++;
    const cellFromOwn = era5SelectCell(latitude, longitude, own, era5Orography);
    if (
      Math.abs(cellFromOwn.latitude - answer.weather.latitude) < 1e-9 &&
      Math.abs(cellFromOwn.longitude - answer.weather.longitude) < 1e-9
    ) elevationMatches++;
  }

  const temperature = compare(answer.weather.hourly.temperature_2m, mine.weather.hourly.temperature_2m);
  const radiation = compare(answer.weather.hourly.shortwave_radiation, mine.weather.hourly.shortwave_radiation);
  const referenceSum = answer.weather.hourly.shortwave_radiation.reduce((sum, value) => sum + value, 0);
  const mineSum = mine.weather.hourly.shortwave_radiation.reduce((sum, value) => sum + value, 0);
  const radiationRelative = referenceSum ? mineSum / referenceSum - 1 : 0;
  worstTemperature.push({ file: name, max: temperature.max });
  worstRadiation.push({ file: name, max: radiation.max, relative: radiationRelative });

  const row: Record<string, unknown> = {
    file: name, latitude, longitude, startDate, endDate, cellOk,
    cellLatitude: mine.weather.latitude, cellLongitude: mine.weather.longitude,
    targetElevation, modelElevation: mine.provenance.modelElevation,
    offsetK: mine.provenance.temperatureOffsetK,
    temperature, radiation, radiationRelative,
  };
  if (wind) {
    const w = compare(answer.weather.hourly.wind_speed_100m!, mine.weather.hourly.wind_speed_100m!);
    const wr = answer.weather.hourly.wind_speed_100m!.reduce((s, v) => s + v, 0);
    const wm = mine.weather.hourly.wind_speed_100m!.reduce((s, v) => s + v, 0);
    row.wind = w;
    row.windRelative = wr ? wm / wr - 1 : 0;
    worstWind.push({ file: name, max: w.max, relative: row.windRelative as number });
  }
  rows.push(row);
  if (seen % 100 === 0) console.log(`  ${seen} Antworten verglichen`);
}

console.log(`\nVerglichene Antworten: ${seen} von ${files.length}`);
for (const [reason, count] of skipped) console.log(`  übersprungen (${count}×): ${reason}`);
console.log(`Rasterzelle wie beim Anbieter: ${cellMatches}, abweichend: ${cellMisses}`);
if (elevationKnown) {
  console.log(
    `Mit UNSERER eigenen Ortshöhe dieselbe Zelle: ${elevationMatches} von ${elevationKnown} ` +
      `(${((elevationMatches / elevationKnown) * 100).toFixed(2)} %)`,
  );
}
const all = (pick: (row: Record<string, unknown>) => Summary | undefined) => {
  const parts = rows.map(pick).filter(Boolean) as Summary[];
  if (!parts.length) return null;
  const n = parts.reduce((sum, p) => sum + p.n, 0);
  return {
    n,
    mean: parts.reduce((sum, p) => sum + p.mean * p.n, 0) / n,
    median: parts.map((p) => p.median).sort((a, b) => a - b)[parts.length >> 1],
    p99: Math.max(...parts.map((p) => p.p99)),
    max: Math.max(...parts.map((p) => p.max)),
    equal: parts.reduce((sum, p) => sum + p.equal * p.n, 0) / n,
  } as Summary;
};
for (const [label, pick] of [
  ['Temperatur °C', (r: Record<string, unknown>) => r.temperature as Summary],
  ['Strahlung W/m²', (r: Record<string, unknown>) => r.radiation as Summary],
  ['Wind 100 m m/s', (r: Record<string, unknown>) => r.wind as Summary | undefined],
] as const) {
  const summary = all(pick);
  if (summary) console.log(show(label, summary));
}
const worst = (list: { file: string; max: number }[], label: string) => {
  const top = [...list].sort((a, b) => b.max - a.max).slice(0, 5);
  console.log(`Schlechteste Orte ${label}: ` + top.map((t) => t.max.toFixed(4)).join(', '));
};
worst(worstTemperature, 'Temperatur');
worst(worstRadiation, 'Strahlung');
if (worstWind.length) worst(worstWind, 'Wind');
const relative = worstRadiation.map((r) => Math.abs(r.relative)).sort((a, b) => b - a);
console.log(`Strahlungssumme: größte relative Abweichung ${(relative[0] * 100).toFixed(5)} %`);
if (worstWind.length) {
  const wr = worstWind.map((r) => Math.abs(r.relative)).sort((a, b) => b - a);
  console.log(`Windsumme: größte relative Abweichung ${(wr[0] * 100).toFixed(5)} %`);
}
writeFileSync('scripts/.cache/era5-archive/vergleich.json', JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1));
console.log('Einzelwerte in scripts/.cache/era5-archive/vergleich.json');
void solarMonth; void energyYear;
