/**
 * Reading a rectangle of an Open-Meteo open-data model over a span of hours.
 *
 * Shared by the hourly ICON-D2 snapshot and the 16-day forecast, so both read
 * the archive the same way: one window per variable, a window may span
 * several time chunks, missing values stay NaN for the caller to refuse.
 * Scripts only — the reader is GPL-2.0 and never ships to a page.
 */
import { LruBlockCache, OmDataType, OmHttpBackend } from '@openmeteo/file-reader';

export type GridWindow = { rowFrom: number; rowTo: number; columnFrom: number; columnTo: number };

const CACHE = new LruBlockCache(1024 * 1024, 2048);

export async function openDataReader(base: string, path: string) {
  return new OmHttpBackend({ url: base + path, eTagValidation: false }).asCachedReader(CACHE);
}

/** The model's static height field over the window, as an orography lookup. */
export async function readOrography(base: string, window: GridWindow, seaMarker: number) {
  const rows = window.rowTo - window.rowFrom;
  const columns = window.columnTo - window.columnFrom;
  const reader = await openDataReader(base, 'static/HSURF.om');
  const values = await reader.read({
    type: OmDataType.FloatArray,
    ranges: [{ start: window.rowFrom, end: window.rowTo }, { start: window.columnFrom, end: window.columnTo }],
  });
  return (row: number, column: number) => {
    const r = row - window.rowFrom;
    const c = column - window.columnFrom;
    if (r < 0 || r >= rows || c < 0 || c >= columns) return seaMarker;
    return values[r * columns + c];
  };
}

/** Values as [cell * hours + hour], cells row-major within the window. */
export async function readWindow(options: {
  base: string;
  variable: string;
  chunkHours: number;
  window: GridWindow;
  firstHour: number;
  hours: number;
  /** A forecast's future chunks may not exist yet; leave them NaN instead of failing. */
  missingChunksOk?: boolean;
}) {
  const { base, variable, chunkHours, window, firstHour, hours, missingChunksOk } = options;
  const cells = (window.rowTo - window.rowFrom) * (window.columnTo - window.columnFrom);
  const out = new Float32Array(cells * hours).fill(Number.NaN);
  for (let chunk = Math.floor(firstHour / chunkHours); chunk <= Math.floor((firstHour + hours - 1) / chunkHours); chunk++) {
    const from = Math.max(firstHour, chunk * chunkHours);
    const to = Math.min(firstHour + hours, (chunk + 1) * chunkHours);
    let reader;
    try {
      reader = await openDataReader(base, `${variable}/chunk_${chunk}.om`);
    } catch (error) {
      if (missingChunksOk && (error as { statusCode?: number }).statusCode === 404) continue;
      throw error;
    }
    const part = await reader.read({
      type: OmDataType.FloatArray,
      ranges: [
        { start: window.rowFrom, end: window.rowTo },
        { start: window.columnFrom, end: window.columnTo },
        { start: from - chunk * chunkHours, end: to - chunk * chunkHours },
      ],
    });
    const span = to - from;
    for (let cell = 0; cell < cells; cell++) {
      for (let h = 0; h < span; h++) out[cell * hours + (from - firstHour) + h] = part[cell * span + h];
    }
  }
  return out;
}
