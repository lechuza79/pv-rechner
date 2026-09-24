import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { wetterBefund, WETTER_MAX_ALTER_STUNDEN } from '../../scripts/health-check';

const jetzt = new Date('2026-09-18T17:00:00Z');
const frisch = { modellLauf: '2026-09-18T12:00:00Z', tageskurve: true, hitzewelle: true };

describe('Gesundheitscheck: Wetterdateien', () => {
  it('schweigt bei frischem Wetter und wenn er nicht nachsehen konnte', () => {
    expect(wetterBefund(frisch, jetzt)).toEqual([]);
    expect(wetterBefund(null, jetzt)).toEqual([]);
  });
  it('meldet einen zu alten Modelllauf', () => {
    const alt = new Date(jetzt.getTime() - (WETTER_MAX_ALTER_STUNDEN + 1) * 3600000).toISOString();
    expect(wetterBefund({ ...frisch, modellLauf: alt }, jetzt).join()).toMatch(/vor 10 Stunden/);
  });
  it('meldet fehlendes Modellwetter, fehlende Tageskurve und leere Vorhersage einzeln', () => {
    expect(wetterBefund({ modellLauf: null, tageskurve: false, hitzewelle: false }, jetzt)).toHaveLength(3);
  });
  it('wird im Lauf wirklich aufgerufen', () => {
    expect(readFileSync('scripts/health-check.ts', 'utf8')).toMatch(/technical\("weather-freshness", false, \.\.\.wetterBefund\(await messeWetterFrische\(\)/);
  });
});
