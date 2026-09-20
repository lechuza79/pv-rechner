/**
 * Which archive model gets summer heat right: ERA5 or ERA5-Land?
 *
 *   npm run klima:kuehlgrad-gegen-messung -- --jahr=2025 --stationen=60
 *
 * Cooling-degree hours (above the calculator's base temperature, May to
 * September German time) from DWD station observations (CDC, hourly air
 * temperature, open data) against both reanalyses at the same place, with the
 * provider's cell choice and height correction. The old page values came from
 * the hosted archive's default, which for temperature leans on ERA5-Land; ours
 * came from ERA5. Which one to use is decided by this measurement.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { initWasm } from '@openmeteo/file-reader';
import { cdhFromHourly } from '../lib/aircon';
import { DEFAULT_AIRCON_CONFIG as CFG } from '../lib/aircon-config';
import { era5Weather } from '../lib/era5-weather';
import { era5Orography } from '../lib/era5-orography';
import { SEA_MARKER, selectCell, temperatureOffset, type RegularGrid } from '../lib/regular-grid';
import { berlinTagesgrenzen } from '../lib/zeit';
import { readOrography, readWindow } from './open-data-window';

const arg = (key: string, fallback: string) =>
  process.argv.find((a) => a.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const YEAR = Number(arg('jahr', '2025'));
const COUNT = Number(arg('stationen', '60'));
const DIR = 'scripts/.cache/dwd-tu';
const CDC = 'https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/hourly/air_temperature/';
const LAND_BASE = 'https://openmeteo.s3.amazonaws.com/data/copernicus_era5_land/';
const LAND_GRID: RegularGrid = { nx: 3600, ny: 1801, latMin: -90, lonMin: -180, dx: 0.1, dy: 0.1, searchRadius: 1 };
const LAND_WINDOW = { rowFrom: 1368, rowTo: 1456, columnFrom: 1852, columnTo: 1960 };

const get = async (url: string) => {
  const response = await fetch(url, { headers: { 'user-agent': 'solar-check.io kuehlgrad check' }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};

async function main() {
  await initWasm();
  mkdirSync(DIR, { recursive: true });
  const [from] = berlinTagesgrenzen(new Date(`${YEAR}-05-01T12:00:00Z`));
  const [to] = berlinTagesgrenzen(new Date(`${YEAR}-10-01T12:00:00Z`));
  const fromHour = from / 3600000;
  const hours = to / 3600000 - fromHour;

  // Stations with a full record over the summer, spread by taking every n-th.
  const archive = YEAR >= new Date().getFullYear() - 1 ? 'recent' : 'historical';
  const list = (await get(CDC + archive + '/TU_Stundenwerte_Beschreibung_Stationen.txt')).toString('latin1');
  const all = list.split('\n').slice(2).map((l) => l.trim().split(/\s+/)).filter((p) => p.length > 6)
    .map((p) => ({ id: p[0], von: p[1], bis: p[2], elevation: Number(p[3]), latitude: Number(p[4]), longitude: Number(p[5]), name: p[6] }))
    .filter((s) => s.von <= `${YEAR}0401` && s.bis >= `${YEAR}1001`);
  const step = Math.max(1, Math.floor(all.length / COUNT));
  const stations = all.filter((_, i) => i % step === 0).slice(0, COUNT);
  const index = await get(CDC + archive + '/');
  const zips = [...index.toString('latin1').matchAll(/href="(stundenwerte_TU_(\d{5})_[^"]+\.zip)"/g)];

  const landOrography = await readOrography(LAND_BASE, LAND_WINDOW, SEA_MARKER);
  const land = await readWindow({ base: LAND_BASE, variable: 'temperature_2m', chunkHours: 504, window: LAND_WINDOW, firstHour: fromHour, hours });
  const landColumns = LAND_WINDOW.columnTo - LAND_WINDOW.columnFrom;

  const rows: { name: string; measured: number; era5: number; land: number }[] = [];
  for (const station of stations) {
    const zip = zips.find((m) => m[2] === station.id)?.[1];
    if (!zip) continue;
    const path = `${DIR}/${zip}`;
    if (!existsSync(path)) writeFileSync(path, await get(CDC + archive + '/' + zip));
    const produkt = execSync(`unzip -Z1 ${path}`).toString().split('\n').find((f) => f.startsWith('produkt_tu_stunde'));
    if (!produkt) continue;
    const text = execSync(`unzip -p ${path} ${produkt}`, { maxBuffer: 512 * 1024 * 1024 }).toString('latin1');
    const measured = new Map<number, number>();
    for (const line of text.split('\n').slice(1)) {
      const p = line.split(';').map((x) => x.trim());
      if (p.length < 4) continue;
      const t = Number(p[3]);
      if (t <= -999) continue;
      const d = p[1];
      measured.set(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), +d.slice(8, 10)) / 3600000, t);
    }
    const obs: number[] = [];
    for (let h = fromHour; h < fromHour + hours; h++) if (measured.has(h)) obs.push(measured.get(h)!);
    if (obs.length < hours * 0.98) continue; // gaps would read as cool hours

    const era5 = era5Weather({
      latitude: station.latitude, longitude: station.longitude, targetElevation: station.elevation,
      startDate: new Date(from).toISOString().slice(0, 10), endDate: new Date(to - 3600000).toISOString().slice(0, 10),
      wind: false, orography: era5Orography,
    });
    const era5Temps = era5.weather.hourly.time
      .map((t, i) => [Date.parse(t + 'Z') / 3600000, era5.weather.hourly.temperature_2m[i]] as const)
      .filter(([h]) => h >= fromHour && h < fromHour + hours && measured.has(h)).map(([, v]) => v);

    const cell = selectCell(LAND_GRID, station.latitude, station.longitude, station.elevation, landOrography);
    const offset = temperatureOffset(cell, station.elevation);
    const at = (cell.row - LAND_WINDOW.rowFrom) * landColumns + (cell.column - LAND_WINDOW.columnFrom);
    const landTemps: number[] = [];
    for (let h = 0; h < hours; h++) if (measured.has(fromHour + h)) landTemps.push(Math.round((land[at * hours + h] + offset) * 10) / 10);
    if (landTemps.some((v) => !Number.isFinite(v))) continue;

    rows.push({
      name: station.name,
      measured: cdhFromHourly(obs, CFG.coolBaseTemp),
      era5: cdhFromHourly(era5Temps, CFG.coolBaseTemp),
      land: cdhFromHourly(landTemps, CFG.coolBaseTemp),
    });
  }
  const q = (xs: number[], p: number) => xs.slice().sort((a, b) => a - b)[Math.floor(p * (xs.length - 1))];
  const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)} %`;
  for (const key of ['era5', 'land'] as const) {
    const rel = rows.filter((r) => r.measured > 200).map((r) => r[key] / r.measured - 1);
    const sumRel = rows.reduce((a, r) => a + r[key], 0) / rows.reduce((a, r) => a + r.measured, 0) - 1;
    console.log(`${key === 'era5' ? 'ERA5     ' : 'ERA5-Land'}: Summe ${pct(sumRel)} · je Station Median ${pct(q(rel, 0.5))}, Spanne p10 ${pct(q(rel, 0.1))} bis p90 ${pct(q(rel, 0.9))}`);
  }
  console.log(`${rows.length} Stationen, Sommer ${YEAR}, Basis ${CFG.coolBaseTemp} °C.`);
  writeFileSync(`${DIR}/ergebnis-${YEAR}.json`, JSON.stringify(rows, null, 1));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
