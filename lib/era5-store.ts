/**
 * Local store for the German window of the ERA5 archive.
 *
 * One file per variable and 21-day block, plus a manifest that is written only
 * after the data file is complete. A run that dies mid-download leaves a
 * temporary file and no manifest, so the next run redoes exactly that block and
 * nothing else.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, unlinkSync } from 'node:fs';
import {
  ERA5_CHUNK_HOURS,
  ERA5_WINDOW,
  ERA5_WINDOW_CELLS,
  ERA5_WINDOW_COLUMNS,
  ERA5_WINDOW_ROWS,
  era5ChunkRange,
  era5ChunkUrl,
  era5WindowIndex,
  type Era5Variable,
} from './era5-archive';

export const ERA5_STORE_ROOT = 'scripts/.cache/era5-archive';
/** Bump when the stored layout or the window changes; old blocks are then refetched. */
export const ERA5_STORE_LAYOUT = 2;

export type Era5BlockManifest = {
  layout: number;
  variable: Era5Variable;
  chunk: number;
  hourFrom: number;
  hourTo: number;
  rows: number;
  columns: number;
  rowFrom: number;
  columnFrom: number;
  values: number;
  sourceUrl: string;
  /** Last-Modified of the archive file, so a later revision is recognisable. */
  sourceLastModified: string | null;
  retrievedAt: string;
};

export function era5BlockPaths(variable: Era5Variable, chunk: number, root = ERA5_STORE_ROOT) {
  const dir = `${root}/${variable}`;
  return { dir, data: `${dir}/chunk_${chunk}.f32`, manifest: `${dir}/chunk_${chunk}.json` };
}

export function era5BlockReady(variable: Era5Variable, chunk: number, root = ERA5_STORE_ROOT) {
  const { data, manifest } = era5BlockPaths(variable, chunk, root);
  if (!existsSync(data) || !existsSync(manifest)) return false;
  try {
    const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as Era5BlockManifest;
    return (
      parsed.layout === ERA5_STORE_LAYOUT &&
      parsed.values === ERA5_WINDOW_CELLS * ERA5_CHUNK_HOURS &&
      parsed.rows === ERA5_WINDOW_ROWS &&
      parsed.columns === ERA5_WINDOW_COLUMNS
    );
  } catch {
    return false;
  }
}

/**
 * Write a finished block.
 *
 * The data file is renamed into place before the manifest is written, and the
 * manifest is what `era5BlockReady` believes. A half-written block can never be
 * mistaken for a complete one.
 */
export function era5WriteBlock(
  variable: Era5Variable,
  chunk: number,
  values: Float32Array,
  sourceLastModified: string | null,
  root = ERA5_STORE_ROOT,
  /** Where the values came from; a block before 2022 comes from year files. */
  sourceUrl = era5ChunkUrl(variable, chunk),
) {
  const expected = ERA5_WINDOW_CELLS * ERA5_CHUNK_HOURS;
  if (values.length !== expected) {
    throw new Error(`Block ${variable}/${chunk}: ${values.length} Werte statt ${expected}.`);
  }
  for (let index = 0; index < values.length; index++) {
    if (!Number.isFinite(values[index])) {
      throw new Error(`Block ${variable}/${chunk}: fehlender Wert an Stelle ${index}; wird nicht gespeichert.`);
    }
  }
  const { dir, data, manifest } = era5BlockPaths(variable, chunk, root);
  mkdirSync(dir, { recursive: true });
  const range = era5ChunkRange(chunk);
  writeFileSync(data + '.tmp', Buffer.from(values.buffer, values.byteOffset, values.byteLength));
  renameSync(data + '.tmp', data);
  const entry: Era5BlockManifest = {
    layout: ERA5_STORE_LAYOUT,
    variable,
    chunk,
    hourFrom: range.from,
    hourTo: range.to,
    rows: ERA5_WINDOW_ROWS,
    columns: ERA5_WINDOW_COLUMNS,
    rowFrom: ERA5_WINDOW.rowFrom,
    columnFrom: ERA5_WINDOW.columnFrom,
    values: expected,
    sourceUrl,
    sourceLastModified,
    retrievedAt: new Date().toISOString(),
  };
  writeFileSync(manifest + '.tmp', JSON.stringify(entry));
  renameSync(manifest + '.tmp', manifest);
  return entry;
}

export function era5ReadManifest(variable: Era5Variable, chunk: number, root = ERA5_STORE_ROOT) {
  const { manifest } = era5BlockPaths(variable, chunk, root);
  return JSON.parse(readFileSync(manifest, 'utf8')) as Era5BlockManifest;
}

/** Drop a block so the next run fetches it again. Used when a revision is found. */
export function era5DropBlock(variable: Era5Variable, chunk: number, root = ERA5_STORE_ROOT) {
  const { data, manifest } = era5BlockPaths(variable, chunk, root);
  for (const path of [manifest, data]) if (existsSync(path)) unlinkSync(path);
}

/** All 504 hours of one grid cell out of one stored block. */
export function era5ReadCellBlock(
  variable: Era5Variable,
  chunk: number,
  row: number,
  column: number,
  root = ERA5_STORE_ROOT,
) {
  const { data } = era5BlockPaths(variable, chunk, root);
  const offset = era5WindowIndex(row, column) * ERA5_CHUNK_HOURS * 4;
  const buffer = readFileSync(data);
  if (buffer.byteLength !== ERA5_WINDOW_CELLS * ERA5_CHUNK_HOURS * 4) {
    throw new Error(`Block ${variable}/${chunk} hat eine unerwartete Größe.`);
  }
  return new Float32Array(buffer.buffer, buffer.byteOffset + offset, ERA5_CHUNK_HOURS).slice();
}
