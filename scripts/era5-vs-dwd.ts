/**
 * Hold ERA5 global radiation against what DWD stations actually measured.
 *
 * The parity checks prove we read ERA5 exactly as the provider serves it; they
 * say nothing about whether ERA5 matches the sky. This does: daily sums of
 * measured global radiation (DWD climate stations, `daily/solar`, FG_STRAHL in
 * J/cm²) against ERA5 at the same place, per month.
 *
 *   npm run era5:gegen-messung -- --messung=/pfad/zu/tageswerte_ST_*.zip-ordner
 */
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { era5Weather } from '../lib/era5-weather';
import { era5Orography } from '../lib/era5-orography';

const arg = (key: string, fallback = '') =>
  process.argv.find((a) => a.startsWith('--' + key + '='))?.slice(key.length + 3) ?? fallback;
const dir = arg('messung', '/tmp/dsol');
const months = arg('monate', '2025-01,2025-02,2025-03,2025-04,2025-05,2025-06,2025-07,2025-08,2025-09,2025-10,2025-11,2025-12,2026-08').split(',');

type Station = { id: string; name: string; latitude: number; longitude: number; elevation: number };
const stations: Station[] = readFileSync(dir + '/st.txt', 'latin1')
  .split('\n').slice(2).map((line) => line.trim().split(/\s+/)).filter((p) => p.length > 6)
  .map((p) => ({ id: p[0], elevation: Number(p[3]), latitude: Number(p[4]), longitude: Number(p[5]), name: p[6] }));

const results: { station: string; month: string; era5: number; measured: number }[] = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('_row.zip'))) {
  const id = file.match(/_(\d{5})_/)![1];
  const station = stations.find((s) => s.id === id);
  if (!station) continue;
  const text = execSync(`unzip -p "${dir}/${file}" "produkt*"`, { encoding: 'latin1', maxBuffer: 64 * 1024 * 1024 });
  const measured = new Map<string, number>(); // day -> kWh/m²
  for (const line of text.split('\n').slice(1)) {
    const f = line.split(';');
    if (f.length < 6) continue;
    const value = Number(f[5]);
    if (!(value >= 0)) continue; // -999 = missing
    const d = f[1].trim();
    measured.set(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, (value * 10000) / 3.6e6);
  }
  for (const month of months) {
    const [y, m] = month.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const start = `${month}-01`, end = `${month}-${String(last).padStart(2, '0')}`;
    let weather;
    try {
      weather = era5Weather({ latitude: station.latitude, longitude: station.longitude, targetElevation: station.elevation, startDate: start, endDate: end, wind: false, orography: era5Orography });
    } catch { continue; }
    let era5 = 0, obs = 0, days = 0;
    for (let day = 1; day <= last; day++) {
      const key = `${month}-${String(day).padStart(2, '0')}`;
      const value = measured.get(key);
      if (value === undefined) continue;
      const hours = weather.weather.hourly.shortwave_radiation.slice((day - 1) * 24, day * 24);
      era5 += hours.reduce((sum, w) => sum + w, 0) / 1000;
      obs += value;
      days++;
    }
    // A month counts only when every day was measured; a gap would bias the ratio.
    if (days === last) results.push({ station: station.name, month, era5, measured: obs });
  }
}

const pct = (x: number) => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + ' %';
console.log('Monat     Stationen  ERA5 gegen Messung: Median   10–90 %-Bereich');
for (const month of months) {
  const r = results.filter((x) => x.month === month).map((x) => x.era5 / x.measured - 1).sort((a, b) => a - b);
  if (!r.length) { console.log(month, ' keine vollständigen Messmonate'); continue; }
  const q = (p: number) => r[Math.min(r.length - 1, Math.floor(r.length * p))];
  console.log(`${month}   ${String(r.length).padStart(4)}       ${pct(q(0.5)).padStart(8)}   ${pct(q(0.1))} .. ${pct(q(0.9))}`);
}
const year = new Map<string, { e: number; m: number; n: number }>();
for (const x of results.filter((r) => r.month.startsWith('2025'))) {
  const agg = year.get(x.station) ?? { e: 0, m: 0, n: 0 };
  agg.e += x.era5; agg.m += x.measured; agg.n++; year.set(x.station, agg);
}
const full = Array.from(year.entries()).filter(([, a]) => a.n === 12).map(([s, a]) => ({ s, r: a.e / a.m - 1 })).sort((a, b) => a.r - b.r);
if (full.length) {
  const q = (p: number) => full[Math.min(full.length - 1, Math.floor(full.length * p))].r;
  console.log(`\nJahr 2025, ${full.length} Stationen mit allen zwölf Monaten: Median ${pct(q(0.5))}, 10–90 % ${pct(q(0.1))} .. ${pct(q(0.9))}`);
  console.log('Extreme:', full.slice(0, 2).concat(full.slice(-2)).map((x) => `${x.s} ${pct(x.r)}`).join(' · '));
}
