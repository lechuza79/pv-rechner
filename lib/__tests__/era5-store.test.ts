import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ERA5_CHUNK_HOURS, ERA5_WINDOW, ERA5_WINDOW_CELLS, era5ChunksFor, era5HourOf, era5WindowIndex } from '../era5-archive';
import { era5BlockPaths, era5BlockReady, era5ReadCellBlock, era5WriteBlock } from '../era5-store';
import { storyWeatherCacheRoot } from '../story-weather-provider';

const full = () => {
  const values = new Float32Array(ERA5_WINDOW_CELLS * ERA5_CHUNK_HOURS);
  for (let index = 0; index < values.length; index++) values[index] = index % 1000;
  return values;
};

describe('Blockspeicher', () => {
  it('schreibt einen vollständigen Block und liest eine Zelle daraus zurück', () => {
    const root = mkdtempSync(join(tmpdir(), 'era5-'));
    era5WriteBlock('temperature_2m', 1, full(), 'Tue, 25 Aug 2026 00:28:54 GMT', root);
    expect(era5BlockReady('temperature_2m', 1, root)).toBe(true);
    const row = ERA5_WINDOW.rowFrom + 3, column = ERA5_WINDOW.columnFrom + 4;
    const series = era5ReadCellBlock('temperature_2m', 1, row, column, root);
    expect(series.length).toBe(ERA5_CHUNK_HOURS);
    expect(series[0]).toBe((era5WindowIndex(row, column) * ERA5_CHUNK_HOURS) % 1000);
  });

  it('lehnt einen unvollständigen Download ab, statt ihn zu speichern', () => {
    const root = mkdtempSync(join(tmpdir(), 'era5-'));
    const short = new Float32Array(ERA5_WINDOW_CELLS * ERA5_CHUNK_HOURS - 1);
    expect(() => era5WriteBlock('temperature_2m', 1, short, null, root)).toThrow(/Werte statt/);
    expect(era5BlockReady('temperature_2m', 1, root)).toBe(false);
  });

  it('macht aus einem fehlenden Wert keine Null', () => {
    // A hole silently read as zero would be a night hour in the middle of the
    // day, and every figure built on it would still look plausible.
    const root = mkdtempSync(join(tmpdir(), 'era5-'));
    const values = full();
    values[5000] = Number.NaN;
    expect(() => era5WriteBlock('shortwave_radiation', 2, values, null, root)).toThrow(/fehlender Wert/);
    expect(era5BlockReady('shortwave_radiation', 2, root)).toBe(false);
  });

  it('hält einen Block ohne Abschlussvermerk für unfertig', () => {
    const root = mkdtempSync(join(tmpdir(), 'era5-'));
    era5WriteBlock('temperature_2m', 3, full(), null, root);
    const { manifest } = era5BlockPaths('temperature_2m', 3, root);
    writeFileSync(manifest, JSON.stringify({ ...JSON.parse(readFileSync(manifest, 'utf8')), layout: 0 }));
    expect(era5BlockReady('temperature_2m', 3, root)).toBe(false);
  });

  it('legt die beiden Quellen in getrennte Verzeichnisse', () => {
    // The raw provider answers are the yardstick this migration is measured
    // against; one source overwriting the other would destroy the evidence.
    expect(storyWeatherCacheRoot('open-meteo', 'x')).not.toBe(storyWeatherCacheRoot('era5-archive', 'x'));
  });

  it('lädt einen vorhandenen Block nicht erneut', () => {
    const root = mkdtempSync(join(tmpdir(), 'era5-'));
    era5WriteBlock('temperature_2m', 4, full(), null, root);
    const before = readdirSync(root + '/temperature_2m').sort();
    expect(era5BlockReady('temperature_2m', 4, root)).toBe(true);
    expect(readdirSync(root + '/temperature_2m').sort()).toEqual(before);
  });
});

describe('Blockzuschnitt', () => {
  it('deckt einen ganzen Monat mit den Blöcken ab, die ihn enthalten', () => {
    const from = era5HourOf('2026-07-31T00:00:00Z');
    const to = era5HourOf('2026-08-31T00:00:00Z') + 24;
    const chunks = era5ChunksFor(from, to);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0] * ERA5_CHUNK_HOURS).toBeLessThanOrEqual(from);
    expect((chunks[chunks.length - 1] + 1) * ERA5_CHUNK_HOURS).toBeGreaterThanOrEqual(to);
  });

  it('weist eine Zelle außerhalb des deutschen Ausschnitts ab', () => {
    // Silently clamping would return the weather of a neighbouring country.
    expect(() => era5WindowIndex(ERA5_WINDOW.rowFrom - 1, ERA5_WINDOW.columnFrom)).toThrow();
    expect(() => era5WindowIndex(ERA5_WINDOW.rowFrom, ERA5_WINDOW.columnTo)).toThrow();
  });
});
