/**
 * Daily temperature maxima for the next 16 German calendar days, per postcode.
 *
 *   npm run wetter:vorhersage            (lädt in den Speicher der Seite)
 *   npm run wetter:vorhersage -- --lokal (schreibt nach scripts/.cache/icon-d2/vorhersage/)
 *
 * The same model chain the hosted API answers with for Germany ("best match"):
 * DWD ICON as far as it reaches (about 7.5 days), then ECMWF IFS (to about 14
 * days), then NOAA GFS. Measured against the API, not assumed: identical where
 * the same model is used, see docs/era5-archiv-umstellung.md. Both read
 * from Open-Meteo's open data archive, cell chosen by height like the API, the
 * temperature moved to the postcode's height. The heat-wave notice reads one
 * small file per two-digit postcode area; no weather service is called per
 * visitor.
 *
 * Refuses rather than writes when a day is not fully covered — a missing
 * afternoon would read as a cool day.
 */
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { initWasm } from '@openmeteo/file-reader';
import { createClient } from '@supabase/supabase-js';
import { readOrography, readWindow, type GridWindow } from './open-data-window';
import { SEA_MARKER, selectCell, temperatureOffset, type RegularGrid } from '../lib/regular-grid';
import { SNAPSHOT_BUCKET, shardKey } from '../lib/icon-d2';
import { FORECAST_DAYS, forecastPath, type ForecastShard } from '../lib/wetter-vorhersage';
import { berlinTagesgrenzen, heuteInBerlin } from '../lib/zeit';
import plzCoordinates from '../public/plz.json';
import plzElevation from '../lib/plz-elevation.json';
import plzWeatherPoint from '../lib/plz-weather-point.json';

type Model = {
  name: 'dwd_icon' | 'ecmwf_ifs025' | 'ncep_gfs013';
  base: string;
  grid: RegularGrid;
  window: GridWindow;
  /** Time step of the archive in hours; its time axis counts steps. */
  stepHours: 1 | 3;
  /**
   * A 3-hourly model is interpolated linearly to hours, as the API does. Its
   * own step maximum would catch peaks between steps better, but it measured
   * 0.5–1.5 K above the API's daily maximum — and the point of this file is
   * to say what the API said.
   */
  variable: 'temperature_2m';
};

// Germany plus a cell of margin. ICON global: 0.125° from −90/−180.
const MODELS: Model[] = [
  {
    name: 'dwd_icon',
    base: 'https://openmeteo.s3.amazonaws.com/data/dwd_icon/',
    grid: { nx: 2879, ny: 1441, latMin: -90, lonMin: -180, dx: 0.125, dy: 0.125, searchRadius: 1 },
    window: { rowFrom: 1095, rowTo: 1170, columnFrom: 1485, columnTo: 1566 },
    stepHours: 1,
    variable: 'temperature_2m',
  },
  {
    name: 'ecmwf_ifs025',
    base: 'https://openmeteo.s3.amazonaws.com/data/ecmwf_ifs025/',
    grid: { nx: 1440, ny: 721, latMin: -90, lonMin: -180, dx: 0.25, dy: 0.25, searchRadius: 1 },
    window: { rowFrom: 547, rowTo: 585, columnFrom: 742, columnTo: 783 },
    stepHours: 3,
    variable: 'temperature_2m',
  },
  {
    // Surface fields of GFS live in the 0.13° set, not the 0.25° one. The grid
    // is Gaussian in truth; the provider reads it as regular with these
    // constants (GfsDomain.gfs013), and so do we.
    name: 'ncep_gfs013',
    base: 'https://openmeteo.s3.amazonaws.com/data/ncep_gfs013/',
    grid: { nx: 3072, ny: 1536, latMin: -0.11714935 * 767.5, lonMin: -180, dx: 360 / 3072, dy: 0.11714935, searchRadius: 1 },
    window: { rowFrom: 1165, rowTo: 1251, columnFrom: 1581, columnTo: 1674 },
    stepHours: 1,
    variable: 'temperature_2m',
  },
];

const flag = (key: string) => process.argv.includes('--' + key);

async function main() {
  await initWasm();
  const [dayStart] = berlinTagesgrenzen(new Date());
  // Day boundaries of the 16 German days; DST days are 23 or 25 hours long.
  const bounds: number[] = [dayStart];
  for (let d = 0; d < FORECAST_DAYS; d++) {
    const [, end] = berlinTagesgrenzen(new Date(bounds[d] + 12 * 3600000));
    bounds.push(end);
  }
  const days = bounds.slice(0, FORECAST_DAYS).map((ms) => heuteInBerlin(new Date(ms + 12 * 3600000)));
  // Temperature at hour h is instantaneous.
  const firstHour = dayStart / 3600000;
  const hours = bounds[FORECAST_DAYS] / 3600000 - firstHour;

  const coordinates = plzCoordinates as unknown as Record<string, [number, number]>;
  const elevations = (plzElevation as { elevations: Record<string, number> }).elevations;
  const townPoints = (plzWeatherPoint as { points: Record<string, { latitude: number; longitude: number; elevation: number }> }).points;

  // Per model: its run, how far it reaches, and each postcode's hourly series.
  const perModel: { name: string; runInit: string; endHour: number; series: Map<string, Float32Array> }[] = [];
  for (const model of MODELS) {
    const meta = (await (await fetch(model.base + 'static/meta.json', { signal: AbortSignal.timeout(30000) })).json()) as {
      data_end_time: number;
      last_run_initialisation_time: number;
      chunk_time_length: number;
    };
    const orography = await readOrography(model.base, model.window, SEA_MARKER);
    // Read in the archive's own steps. The run's stated end time lags what is
    // already written (ECMWF: 6 days stated, about 14 present, and the API
    // serves those), so read everything and let missing values be NaN.
    const step = model.stepHours;
    const firstStep = Math.floor(firstHour / step);
    const lastStep = Math.ceil((firstHour + hours - 1) / step) + 1;
    const steps = lastStep - firstStep + 1;
    const values = await readWindow({
      base: model.base,
      variable: model.variable,
      chunkHours: meta.chunk_time_length,
      window: model.window,
      firstHour: firstStep,
      hours: steps,
      missingChunksOk: true,
    });
    const columns = model.window.columnTo - model.window.columnFrom;
    const series = new Map<string, Float32Array>();
    let reachHour = firstHour - 1;
    for (const [plz, centroid] of Object.entries(coordinates)) {
      const town = townPoints[plz];
      const [latitude, longitude] = town ? [town.latitude, town.longitude] : centroid;
      const elevation = town ? town.elevation : elevations[plz];
      if (elevation === undefined) continue;
      const cell = selectCell(model.grid, latitude, longitude, elevation, orography);
      const index = (cell.row - model.window.rowFrom) * columns + (cell.column - model.window.columnFrom);
      const offset = temperatureOffset(cell, elevation);
      const out = new Float32Array(hours).fill(Number.NaN);
      for (let h = 0; h < hours; h++) {
        const position = (firstHour + h) / step - firstStep;
        const lower = Math.floor(position);
        const fraction = position - lower;
        const a = values[index * steps + lower];
        const value = fraction === 0 ? a : a + (values[index * steps + lower + 1] - a) * fraction;
        out[h] = value + offset;
        if (Number.isFinite(out[h])) reachHour = Math.max(reachHour, firstHour + h);
      }
      series.set(plz, out);
    }
    // How far values really exist (the archive's end time can run ahead of
    // the last written step).
    perModel.push({
      name: model.name,
      runInit: new Date(meta.last_run_initialisation_time * 1000).toISOString(),
      endHour: reachHour,
      series,
    });
    console.log(`  ${model.name}: Lauf ${perModel.at(-1)!.runInit}, Werte bis ${new Date(reachHour * 3600000).toISOString()}`);
  }

  // Just after German midnight the window gains a sixteenth day that the
  // newest GFS run in the archive does not reach yet (12Z + 384 h ends at
  // noon UTC of that day; the 18Z run arrives around midnight). That is not a
  // data hole but a run arriving late: keep the file from the previous run —
  // the reader drops its past day — and let the next run write. Only the last
  // day qualifies; if the chain falls short by more, GFS has stopped and the
  // refusal below turns the run red.
  const chainEnd = Math.max(...perModel.map((m) => m.endHour));
  if (chainEnd + 1 < bounds[FORECAST_DAYS] / 3600000 && chainEnd + 1 >= bounds[FORECAST_DAYS - 1] / 3600000) {
    console.log(`Neuester Lauf reicht nur bis ${new Date(chainEnd * 3600000).toISOString()}, der 16. Tag (${days.at(-1)}) ist noch nicht abgedeckt — bestehende Dateien bleiben, der nächste Lauf schreibt.`);
    return;
  }

  const shards = new Map<string, ForecastShard>();
  let incomplete = 0;
  for (const plz of Object.keys(coordinates)) {
    const chain = perModel.map((m) => ({ endHour: m.endHour, values: m.series.get(plz) }));
    if (chain.some((m) => !m.values)) continue;
    const maxima: number[] = [];
    let complete = true;
    for (let d = 0; d < FORECAST_DAYS && complete; d++) {
      let max = -Infinity;
      // Local hours 00 to 23, as the API forms its daily maximum.
      for (let hour = bounds[d] / 3600000; hour < bounds[d + 1] / 3600000; hour++) {
        const h = hour - firstHour;
        // The first model in the chain that reaches this hour: ICON, then
        // ECMWF, then GFS — the hosted API's own order for Germany.
        const source = chain.find((m) => hour <= m.endHour && Number.isFinite(m.values![h]));
        const value = source ? source.values![h] : Number.NaN;
        if (!Number.isFinite(value)) { complete = false; break; }
        max = Math.max(max, value);
      }
      maxima.push(Math.round(max * 10));
    }
    if (!complete) { incomplete++; continue; }
    const key = shardKey(plz);
    if (!shards.has(key)) {
      shards.set(key, {
        version: 1,
        generatedAt: new Date().toISOString(),
        runs: Object.fromEntries(perModel.map((m) => [m.name, m.runInit])) as ForecastShard['runs'],
        until: Object.fromEntries(perModel.map((m) => [m.name, new Date(m.endHour * 3600000).toISOString()])) as ForecastShard['until'],
        days,
        points: {},
      });
    }
    shards.get(key)!.points[plz] = maxima;
  }
  const total = Object.keys(coordinates).length;
  if (incomplete > total * 0.01) throw new Error(`${incomplete} Postleitzahlen ohne vollständige 16 Tage; nichts geschrieben.`);
  console.log(`${total - incomplete} Postleitzahlen, ${shards.size} Dateien, Tage ${days[0]} bis ${days.at(-1)}.`);

  if (flag('lokal')) {
    const dir = 'scripts/.cache/icon-d2/vorhersage';
    mkdirSync(dir, { recursive: true });
    for (const [key, shard] of Array.from(shards)) {
      writeFileSync(`${dir}/${key}.json.tmp`, JSON.stringify(shard));
      renameSync(`${dir}/${key}.json.tmp`, `${dir}/${key}.json`);
    }
    console.log('Lokal geschrieben nach', dir);
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase-Zugang fehlt (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL und SUPABASE_SERVICE_KEY).');
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  // The hourly snapshot usually creates the bucket; on a fresh project this
  // run may come first.
  await supabase.storage.createBucket(SNAPSHOT_BUCKET, { public: false }).catch(() => undefined);
  for (const [shard, content] of Array.from(shards)) {
    const { error } = await supabase.storage
      .from(SNAPSHOT_BUCKET)
      .upload(forecastPath(shard), JSON.stringify(content), { upsert: true, contentType: 'application/json', cacheControl: '3600' });
    if (error) throw new Error(`Hochladen ${shard}: ${error.message}`);
  }
  console.log(`${shards.size} Dateien hochgeladen.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
