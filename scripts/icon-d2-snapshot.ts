/**
 * Hourly snapshot of the DWD ICON-D2 model per postcode, for the live weather.
 *
 *   npm run wetter:schnappschuss            (lädt in den Speicher der Seite)
 *   npm run wetter:schnappschuss -- --lokal (schreibt nach scripts/.cache/icon-d2/)
 *
 * Reads the German window of each variable from Open-Meteo's open data archive
 * for the hours around now, picks the grid cell the hosted API would pick for
 * each postcode, moves the temperature to the postcode's height, and writes one
 * small file per two-digit postcode area. A page then reads one file of a few
 * kilobytes instead of the archive.
 *
 * Refuses rather than writes when the archive does not cover the window — a
 * snapshot with a hole would show a clear sky that nobody measured or modelled.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { initWasm, LruBlockCache, OmDataType, OmHttpBackend } from '@openmeteo/file-reader';
import { createClient } from '@supabase/supabase-js';
import {
  ICON_D2_BASE,
  ICON_D2_CHUNK_HOURS,
  ICON_D2_GRID,
  ICON_D2_VARIABLE_NAMES,
  ICON_D2_VARIABLES,
  SNAPSHOT_BUCKET,
  SNAPSHOT_HOURS_AFTER,
  SNAPSHOT_HOURS_BEFORE,
  shardKey,
  snapshotPath,
  type IconD2Shard,
  type IconD2Variable,
} from '../lib/icon-d2';
import { SEA_MARKER, selectCell, temperatureOffset } from '../lib/regular-grid';
import plzCoordinates from '../public/plz.json';
import plzElevation from '../lib/plz-elevation.json';
import plzWeatherPoint from '../lib/plz-weather-point.json';

const flag = (key: string) => process.argv.includes('--' + key);
const CACHE = new LruBlockCache(1024 * 1024, 2048);
/** Germany plus one cell of margin, in grid indices. */
const WINDOW = { rowFrom: 191, rowTo: 607, columnFrom: 472, columnTo: 973 };
const ROWS = WINDOW.rowTo - WINDOW.rowFrom;
const COLUMNS = WINDOW.columnTo - WINDOW.columnFrom;
const PARALLEL = 4;

async function reader(path: string) {
  return new OmHttpBackend({ url: ICON_D2_BASE + path, eTagValidation: false }).asCachedReader(CACHE);
}

async function main() {
  await initWasm();
  const meta = (await (await fetch(ICON_D2_BASE + 'static/meta.json', { signal: AbortSignal.timeout(30000) })).json()) as {
    data_end_time: number;
    last_run_initialisation_time: number;
  };
  const nowHour = Math.floor(Date.now() / 3600000);
  const firstHour = nowHour - SNAPSHOT_HOURS_BEFORE;
  const hours = SNAPSHOT_HOURS_BEFORE + SNAPSHOT_HOURS_AFTER + 1;
  const endHour = Math.floor(meta.data_end_time / 3600);
  if (firstHour + hours - 1 > endHour) {
    throw new Error(`Modell reicht nur bis ${new Date(endHour * 3600000).toISOString()}; Schnappschuss nicht vollständig.`);
  }

  // Model orography for the cell choice, window only.
  const orographyReader = await reader('static/HSURF.om');
  const orographyWindow = await orographyReader.read({
    type: OmDataType.FloatArray,
    ranges: [{ start: WINDOW.rowFrom, end: WINDOW.rowTo }, { start: WINDOW.columnFrom, end: WINDOW.columnTo }],
  });
  const orography = (row: number, column: number) => {
    const r = row - WINDOW.rowFrom;
    const c = column - WINDOW.columnFrom;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLUMNS) return SEA_MARKER;
    return orographyWindow[r * COLUMNS + c];
  };

  // One window per variable over the snapshot hours; a window may span two chunks.
  const windows = new Map<IconD2Variable, Float32Array>();
  const started = Date.now();
  let cursor = 0;
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      while (cursor < ICON_D2_VARIABLE_NAMES.length) {
        const variable = ICON_D2_VARIABLE_NAMES[cursor++];
        const out = new Float32Array(ROWS * COLUMNS * hours).fill(Number.NaN);
        for (let chunk = Math.floor(firstHour / ICON_D2_CHUNK_HOURS); chunk <= Math.floor((firstHour + hours - 1) / ICON_D2_CHUNK_HOURS); chunk++) {
          const from = Math.max(firstHour, chunk * ICON_D2_CHUNK_HOURS);
          const to = Math.min(firstHour + hours, (chunk + 1) * ICON_D2_CHUNK_HOURS);
          const r = await reader(`${variable}/chunk_${chunk}.om`);
          const part = await r.read({
            type: OmDataType.FloatArray,
            ranges: [
              { start: WINDOW.rowFrom, end: WINDOW.rowTo },
              { start: WINDOW.columnFrom, end: WINDOW.columnTo },
              { start: from - chunk * ICON_D2_CHUNK_HOURS, end: to - chunk * ICON_D2_CHUNK_HOURS },
            ],
          });
          const span = to - from;
          for (let cell = 0; cell < ROWS * COLUMNS; cell++) {
            for (let h = 0; h < span; h++) out[cell * hours + (from - firstHour) + h] = part[cell * span + h];
          }
        }
        windows.set(variable, out);
        console.log(`  ${variable} gelesen (${Math.round((Date.now() - started) / 1000)}s)`);
      }
    }),
  );

  const coordinates = plzCoordinates as unknown as Record<string, [number, number]>;
  const elevations = (plzElevation as { elevations: Record<string, number> }).elevations;
  const shards = new Map<string, IconD2Shard>();
  let missingHeight = 0, gaps = 0;
  const base = {
    version: 1 as const,
    model: 'dwd_icon_d2' as const,
    runInit: new Date(meta.last_run_initialisation_time * 1000).toISOString(),
    generatedAt: new Date().toISOString(),
    firstHour: new Date(firstHour * 3600000).toISOString(),
    hours,
    variables: ICON_D2_VARIABLE_NAMES,
    scale: { ...ICON_D2_VARIABLES } as Record<IconD2Variable, number>,
  };
  // Where the centroid sits on a mountain above the town, read the town
  // (scripts/plz-wetterpunkt-build.ts); otherwise the centroid as before.
  const townPoints = (plzWeatherPoint as { points: Record<string, { latitude: number; longitude: number; elevation: number }> }).points;
  for (const [plz, centroid] of Object.entries(coordinates)) {
    const town = townPoints[plz];
    const [latitude, longitude] = town ? [town.latitude, town.longitude] : centroid;
    const elevation = town ? town.elevation : elevations[plz];
    if (elevation === undefined) { missingHeight++; continue; }
    const cell = selectCell(ICON_D2_GRID, latitude, longitude, elevation, orography);
    const index = (cell.row - WINDOW.rowFrom) * COLUMNS + (cell.column - WINDOW.columnFrom);
    if (index < 0 || index >= ROWS * COLUMNS) { gaps++; continue; }
    const offset = temperatureOffset(cell, elevation);
    const values = ICON_D2_VARIABLE_NAMES.map((variable) => {
      const window = windows.get(variable)!;
      const scale = ICON_D2_VARIABLES[variable];
      return Array.from({ length: hours }, (_, h) => {
        const raw = window[index * hours + h];
        if (!Number.isFinite(raw)) return null;
        const value = variable === 'temperature_2m' ? raw + offset : raw;
        return Math.round(value * scale);
      });
    });
    if (values.some((series) => series.some((value) => value === null))) gaps++;
    const key = shardKey(plz);
    if (!shards.has(key)) shards.set(key, { ...base, points: {} });
    shards.get(key)!.points[plz] = { cell: [Number(cell.latitude.toFixed(2)), Number(cell.longitude.toFixed(2))], elevation, values };
  }
  // A handful of gaps is the edge of the model domain; many mean a broken read.
  const total = Object.keys(coordinates).length;
  if (gaps > total * 0.01) throw new Error(`${gaps} Postleitzahlen mit Lücken; Schnappschuss wird nicht geschrieben.`);
  console.log(`${total - missingHeight - gaps} Postleitzahlen, ${shards.size} Dateien, ${missingHeight} ohne Höhe, ${gaps} mit Lücken.`);

  if (flag('lokal')) {
    const dir = 'scripts/.cache/icon-d2';
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
  await supabase.storage.createBucket(SNAPSHOT_BUCKET, { public: false }).catch(() => undefined);
  let written = 0;
  for (const [shard, content] of Array.from(shards)) {
    const { error } = await supabase.storage
      .from(SNAPSHOT_BUCKET)
      .upload(snapshotPath(shard), JSON.stringify(content), { upsert: true, contentType: 'application/json', cacheControl: '300' });
    if (error) throw new Error(`Hochladen ${shard}: ${error.message}`);
    written++;
  }
  console.log(`${written} Dateien hochgeladen; Modelllauf ${base.runInit}, gültig ab ${base.firstHour} für ${hours} Stunden.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
void readFileSync;
