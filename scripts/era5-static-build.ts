/**
 * Build the two static inputs the ERA5 reader needs, from the open archive.
 *
 * Both are fixed grids that never change with the weather, so they are built
 * once and then live in the repository: the model surface height of every
 * German ERA5 cell, and the 90 m ground height of every municipality's weather
 * point. Without the second the hosted API's cell choice and its temperature
 * correction cannot be reproduced at all.
 *
 *   npm run era5:static -- --orographie
 *   npm run era5:static -- --hoehen
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { initWasm, LruBlockCache, OmDataType, OmHttpBackend } from '@openmeteo/file-reader';
import { ERA5_WINDOW, ERA5_WINDOW_COLUMNS, ERA5_WINDOW_ROWS } from '../lib/era5-archive';
import { ERA5_SEA_MARKER } from '../lib/era5-grid';

const CACHE = new LruBlockCache(1024 * 1024, 1024);
const BASE = 'https://openmeteo.s3.amazonaws.com/data/';
const OROGRAPHY_FILE = 'lib/era5-orography-de.json';
const ELEVATION_FILE = 'scripts/.cache/era5-archive/point-elevation.json';
const flag = (key: string) => process.argv.includes('--' + key);
const arg = (key: string, fallback = '') =>
  process.argv.find((a) => a.startsWith('--' + key + '='))?.slice(key.length + 3) ?? fallback;
const atomic = (path: string, data: unknown) => {
  mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  writeFileSync(path + '.tmp', JSON.stringify(data));
  renameSync(path + '.tmp', path);
};

async function orography() {
  const url = BASE + 'copernicus_era5/static/HSURF.om';
  const reader = await new OmHttpBackend({ url, eTagValidation: false }).asCachedReader(CACHE);
  const values = await reader.read({
    type: OmDataType.FloatArray,
    ranges: [
      { start: ERA5_WINDOW.rowFrom, end: ERA5_WINDOW.rowTo },
      { start: ERA5_WINDOW.columnFrom, end: ERA5_WINDOW.columnTo },
    ],
  });
  // Whole metres: the archive stores the model height in integral steps, and a
  // rounded value keeps the committed file readable and small.
  const heights = Array.from(values, (value) => (value <= ERA5_SEA_MARKER ? ERA5_SEA_MARKER : Math.round(value)));
  if (heights.length !== ERA5_WINDOW_ROWS * ERA5_WINDOW_COLUMNS) throw new Error('Unerwartete Fenstergröße.');
  atomic(OROGRAPHY_FILE, {
    note: 'Model surface height of the German ERA5 window; -999 marks sea. Built by scripts/era5-static-build.ts.',
    sourceUrl: url,
    retrievedAt: new Date().toISOString(),
    rowFrom: ERA5_WINDOW.rowFrom,
    columnFrom: ERA5_WINDOW.columnFrom,
    rows: ERA5_WINDOW_ROWS,
    columns: ERA5_WINDOW_COLUMNS,
    heights,
  });
  const land = heights.filter((value) => value > ERA5_SEA_MARKER).length;
  console.log(`Orographie gespeichert: ${heights.length} Zellen, davon ${land} Land.`);
}

/**
 * Ground height of every weather point, read band by band.
 *
 * The elevation model is split into one file per degree of latitude and each
 * costs about twenty seconds to open, so the points are grouped by band and
 * every band is opened once. Points already known are skipped, which makes a
 * repeated run free and an interrupted one cheap.
 */
async function elevations() {
  const pointsPath = arg('punkte', 'scripts/.cache/era5-archive/points.json');
  if (!existsSync(pointsPath)) throw new Error(`Punktliste ${pointsPath} fehlt (siehe --punkte=).`);
  const points = JSON.parse(readFileSync(pointsPath, 'utf8')) as { id: string; latitude: number; longitude: number }[];
  const known: Record<string, number> = existsSync(ELEVATION_FILE)
    ? JSON.parse(readFileSync(ELEVATION_FILE, 'utf8')).elevations
    : {};
  const open = points.filter((point) => known[pointKey(point.latitude, point.longitude)] === undefined);
  console.log(`${points.length} Punkte, ${points.length - open.length} bekannt, ${open.length} offen.`);
  const bands = new Map<number, typeof open>();
  for (const point of open) {
    const band = Math.floor(point.latitude);
    if (!bands.has(band)) bands.set(band, []);
    bands.get(band)!.push(point);
  }
  for (const [band, list] of Array.from(bands).sort((a, b) => a[0] - b[0])) {
    const url = `${BASE}copernicus_dem90/static/lat_${band}.om`;
    const started = Date.now();
    const reader = await new OmHttpBackend({ url, eTagValidation: false }).asCachedReader(CACHE);
    const [, columns] = reader.getDimensions().map(Number);
    // Pixels per degree of longitude shrink towards the poles (1200 below 50°N,
    // 800 above); the file's own width says which applies.
    const perDegree = columns / 360;
    for (const point of list) {
      const { row, column } = demPixel(point.latitude, point.longitude, perDegree);
      const value = await reader.read({
        type: OmDataType.FloatArray,
        ranges: [{ start: row, end: row + 1 }, { start: column, end: column + 1 }],
      });
      if (!Number.isFinite(value[0])) throw new Error(`Keine Höhe für ${point.id}.`);
      known[pointKey(point.latitude, point.longitude)] = Math.round(value[0]);
    }
    reader.dispose?.();
    atomic(ELEVATION_FILE, { sourceBase: BASE + 'copernicus_dem90/static/', retrievedAt: new Date().toISOString(), elevations: known });
    console.log(`  Band ${band}: ${list.length} Punkte in ${Math.round((Date.now() - started) / 1000)}s`);
  }
  console.log(`Höhen gespeichert: ${Object.keys(known).length}.`);
}

/**
 * Pixel of the 90 m elevation model, computed as `Dem90.read` does in
 * `Sources/App/Dem/DownloadDem.swift`: in single precision and truncated.
 * Double precision lands one pixel off often enough to matter in the mountains —
 * Oberstdorf read 1448 m instead of the provider's 1393 m, 0.36 K of
 * temperature (measured 18.09.2026).
 */
export function demPixel(latitude: number, longitude: number, perDegree: number) {
  const f = Math.fround;
  const row = Math.floor(f(f(f(latitude) * 1200) + 108000)) % 1200;
  const column = Math.floor(f(f(f(longitude) + 180) * f(perDegree)));
  return { row, column };
}

/** Six decimals: finer than the elevation model resolves, stable as a key. */
export function pointKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

async function main() {
  await initWasm();
  if (flag('orographie')) await orography();
  if (flag('hoehen')) await elevations();
  if (!flag('orographie') && !flag('hoehen')) console.log('--orographie und/oder --hoehen angeben.');
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
