import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ERA5_CHUNK_HOURS, ERA5_WINDOW, ERA5_WINDOW_CELLS, era5HourOf } from '../era5-archive';
import { era5WriteBlock, ERA5_STORE_ROOT } from '../era5-store';
import { era5Weather } from '../era5-weather';
import { validateStoryWeather } from '../story-weather-validation';
import { storyWeatherProvider } from '../story-weather-provider';
import { era5SelectCell } from '../era5-grid';

/** Flat land at 100 m, so the cell choice is the geometry alone. */
const orography = () => 100;

/** A store filled with a recognisable ramp, wired to a throwaway directory. */
function seed(hours: { from: number; to: number }, value: (variable: string, cell: number, hour: number) => number) {
  const root = mkdtempSync(join(tmpdir(), 'era5-'));
  for (const variable of ['temperature_2m', 'shortwave_radiation', 'wind_u_component_100m', 'wind_v_component_100m'] as const) {
    for (let chunk = Math.floor(hours.from / ERA5_CHUNK_HOURS); chunk <= Math.floor((hours.to - 1) / ERA5_CHUNK_HOURS); chunk++) {
      const values = new Float32Array(ERA5_WINDOW_CELLS * ERA5_CHUNK_HOURS);
      for (let cell = 0; cell < ERA5_WINDOW_CELLS; cell++)
        for (let hour = 0; hour < ERA5_CHUNK_HOURS; hour++)
          values[cell * ERA5_CHUNK_HOURS + hour] = value(variable, cell, chunk * ERA5_CHUNK_HOURS + hour);
      era5WriteBlock(variable, chunk, values, null, root);
    }
  }
  return root;
}

const start = '2026-08-01', end = '2026-08-03';
const fromHour = era5HourOf(start + 'T00:00:00Z');
const toHour = era5HourOf(end + 'T00:00:00Z') + 24;

describe('Wetterantwort aus dem Archiv', () => {
  it('liefert lückenlose Stunden in der Form, die die Auswertung erwartet', () => {
    const root = seed({ from: fromHour, to: toHour }, (variable) =>
      variable === 'temperature_2m' ? 12 : variable === 'shortwave_radiation' ? 300 : 3,
    );
    const answer = era5Weather({
      latitude: 51.0, longitude: 10.0, targetElevation: 100,
      startDate: start, endDate: end, wind: true, orography, storeRoot: root,
    });
    expect(answer.weather.hourly.time.length).toBe(toHour - fromHour);
    expect(answer.weather.hourly.time[0]).toBe('2026-08-01T00:00');
    // The existing check is the gate every prepared figure passes through.
    expect(() => validateStoryWeather(answer.weather, start, end, true)).not.toThrow();
    expect(answer.weather.hourly_units.wind_speed_100m).toBe('m/s');
    // sqrt(3² + 3²) = 4.24, so the wind really is combined, not passed through.
    expect(answer.weather.hourly.wind_speed_100m![0]).toBeCloseTo(Math.hypot(3, 3), 2);
  });

  it('verrät die Herkunft, statt eine Anbieter-Adresse vorzutäuschen', () => {
    const root = seed({ from: fromHour, to: toHour }, () => 5);
    const answer = era5Weather({
      latitude: 51.0, longitude: 10.0, targetElevation: 100,
      startDate: start, endDate: end, wind: false, orography, storeRoot: root,
    });
    expect(answer.sourceUrl).not.toContain('open-meteo.com');
    expect(answer.sourceUrl).toContain('era5-archive://');
    // The preparation run reads these two back to pin a municipality; a
    // different name would be read as zero rather than as absent.
    const parsed = new URL(answer.sourceUrl);
    expect(Number(parsed.searchParams.get('latitude'))).toBe(51.0);
    expect(Number(parsed.searchParams.get('longitude'))).toBe(10.0);
    expect(answer.provenance.dataset).toBe('copernicus_era5');
    expect(answer.provenance.licence).toBe('CC-BY-4.0');
    expect(answer.provenance.blocks.length).toBeGreaterThan(0);
  });

  it('bricht ab, wenn ein Block fehlt, statt die Lücke zu füllen', () => {
    const root = mkdtempSync(join(tmpdir(), 'era5-'));
    expect(() =>
      era5Weather({
        latitude: 51.0, longitude: 10.0, targetElevation: 100,
        startDate: start, endDate: end, wind: false, orography, storeRoot: root,
      }),
    ).toThrow(/fehlt/);
  });

  it('verlangt eine Ortshöhe, statt eine zu raten', () => {
    const root = seed({ from: fromHour, to: toHour }, () => 5);
    expect(() =>
      era5Weather({
        latitude: 51.0, longitude: 10.0, targetElevation: Number.NaN,
        startDate: start, endDate: end, wind: false, orography, storeRoot: root,
      }),
    ).toThrow(/Ortshöhe/);
  });

  it('rechnet die Temperatur auf die Ortshöhe um', () => {
    const root = seed({ from: fromHour, to: toHour }, (variable) => (variable === 'temperature_2m' ? 10 : 0));
    const high = era5Weather({
      latitude: 51.0, longitude: 10.0, targetElevation: 300,
      startDate: start, endDate: end, wind: false, orography, storeRoot: root,
    });
    // 200 m above a 100 m cell: 200 × 0.0065 = 1.3 K colder.
    expect(high.weather.hourly.temperature_2m[0]).toBeCloseTo(8.7, 5);
    expect(high.weather.elevation).toBe(300);
  });

  it('lässt Strahlung und Wind von der Höhe unberührt', () => {
    // Measured on the provider's own answers: two places in one cell differ in
    // temperature only. Correcting radiation too would invent an effect.
    const root = seed({ from: fromHour, to: toHour }, (variable) =>
      variable === 'shortwave_radiation' ? 400 : variable === 'temperature_2m' ? 10 : 2,
    );
    const low = era5Weather({ latitude: 51.0, longitude: 10.0, targetElevation: 50, startDate: start, endDate: end, wind: true, orography, storeRoot: root });
    const high = era5Weather({ latitude: 51.0, longitude: 10.0, targetElevation: 800, startDate: start, endDate: end, wind: true, orography, storeRoot: root });
    expect(low.weather.hourly.shortwave_radiation).toEqual(high.weather.hourly.shortwave_radiation);
    expect(low.weather.hourly.wind_speed_100m).toEqual(high.weather.hourly.wind_speed_100m);
    expect(low.weather.hourly.temperature_2m[0]).not.toBe(high.weather.hourly.temperature_2m[0]);
  });

  it('holt für einen Küstenort keine Seezelle, wenn Land danebenliegt', () => {
    const seaRow = era5SelectCell(53.728, 7.398, 2, () => 0);
    const mixed = (row: number, column: number) => (row === seaRow.row && column === seaRow.column ? -999 : 2);
    const cell = era5SelectCell(53.728, 7.398, 2, mixed);
    expect(cell.isSea).toBe(false);
  });
});

describe('Quellenwahl', () => {
  it('bleibt ohne ausdrückliche Angabe beim bisherigen Anbieter', () => {
    // A silent change of source would rewrite figures that are already out.
    expect(storyWeatherProvider([], {})).toBe('open-meteo');
  });
  it('nimmt die neue Quelle nur auf Ansage', () => {
    expect(storyWeatherProvider(['--provider=era5-archive'], {})).toBe('era5-archive');
    expect(storyWeatherProvider([], { STORY_WEATHER_PROVIDER: 'era5-archive' })).toBe('era5-archive');
  });
  it('weist einen Tippfehler ab, statt stillschweigend zurückzufallen', () => {
    expect(() => storyWeatherProvider(['--provider=era5'], {})).toThrow(/Unbekannte Wetterquelle/);
  });
});

void ERA5_WINDOW; void ERA5_STORE_ROOT;
