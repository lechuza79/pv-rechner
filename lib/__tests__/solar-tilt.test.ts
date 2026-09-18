import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sunAt, tiltedIrradiance } from '../solar-tilt';

type Place = { plz: string; latitude: number; longitude: number; tilt: number; azimuth: number; hours: [string, number, number, number][] };
const fixture = JSON.parse(readFileSync(new URL('./fixtures/gti-open-meteo-2025.json', import.meta.url), 'utf8')) as { places: Place[] };

describe('Einstrahlung auf geneigter Fläche', () => {
  // Real provider answers (35° south, 2025) for five days across the year at
  // three places, with the horizontal inputs from our own blocks. The one
  // named deviation is the sun-position formula; it shows at sunrise/sunset.
  it.each(fixture.places.map((place) => [place.plz, place] as const))('trifft den Anbieter in %s', (_plz, place) => {
    let worst = 0;
    let sumProvider = 0;
    let sumOurs = 0;
    for (const [end, direct, shortwave, provider] of place.hours) {
      const ours = Math.round(tiltedIrradiance(direct, shortwave - direct, place.tilt, place.azimuth, place.latitude, place.longitude, Date.parse(end + 'Z')) * 10) / 10;
      worst = Math.max(worst, Math.abs(ours - provider));
      sumProvider += provider;
      sumOurs += ours;
    }
    expect(place.hours.length).toBeGreaterThan(40);
    expect(worst).toBeLessThanOrEqual(1);
    expect(Math.abs(sumOurs / sumProvider - 1)).toBeLessThan(0.0005);
  });

  it('liefert nachts und ohne Strahlung null, bei fehlendem Wert NaN', () => {
    expect(tiltedIrradiance(0, 0, 35, 0, 52.5, 13.5, Date.parse('2025-06-21T12:00Z'))).toBe(0);
    expect(tiltedIrradiance(100, 50, 35, 0, 52.5, 13.5, Date.parse('2025-01-15T00:00Z'))).toBe(0);
    expect(tiltedIrradiance(Number.NaN, 50, 35, 0, 52.5, 13.5, Date.parse('2025-06-21T12:00Z'))).toBeNaN();
  });

  it('dreht die Fläche richtig: vormittags gewinnt Ost, nachmittags West', () => {
    const at = (iso: string, azimuth: number) => tiltedIrradiance(500, 100, 35, azimuth, 52.5, 13.5, Date.parse(iso));
    expect(at('2025-06-21T08:00Z', -90)).toBeGreaterThan(at('2025-06-21T08:00Z', 90));
    expect(at('2025-06-21T16:00Z', 90)).toBeGreaterThan(at('2025-06-21T16:00Z', -90));
  });

  it('Sonnenstand: Deklination an den Wenden, Zeitgleichung Anfang November', () => {
    expect(sunAt(Date.parse('2025-06-21T03:00Z')).declination).toBeCloseTo(23.44, 1);
    expect(sunAt(Date.parse('2025-12-21T15:00Z')).declination).toBeCloseTo(-23.44, 1);
    expect(sunAt(Date.parse('2025-11-03T12:00Z')).equationOfTimeHours * 60).toBeCloseTo(16.4, 0);
  });
});
