import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import points from '../plz-weather-point.json';
import plz from '../../public/plz.json';
import elevation from '../plz-elevation.json';

const entries = Object.entries((points as { points: Record<string, { latitude: number; longitude: number; elevation: number; centroidElevation: number }> }).points);
const centroids = plz as unknown as Record<string, [number, number]>;
const km = (a: [number, number], b: [number, number]) =>
  Math.hypot((a[0] - b[0]) * 111.2, (a[1] - b[1]) * 111.2 * Math.cos(((a[0] + b[0]) / 2) * (Math.PI / 180)));

describe('Ortspunkt statt Bergmitte', () => {
  it('hat die bekannten Alpenfälle', () => {
    const byPlz = Object.fromEntries(entries);
    expect(byPlz['83486'].elevation).toBeLessThan(800); // Ramsau, Mitte auf 2.301 m
    expect(byPlz['87561'].elevation).toBeLessThan(900); // Oberstdorf
    expect(byPlz['10115']).toBeUndefined(); // flaches Land bleibt beim Mittelpunkt
  });

  it('senkt nur ab, nie an, und bleibt in der Nähe', () => {
    const centroidHeights = (elevation as { elevations: Record<string, number> }).elevations;
    expect(entries.length).toBeGreaterThan(100);
    for (const [code, point] of entries) {
      expect(point.centroidElevation).toBe(centroidHeights[code]);
      expect(point.centroidElevation - point.elevation).toBeGreaterThan(150);
      expect(km(centroids[code], [point.latitude, point.longitude])).toBeLessThanOrEqual(15);
    }
  });

  it('wird vom Wetter-Schnappschuss wirklich benutzt', () => {
    const source = readFileSync('scripts/icon-d2-snapshot.ts', 'utf8');
    expect(source).toMatch(/const town = townPoints\[plz\]/);
    expect(source).toMatch(/selectCell\(ICON_D2_GRID, latitude, longitude, elevation/);
    expect(source).toMatch(/const elevation = town \? town\.elevation/);
  });
});
