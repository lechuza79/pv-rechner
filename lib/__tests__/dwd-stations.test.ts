import { describe, expect, it } from 'vitest';
import { DWD_STATIONS, degreesMinutes, distanceKm, stationsNear } from '../dwd-stations';

describe('DWD-Stationen', () => {
  it('liest Grad und Minuten, nicht Dezimalgrad', () => {
    // Catalogue says "52.28 13.24" for Berlin-Tempelhof, which lies at 52°28'N
    // 13°24'E. As decimals that would be 21 km off, and nothing would look wrong.
    expect(degreesMinutes(52.28)).toBeCloseTo(52 + 28 / 60, 6);
    expect(degreesMinutes(13.24)).toBeCloseTo(13.4, 6);
    expect(degreesMinutes(-8.4)).toBeCloseTo(-(8 + 40 / 60), 6);
    const tempelhof = DWD_STATIONS.find((s) => s.id === '10384')!;
    expect(distanceKm(tempelhof.latitude, tempelhof.longitude, 52.4675, 13.4021)).toBeLessThan(2);
  });

  it('deckt ganz Deutschland ab', () => {
    expect(DWD_STATIONS.length).toBeGreaterThan(200);
    // Nowhere in Germany more than 60 km from a reporting station (measured max 55.6 km).
    for (const [lat, lon] of [[54.9, 8.3], [47.4, 10.3], [51.0, 14.9], [49.2, 6.9], [52.5, 13.4]]) {
      expect(stationsNear(lat, lon, 60).length).toBeGreaterThan(0);
    }
  });

  it('sortiert nach Entfernung', () => {
    const near = stationsNear(50.11, 8.68, 50);
    for (let i = 1; i < near.length; i++) expect(near[i].distanceKm).toBeGreaterThanOrEqual(near[i - 1].distanceKm);
  });
});
