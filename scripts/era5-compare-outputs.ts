/**
 * Compare what a reader actually sees, not just the hourly inputs.
 *
 * Runs the monthly solar chart, the annual energy profile and both money
 * figures twice for the same municipality — once on the cached Open-Meteo
 * answer, once on the ERA5 archive — and reports where the results part. Hourly
 * agreement does not by itself prove the charts agree: the monthly chart bins
 * hours into German calendar days and the money figures weight each unit by its
 * own tariff, so an error could cancel in the sum and still move a day.
 *
 *   npm run era5:vergleich-ergebnis -- --cache=/pfad/zu/scripts/.cache
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { era5Weather } from '../lib/era5-weather';
import { era5Orography } from '../lib/era5-orography';
import { solarMonth } from '../lib/story-monthly-solar';
import { energyYear } from '../lib/story-energy-year';
import { unitMonthValue, type ValuationUnit } from '../lib/story-unit-value';
import { eigenverbrauchAnteilRegion } from '../lib/atlas-impact';

const arg = (key: string, fallback = '') =>
  process.argv.find((a) => a.startsWith('--' + key + '='))?.slice(key.length + 3) ?? fallback;
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const cache = arg('cache', 'scripts/.cache');
const limit = Number(arg('limit', '250'));
const elevations = read('scripts/.cache/era5-archive/point-elevation.json').elevations as Record<string, number>;
const points = read('scripts/.cache/era5-archive/points.json') as { id: string; name: string; latitude: number; longitude: number }[];
const stockRaw = read(arg('stock', cache + '/story-inputs/valuation-stock.json'));
const stocks = new Map<string, { windKwpLy: number; batteriePrivatCount: number; batteriePrivatKwh: number }>(
  (Array.isArray(stockRaw) ? stockRaw : stockRaw.stats).map((row: { regionId: string }) => [row.regionId, row]),
);
const stockDate = arg('stock-date', '2026-09-09');

/** Same request the preparation run would have sent, so the cache key matches. */
function openMeteoPath(latitude: number, longitude: number, start: string, end: string, wind: boolean) {
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  const hourly = 'temperature_2m,shortwave_radiation' + (wind ? ',wind_speed_100m' : '');
  for (const [k, v] of Object.entries({ latitude, longitude, start_date: start, end_date: end, hourly, models: 'era5', timezone: 'UTC', wind_speed_unit: 'ms' }))
    url.searchParams.set(k, String(v));
  return cache + '/story-weather/' + createHash('sha256').update(url.href).digest('hex') + '.json';
}
const relative = (a: number, b: number) => (a === 0 ? (b === 0 ? 0 : 1) : b / a - 1);

type Delta = { open: number; era5: number; relative: number };
type Row = {
  id: string; name: string; month: string; latitude: number; longitude: number; elevation: number; offsetK: number;
  monthMwh?: Delta; worstDayRelative?: number; peakDaySame?: boolean;
  euro?: Delta; feedInEuro?: Delta; yearSolar?: Delta; yearWind?: Delta;
};
const rows: Row[] = [];
let monthCompared = 0, yearCompared = 0, valueCompared = 0, skipped = 0;
const worstMonth: number[] = [], worstDay: number[] = [], worstYear: number[] = [], worstEuro: number[] = [], worstFeedIn: number[] = [], worstWind: number[] = [];

for (const point of points) {
  if (rows.length >= limit) break;
  const reportPath = cache + '/story-discovery/' + point.id + '.json';
  if (!existsSync(reportPath)) { skipped++; continue; }
  const report = read(reportPath) as { sourceDate: string };
  const sourceYear = Number(report.sourceDate.slice(0, 4)), sourceMonth = Number(report.sourceDate.slice(5, 7));
  const month = new Date(Date.UTC(sourceYear, sourceMonth - 2, 15)).toISOString().slice(0, 7);
  const year = sourceYear - 1;
  const start = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 0)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).toISOString().slice(0, 10);

  // The prepared file pins the point the saved figures were computed for.
  const preparedPath = cache + '/story-prepared/' + report.sourceDate + '/' + point.id + '.json';
  const prepared = existsSync(preparedPath) ? read(preparedPath) : null;
  const savedUrl = prepared?.monthly?.sourceUrl ? new URL(prepared.monthly.sourceUrl) : null;
  const latitude = savedUrl ? Number(savedUrl.searchParams.get('latitude')) : point.latitude;
  const longitude = savedUrl ? Number(savedUrl.searchParams.get('longitude')) : point.longitude;
  const elevation = elevations[`${latitude.toFixed(6)},${longitude.toFixed(6)}`];
  if (elevation === undefined) { skipped++; continue; }

  const monthPath = openMeteoPath(latitude, longitude, start, end, false);
  if (!existsSync(monthPath)) { skipped++; continue; }
  const reference = read(monthPath);
  let mine;
  try {
    mine = era5Weather({ latitude, longitude, targetElevation: elevation, startDate: start, endDate: end, wind: false, orography: era5Orography });
  } catch { skipped++; continue; }

  const detailPath = cache + '/bnetza/story-history-' + report.sourceDate + '/cities/' + point.id + '.json';
  if (!existsSync(detailPath)) { skipped++; continue; }
  const detail = read(detailPath) as { daily: { day: string; kwp: number; segment: string }[] };

  const row: Row = { id: point.id, name: point.name, month, latitude, longitude, elevation, offsetK: mine.provenance.temperatureOffsetK };
  const a = solarMonth(reference.weather, detail.daily, month, report.sourceDate, reference.retrievedAt, reference.sourceUrl);
  const b = solarMonth(mine.weather, detail.daily, month, report.sourceDate, mine.retrievedAt, mine.sourceUrl);
  const dayDelta = Math.max(...a.days.map((day, index) => Math.abs(relative(day.mwh, b.days[index].mwh))));
  row.monthMwh = { open: a.totalMwh, era5: b.totalMwh, relative: relative(a.totalMwh, b.totalMwh) };
  row.worstDayRelative = dayDelta;
  row.peakDaySame = a.peakDay === b.peakDay;
  worstMonth.push(Math.abs(row.monthMwh.relative)); worstDay.push(dayDelta);
  monthCompared++;

  // Money figures, both of them, on the same units and the same self-use share.
  const unitsPath = cache + '/story-radial/' + point.id + '-value-units.json';
  const stock = stocks.get(point.id);
  if (existsSync(unitsPath) && stock) {
    const source = read(unitsPath) as { sourceDate: string; units: ValuationUnit[] };
    if (source.sourceDate === report.sourceDate) {
      const privateUnits = source.units.filter((u) => u.status === '35' && u.usage === '713' && !['852', '2961'].includes(u.art) && u.kwp > 0);
      const selfUse = eigenverbrauchAnteilRegion(
        { dachCount: privateUnits.length, dachKwp: privateUnits.reduce((s, u) => s + u.kwp, 0), batterieCount: stock.batteriePrivatCount, batterieKwh: stock.batteriePrivatKwh },
        point.id,
      );
      if (!(privateUnits.length && selfUse === null)) {
        const va = unitMonthValue(source.units, reference.weather, month, selfUse ?? 0);
        const vb = unitMonthValue(source.units, mine.weather, month, selfUse ?? 0);
        row.euro = { open: va.euro, era5: vb.euro, relative: relative(va.euro, vb.euro) };
        row.feedInEuro = { open: va.feedInEuro, era5: vb.feedInEuro, relative: relative(va.feedInEuro, vb.feedInEuro) };
        worstEuro.push(Math.abs(row.euro.relative)); worstFeedIn.push(Math.abs(row.feedInEuro.relative));
        valueCompared++;
      }
    }
  }

  // Annual profile, which is the only place wind reaches a reader.
  const yearPath = openMeteoPath(latitude, longitude, `${year}-01-01`, `${year}-12-31`, true);
  if (existsSync(yearPath) && stock && Number.isFinite(stock.windKwpLy)) {
    const yearReference = read(yearPath);
    let yearMine;
    try {
      yearMine = era5Weather({ latitude, longitude, targetElevation: elevation, startDate: `${year}-01-01`, endDate: `${year}-12-31`, wind: true, orography: era5Orography });
    } catch { yearMine = null; }
    if (yearMine) {
      const solarKwp = detail.daily.filter((d) => d.day < `${year + 1}-01-01` && ['gebaeude', 'freiflaeche', 'steckersolar', 'sonstige'].includes(d.segment)).reduce((s, d) => s + d.kwp, 0);
      const config = { town: point.name, year, solarKwp, windKw: stock.windKwpLy, sourceDate: report.sourceDate, retrievedAt: '', sourceUrl: '' };
      const ya = energyYear(yearReference.weather as Parameters<typeof energyYear>[0], { ...config, retrievedAt: yearReference.retrievedAt, sourceUrl: yearReference.sourceUrl });
      const yb = energyYear(yearMine.weather as unknown as Parameters<typeof energyYear>[0], { ...config, retrievedAt: yearMine.retrievedAt, sourceUrl: yearMine.sourceUrl });
      const sum = (days: { solarMwh: number; windMwh: number }[], pick: 'solarMwh' | 'windMwh') => days.reduce((s, d) => s + d[pick], 0);
      row.yearSolar = { open: sum(ya.days, 'solarMwh'), era5: sum(yb.days, 'solarMwh'), relative: relative(sum(ya.days, 'solarMwh'), sum(yb.days, 'solarMwh')) };
      row.yearWind = { open: sum(ya.days, 'windMwh'), era5: sum(yb.days, 'windMwh'), relative: relative(sum(ya.days, 'windMwh'), sum(yb.days, 'windMwh')) };
      worstYear.push(Math.abs(row.yearSolar.relative));
      worstWind.push(Math.abs(row.yearWind.relative));
      yearCompared++;
    }
  }
  rows.push(row);
  if (rows.length % 25 === 0) console.log(`  ${rows.length} Orte verglichen`);
}

const quantiles = (list: number[]) => {
  if (!list.length) return 'keine Fälle';
  const sorted = [...list].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  return `Median ${(q(0.5) * 100).toFixed(5)} %  p95 ${(q(0.95) * 100).toFixed(5)} %  max ${(sorted[sorted.length - 1] * 100).toFixed(5)} %`;
};
console.log(`\nOrte: ${rows.length} verglichen, ${skipped} ohne vollständige Ausgangsdaten übersprungen`);
console.log(`Monatschart (${monthCompared}):       ${quantiles(worstMonth)}`);
console.log(`  schlechtester Einzeltag:   ${quantiles(worstDay)}`);
console.log(`  Spitzentag gleich:         ${rows.filter((r) => r.peakDaySame).length}/${monthCompared}`);
console.log(`Jahresprofil Solar (${yearCompared}):  ${quantiles(worstYear)}`);
console.log(`Jahresprofil Wind (${yearCompared}):   ${quantiles(worstWind)}`);
console.log(`Stromwert Euro (${valueCompared}):      ${quantiles(worstEuro)}`);
console.log(`Einspeise-Euro (${valueCompared}):      ${quantiles(worstFeedIn)}`);
writeFileSync('scripts/.cache/era5-archive/vergleich-ergebnis.json', JSON.stringify({ generatedAt: new Date().toISOString(), stockDate, rows }, null, 1));
console.log('Einzelwerte in scripts/.cache/era5-archive/vergleich-ergebnis.json');
