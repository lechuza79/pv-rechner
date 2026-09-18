import { describe, expect, it } from 'vitest';
import {
  ERA5_LAPSE_RATE_PER_M,
  ERA5_SEA_MARKER,
  era5Column,
  era5Latitude,
  era5Longitude,
  era5Row,
  era5SelectCell,
  era5TemperatureOffset,
  type Era5Orography,
} from '../era5-grid';
import { era5Orography } from '../era5-orography';

/** Flat land everywhere, so only the geometry decides. */
const flat = (height: number): Era5Orography => () => height;

describe('Rasterzuordnung', () => {
  it('bildet Breite von Süd nach Nord und Länge ab 180° West ab', () => {
    // A wrong direction here is invisible: every index stays inside the grid and
    // the values look like weather, only for the wrong half of the planet.
    expect(era5Row(-90)).toBe(0);
    expect(era5Row(90)).toBe(720);
    expect(era5Latitude(era5Row(51.75))).toBeCloseTo(51.75, 10);
    expect(era5Column(-180)).toBe(0);
    expect(era5Longitude(era5Column(10.25))).toBeCloseTo(10.25, 10);
  });

  it('nimmt die nächste Zelle, solange die Höhe um höchstens 100 m abweicht', () => {
    const cell = era5SelectCell(51.7, 10.24, 200, flat(260));
    expect([cell.latitude, cell.longitude]).toEqual([51.75, 10.25]);
  });

  it('verlässt die nächste Zelle nur bei großem Höhenunterschied', () => {
    // 900 m below the model cell: the neighbour at 150 m is the better match
    // even after the distance penalty.
    const orography: Era5Orography = (row, column) =>
      row === era5Row(51.75) && column === era5Column(10.25) ? 1100 : 150;
    const cell = era5SelectCell(51.74, 10.24, 160, orography);
    expect([cell.latitude, cell.longitude]).not.toEqual([51.75, 10.25]);
    expect(cell.modelElevation).toBe(150);
  });

  it('meidet Seezellen und meldet die verbleibende Zelle als Land', () => {
    const orography: Era5Orography = (row, column) =>
      row === era5Row(53.75) && column === era5Column(7.5) ? ERA5_SEA_MARKER : 2;
    const cell = era5SelectCell(53.728, 7.398, 2, orography);
    expect(cell.modelElevation).not.toBeNull();
    expect([cell.latitude, cell.longitude]).not.toEqual([53.75, 7.5]);
  });

  it('bleibt auf der Seezelle, wenn ringsum nur See liegt', () => {
    // Better an honest sea cell than a land cell fifty kilometres away.
    const cell = era5SelectCell(54.0, 7.5, 0, flat(ERA5_SEA_MARKER));
    expect(cell.modelElevation).toBeNull();
    expect([cell.latitude, cell.longitude]).toEqual([54.0, 7.5]);
  });
});

describe('Höhenkorrektur', () => {
  it('rechnet 0,65 K je 100 m und nur in diese Richtung', () => {
    const cell = era5SelectCell(51.7, 10.24, 200, flat(300));
    expect(era5TemperatureOffset(cell, 200)).toBeCloseTo(100 * ERA5_LAPSE_RATE_PER_M, 10);
    expect(era5TemperatureOffset(cell, 400)).toBeCloseTo(-100 * ERA5_LAPSE_RATE_PER_M, 10);
  });

  it('behandelt eine Seezelle als Meereshöhe, nicht als fehlende Höhe', () => {
    // Skipping the correction here left the North Frisian islands 0.2 K off for
    // every hour, and nothing about the output looked wrong.
    const cell = era5SelectCell(54.65, 8.34, 24, flat(ERA5_SEA_MARKER));
    expect(cell.isSea).toBe(true);
    expect(era5TemperatureOffset(cell, 24)).toBeCloseTo(-24 * ERA5_LAPSE_RATE_PER_M, 10);
  });
});

describe('Deutsche Orographie', () => {
  it('kennt Land und See an den bekannten Stellen', () => {
    // Measured against the archive on 17.09.2026; these two decide whether a
    // North Sea municipality lands on water.
    expect(era5Orography(era5Row(53.5), era5Column(7.5))).toBeGreaterThan(ERA5_SEA_MARKER);
    expect(era5Orography(era5Row(53.75), era5Column(7.5))).toBe(ERA5_SEA_MARKER);
  });

  it('weist Zellen außerhalb Deutschlands ab, statt sie als See auszugeben', () => {
    expect(() => era5Orography(era5Row(40), era5Column(10))).toThrow();
  });
});
