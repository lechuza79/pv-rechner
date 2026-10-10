import { describe, expect, it } from 'vitest';
import { ERA5_CHUNK_HOURS, ERA5_WINDOW_CELLS, ERA5_WINDOW_COLUMNS, ERA5_WINDOW_ROWS } from '../era5-archive';
import { cdsArea, cdsIntoBlock, cdsMissingDays, cdsReferenceDay } from '../era5-cds';

// Block 986 runs from 10.09.2026 00 UTC; its 16th day is 25.09.2026, the day
// the archive lacked on 08.10.2026.
const CHUNK = 986;
const full = () => new Float32Array(ERA5_WINDOW_CELLS * ERA5_CHUNK_HOURS).fill(1);
const blank = (block: Float32Array, hour: number, cells = ERA5_WINDOW_CELLS) => {
  for (let cell = 0; cell < cells; cell++) block[cell * ERA5_CHUNK_HOURS + hour] = Number.NaN;
};

describe('Copernicus-Ergänzung für ERA5', () => {
  it('fragt genau das gespeicherte Fenster ab (Nord, West, Süd, Ost)', () => {
    expect(cdsArea()).toEqual([55.5, 5.5, 47, 15.5]);
  });

  it('erkennt einen ganzen fehlenden Tag', () => {
    const block = full();
    for (let h = 360; h < 384; h++) blank(block, h);
    expect(cdsMissingDays(block, CHUNK)).toEqual(['2026-09-25']);
    expect(cdsReferenceDay(['2026-09-25'], CHUNK)).toBe('2026-09-24');
  });

  it('nimmt den Tag danach, wenn der erste Tag des Blocks fehlt', () => {
    expect(cdsReferenceDay(['2026-09-10'], CHUNK)).toBe('2026-09-11');
  });

  it('flickt kein halbes Loch: eine Stunde, die nur in einigen Zellen fehlt', () => {
    const block = full();
    blank(block, 360, 10);
    expect(() => cdsMissingDays(block, CHUNK)).toThrow(/nur in 10 Zellen/);
  });

  it('flickt keinen angebrochenen Tag', () => {
    const block = full();
    for (let h = 360; h < 370; h++) blank(block, h);
    expect(() => cdsMissingDays(block, CHUNK)).toThrow(/nur teilweise/);
  });

  it('legt Copernicus (Nord nach Süd) in die Zeilen des Archivs (Süd nach Nord)', () => {
    const block = full();
    const perStep = ERA5_WINDOW_ROWS * ERA5_WINDOW_COLUMNS;
    const values = new Float32Array(perStep);
    // Northernmost source row, first column.
    values[0] = 300;
    cdsIntoBlock(block, values, [360], (k) => k - 273.15);
    const northWestCell = (ERA5_WINDOW_ROWS - 1) * ERA5_WINDOW_COLUMNS;
    expect(block[northWestCell * ERA5_CHUNK_HOURS + 360]).toBeCloseTo(26.85, 4);
    expect(block[0 * ERA5_CHUNK_HOURS + 360]).toBeCloseTo(-273.15, 4);
  });
});
