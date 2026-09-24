import { describe, expect, it } from 'vitest';
import type { ModelWeather } from '../icon-d2';
import { combineWeather, precipitationKind, RADAR_MAX_AGE_MINUTES } from '../weather-now';

const now = new Date('2026-09-18T12:00:00Z');
const model = (patch: Partial<ModelWeather> = {}): ModelWeather => ({
  validAt: now.toISOString(), runInit: '2026-09-18T09:00:00.000Z', cell: [52.52, 13.38],
  cloudCover: 30, cloudCoverLow: 10, cloudCoverMid: 20, cloudCoverHigh: 30,
  temperature: 14, windSpeed: 3, windDirection: 240, weatherCode: 2,
  precipitation: 0, snowfall: 0, shortwaveRadiation: 400, ...patch,
});
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000);

describe('Wetter jetzt: Modell und Radar', () => {
  it('nimmt den Himmel vom Modell, wenn das Radar trocken misst', () => {
    const w = combineWeather({ now, model: model(), radarRate: 0, radarMeasuredAt: minutesAgo(5) });
    expect(w.condition).toBe('partly');
    expect(w.cloudCover).toBe(30);
    expect(w.precipitationKind).toBe('none');
    expect(w.sources.precipitation).toMatchObject({ kind: 'radar' });
    expect(w.corrections).toEqual([]);
  });

  it('lässt es regnen, wenn das Radar Regen misst — auch gegen das Modell', () => {
    const w = combineWeather({ now, model: model({ cloudCover: 40, weatherCode: 2 }), radarRate: 3, radarMeasuredAt: minutesAgo(5) });
    expect(w.condition).toBe('rain');
    expect(w.precipitationRate).toBe(3);
    expect(w.weatherCode).toBe(63); // moderate rain, 2.5–7.6 mm/h
    // Rain from a 40 % sky is not physical; the correction is named, not hidden.
    expect(w.cloudCover).toBe(80);
    expect(w.corrections.length).toBe(2);
  });

  it('nimmt dem Modell den Regen, wenn das Radar trocken misst', () => {
    const w = combineWeather({ now, model: model({ cloudCover: 95, weatherCode: 61, precipitation: 0.6 }), radarRate: 0, radarMeasuredAt: minutesAgo(5) });
    expect(w.condition).toBe('overcast');
    expect(w.weatherCode).toBe(3);
    expect(w.precipitationRate).toBe(0);
  });

  it('fällt auf das Modell zurück, wenn das Radar zu alt ist oder den Ort nicht sah', () => {
    const stale = combineWeather({ now, model: model({ precipitation: 1.2, weatherCode: 61 }), radarRate: 0, radarMeasuredAt: minutesAgo(RADAR_MAX_AGE_MINUTES + 1) });
    expect(stale.sources.precipitation).toEqual({ kind: 'model' });
    expect(stale.condition).toBe('rain');
    const blind = combineWeather({ now, model: model({ precipitation: 0 }), radarRate: null, radarMeasuredAt: minutesAgo(5) });
    expect(blind.sources.precipitation).toEqual({ kind: 'model' });
  });

  it('erfindet ohne Modell und Radar keinen Himmel', () => {
    const w = combineWeather({ now, model: null, radarRate: null, radarMeasuredAt: null });
    expect(w.temperature).toBeNull();
    expect(w.cloudCover).toBeNull();
    expect(w.precipitationRate).toBeNull();
    expect(w.sources).toEqual({ sky: null, precipitation: null });
  });

  it('behält ein Gewitter des Modells, wenn das Radar Niederschlag bestätigt', () => {
    const w = combineWeather({ now, model: model({ weatherCode: 95, cloudCover: 100 }), radarRate: 12, radarMeasuredAt: minutesAgo(5) });
    expect(w.condition).toBe('thunder');
  });
});

describe('Niederschlagsart', () => {
  it('folgt der Modellkategorie, sonst der Temperatur', () => {
    expect(precipitationKind(model({ weatherCode: 73 }))).toBe('snow');
    expect(precipitationKind(model({ weatherCode: 3, temperature: -1 }))).toBe('snow');
    expect(precipitationKind(model({ weatherCode: 3, temperature: 1 }))).toBe('sleet');
    expect(precipitationKind(model({ weatherCode: 3, temperature: 5 }))).toBe('rain');
  });
});
