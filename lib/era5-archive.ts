/**
 * Reading ERA5 hours out of the Open-Meteo open-data archive.
 *
 * The archive holds the same preprocessed ERA5 that the hosted API answers from
 * (bucket `s3://openmeteo`, AWS Open Data, CC-BY-4.0), stored as `.om` files
 * that serve single cells over HTTP range requests. We keep the German window
 * of each file on disk, so a municipality run touches the network once per
 * variable and 21-day block rather than once per place.
 *
 * Deliberately not the Copernicus Climate Data Store: that needs an account, a
 * manually accepted licence and a download queue, and its raw product would
 * still have to be converted into the hourly means the API already publishes.
 */
export const ERA5_ARCHIVE_BASE = 'https://openmeteo.s3.amazonaws.com/data/copernicus_era5/';
/** `chunk_time_length` from the archive's own `static/meta.json`. */
export const ERA5_CHUNK_HOURS = 504;
/** Names as they appear in the bucket. */
export const ERA5_VARIABLES = [
  'temperature_2m',
  'shortwave_radiation',
  'wind_u_component_100m',
  'wind_v_component_100m',
] as const;
export type Era5Variable = (typeof ERA5_VARIABLES)[number];

/**
 * The grid window we keep locally.
 *
 * One cell wider than Germany on every side, because the cell search may step
 * out of the nearest cell at the border.
 */
export const ERA5_WINDOW = { rowFrom: 548, rowTo: 583, columnFrom: 742, columnTo: 783 } as const;
export const ERA5_WINDOW_ROWS = ERA5_WINDOW.rowTo - ERA5_WINDOW.rowFrom;
export const ERA5_WINDOW_COLUMNS = ERA5_WINDOW.columnTo - ERA5_WINDOW.columnFrom;
export const ERA5_WINDOW_CELLS = ERA5_WINDOW_ROWS * ERA5_WINDOW_COLUMNS;

export function era5ChunkOf(hour: number) {
  return Math.floor(hour / ERA5_CHUNK_HOURS);
}
export function era5ChunkUrl(variable: Era5Variable, chunk: number) {
  return `${ERA5_ARCHIVE_BASE}${variable}/chunk_${chunk}.om`;
}
/** Hours since the Unix epoch; the archive's own time axis. */
export function era5HourOf(iso: string) {
  const value = Date.parse(iso);
  if (!Number.isFinite(value)) throw new Error('Unlesbarer Zeitpunkt: ' + iso);
  return Math.floor(value / 3600000);
}
export function era5IsoOf(hour: number) {
  return new Date(hour * 3600000).toISOString().slice(0, 16);
}

export function era5WindowHolds(row: number, column: number) {
  return (
    row >= ERA5_WINDOW.rowFrom &&
    row < ERA5_WINDOW.rowTo &&
    column >= ERA5_WINDOW.columnFrom &&
    column < ERA5_WINDOW.columnTo
  );
}
/** Position of a grid cell inside one stored window slice. */
export function era5WindowIndex(row: number, column: number) {
  if (!era5WindowHolds(row, column)) {
    throw new Error(`Rasterzelle ${row}/${column} liegt außerhalb des gespeicherten Ausschnitts.`);
  }
  return (row - ERA5_WINDOW.rowFrom) * ERA5_WINDOW_COLUMNS + (column - ERA5_WINDOW.columnFrom);
}

/**
 * Hours a window file covers, given its chunk.
 *
 * Stored layout is cell-major, exactly as the archive hands it over: all 504
 * hours of one cell lie next to each other, so a place reads one contiguous
 * slice instead of stepping through the file.
 */
export function era5ChunkRange(chunk: number) {
  return { from: chunk * ERA5_CHUNK_HOURS, to: (chunk + 1) * ERA5_CHUNK_HOURS };
}
export function era5ChunksFor(fromHour: number, toHour: number) {
  const chunks: number[] = [];
  for (let chunk = era5ChunkOf(fromHour); chunk <= era5ChunkOf(toHour - 1); chunk++) chunks.push(chunk);
  return chunks;
}

export const ERA5_META_URL = ERA5_ARCHIVE_BASE + 'static/meta.json';

/**
 * How far the archive currently reaches.
 *
 * ERA5 itself runs about five days behind, and the archive says where it
 * stands. Asking without checking gets a block whose later hours are simply
 * absent, and the error that follows blames the data rather than the calendar.
 */
export async function era5ArchiveEndHour(signal?: AbortSignal) {
  const response = await fetch(ERA5_META_URL, { signal: signal ?? AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Archiv-Stand nicht lesbar: HTTP ${response.status}`);
  const meta = (await response.json()) as { data_end_time?: number };
  if (typeof meta.data_end_time !== 'number') throw new Error('Archiv-Stand ohne Enddatum.');
  return Math.floor(meta.data_end_time / 3600);
}
