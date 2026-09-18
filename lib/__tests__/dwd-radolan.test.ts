import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error seek-bzip ships no types
import Bunzip from 'seek-bzip';
import { parseRadolan, precipitationRatePerHour, radolanCell, radolanValueAt, type RadolanGrid } from '../dwd-radolan';

const real = parseRadolan(Bunzip.decode(readFileSync('lib/__tests__/fixtures/dwd-ry-2026-09-18T0420.bz2')));

/** A synthetic grid, so single pixels can be set and read back. */
function grid(formatVersion: number, fill = 0): RadolanGrid {
  return { product: 'RY', time: new Date(0), formatVersion, precision: 0.01, intervalMinutes: 5, rows: 900, columns: 900, words: new Uint16Array(810000).fill(fill) };
}

describe('RADOLAN lesen', () => {
  it('liest Kopf und Datenblock eines echten Radarbilds', () => {
    expect(real.product).toBe('RY');
    expect(real.time.toISOString()).toBe('2026-09-18T04:20:00.000Z');
    expect(real.formatVersion).toBe(3);
    expect(real.precision).toBeCloseTo(0.01, 10);
    expect(real.intervalMinutes).toBe(5);
    expect([real.rows, real.columns]).toEqual([900, 900]);
  });

  it('sieht Deutschland, aber nicht die Ecken des Rasters', () => {
    // A flipped row order or a wrong origin keeps every index valid and moves
    // the radar's field of view somewhere else — only a place test catches it.
    for (const [lat, lon] of [[52.52, 13.4], [48.14, 11.58], [53.55, 10.0], [50.94, 6.96], [51.34, 12.37]]) {
      expect(radolanValueAt(real, lat, lon)).not.toBeNull();
    }
    expect(radolanValueAt(real, 54.5, 2.3)).toBeNull(); // North Sea, far north-west corner
    expect(radolanValueAt(real, 47.1, 14.5)).toBeNull(); // Austrian Alps, south-east corner
  });

  it('weist Orte außerhalb des Rasters ab, statt sie umzuklappen', () => {
    expect(radolanCell(real, 48.86, 2.35)).toBeNull(); // Paris
    expect(radolanCell(real, 57, 10)).toBeNull(); // Denmark
  });
});

describe('Georeferenz', () => {
  // Corner coordinates as the format description lists them; each must land on
  // the matching corner pixel. The corners are outer edges, so they sit on the
  // boundary — nudge them a hair inwards.
  const inwards = (lat: number, lon: number, dLat: number, dLon: number) => [lat + dLat * 1e-4, lon + dLon * 1e-4] as const;

  it('trifft die Ecken im Kugelmodell (Formatversion 3)', () => {
    const g = grid(3);
    expect(radolanCell(g, ...inwards(46.9526, 3.5889, 1, 1))).toEqual({ row: 0, column: 0 });
    expect(radolanCell(g, ...inwards(47.0705, 14.6209, 1, -1))).toEqual({ row: 0, column: 899 });
    expect(radolanCell(g, ...inwards(54.7405, 15.7208, -1, -1))).toEqual({ row: 899, column: 899 });
    expect(radolanCell(g, ...inwards(54.5877, 2.0715, -1, 1))).toEqual({ row: 899, column: 0 });
  });

  it('trifft die Ecken im WGS84-Modell (Formatversion 5)', () => {
    const g = grid(5);
    expect(radolanCell(g, ...inwards(46.95361533, 3.604382997, 1, 1))).toEqual({ row: 0, column: 0 });
    expect(radolanCell(g, ...inwards(47.07156997, 14.60482286, 1, -1))).toEqual({ row: 0, column: 899 });
    expect(radolanCell(g, ...inwards(54.73806893, 15.69697166, -1, -1))).toEqual({ row: 899, column: 899 });
    expect(radolanCell(g, ...inwards(54.58546706, 2.095883211, -1, 1))).toEqual({ row: 899, column: 0 });
  });

  it('unterscheidet die Erdmodelle messbar', () => {
    // DWD moved the origin with the model, so the two agree near the centre and
    // drift apart towards the edges — measured up to two pixels. Reading a file
    // with the wrong model is therefore a small, silent error, not a crash.
    const a = radolanCell(grid(3), 47.5, 14.1)!;
    const b = radolanCell(grid(5), 47.5, 14.1)!;
    expect(Math.hypot(a.row - b.row, a.column - b.column)).toBeGreaterThanOrEqual(1);
    // 51°N/9°E is the reference point and sits exactly on a pixel corner (§ 1.3,
    // Abb. 1); a hair inside it both models agree.
    expect(radolanCell(grid(3), 51.004, 9.006)).toEqual(radolanCell(grid(5), 51.004, 9.006));
    expect(radolanCell(grid(3), 51.004, 9.006)).toEqual({ row: 450, column: 450 });
  });

  it('verweigert eine unbekannte Formatversion', () => {
    expect(() => radolanCell(grid(6), 51, 9)).toThrow(/Formatversion/);
  });
});

describe('Werte und Kennungen', () => {
  it('liefert Millimeter und daraus die Stundenrate', () => {
    const g = grid(3);
    const cell = radolanCell(g, 51, 9)!;
    g.words[cell.row * 900 + cell.column] = 25; // 0.25 mm in 5 min
    const amount = radolanValueAt(g, 51, 9)!;
    expect(amount).toBeCloseTo(0.25, 10);
    expect(precipitationRatePerHour(g, amount)).toBeCloseTo(3, 10);
  });

  it('macht aus „keine Daten" und Störecho keinen trockenen Himmel', () => {
    const g = grid(3);
    const cell = radolanCell(g, 51, 9)!;
    g.words[cell.row * 900 + cell.column] = 0x2000 | 2500;
    expect(radolanValueAt(g, 51, 9)).toBeNull();
    g.words[cell.row * 900 + cell.column] = 0x8000 | 2490;
    expect(radolanValueAt(g, 51, 9)).toBeNull();
  });

  it('bricht bei abgeschnittenen Daten ab', () => {
    const bytes = Bunzip.decode(readFileSync('lib/__tests__/fixtures/dwd-ry-2026-09-18T0420.bz2'));
    expect(() => parseRadolan(bytes.subarray(0, bytes.length - 2))).toThrow(/Byte Daten/);
  });
});
