import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { berlinTagesgrenzen } from '../zeit';
import { heatwaveFrom, maximaFrom, type ForecastShard } from '../wetter-vorhersage';
import { modelHours, type IconD2Shard } from '../icon-d2';
import { nearestPlz } from '../plz-nearest';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });

describe('Seiten fragen keinen Wetterdienst mit Nutzungsbeschränkung', () => {
  // The free Open-Meteo API is for non-commercial use only. Pages read our own
  // snapshots (DWD, ECMWF, GFS via open data) and precomputed ERA5 values;
  // the climate projection comes from NASA NEX-GDDP-CMIP6, precomputed.
  it('keine Seite ruft sie auf', () => {
    const hits: string[] = [];
    for (const file of [...files('app'), ...files('components'), ...files('lib')]) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/https:\/\/[a-z-]*api\.open-meteo\.com/g)) {
        if (file === 'lib/open-meteo-archive-url.ts') continue; // scripts' switch-back path, never imported by a page
        hits.push(`${file}: ${match[0]}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('das Archiv-Adressmodul erreicht keine Seite', () => {
    for (const file of [...files('app'), ...files('components')]) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/open-meteo-archive-url/);
    }
  });
});

describe('Deutscher Kalendertag', () => {
  it('ist an den Umstellungstagen 23 bzw. 25 Stunden lang', () => {
    const [a, b] = berlinTagesgrenzen(new Date('2026-03-29T12:00:00Z'));
    expect(new Date(a).toISOString()).toBe('2026-03-28T23:00:00.000Z');
    expect((b - a) / 3600000).toBe(23);
    const [c, d] = berlinTagesgrenzen(new Date('2026-10-25T12:00:00Z'));
    expect(new Date(c).toISOString()).toBe('2026-10-24T22:00:00.000Z');
    expect((d - c) / 3600000).toBe(25);
  });
  it('rechnet kurz nach deutscher Mitternacht schon den neuen Tag', () => {
    const [a] = berlinTagesgrenzen(new Date('2026-09-18T22:30:00Z'));
    expect(new Date(a).toISOString()).toBe('2026-09-18T22:00:00.000Z');
  });
});

describe('16-Tage-Vorhersage', () => {
  const shard: ForecastShard = {
    version: 1,
    generatedAt: '2026-07-01T06:00:00Z',
    runs: { dwd_icon: '', ecmwf_ifs025: '', ncep_gfs013: '' },
    until: { dwd_icon: '', ecmwf_ifs025: '', ncep_gfs013: '' },
    days: ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'],
    points: { '10115': [250, 310, 320, 330, 290] },
  };
  it('wirft Tage vor heute weg, zeigt also nie gestern als Vorhersage', () => {
    expect(maximaFrom(shard, '10115', '2026-07-02')).toEqual([31, 32, 33, 29]);
    expect(maximaFrom(shard, '10115', '2026-07-09')).toBeNull();
  });
  it('zählt heiße Tage und die längste Folge', () => {
    expect(heatwaveFrom([31, 32, 33, 29], 30, 3)).toEqual({ maxTemp: 33, hotDays: 3, active: true });
    expect(heatwaveFrom([31, 29, 33, 29], 30, 3)).toEqual({ maxTemp: 33, hotDays: 2, active: false });
  });
});

describe('Tageskurve aus dem Schnappschuss', () => {
  it('liest Strahlung als Summe aus direkt und diffus, null wo er nicht reicht', () => {
    const shard: IconD2Shard = {
      version: 1,
      model: 'dwd_icon_d2',
      runInit: '',
      generatedAt: '',
      firstHour: '2026-09-18T10:00:00.000Z',
      hours: 2,
      variables: ['direct_radiation', 'diffuse_radiation', 'temperature_2m'] as IconD2Shard['variables'],
      scale: { direct_radiation: 1, diffuse_radiation: 1, temperature_2m: 10 } as IconD2Shard['scale'],
      points: { '10115': { cell: [52.5, 13.4], elevation: 46, values: [[300, 400], [100, 50], [181, 190]] } },
    };
    const day = modelHours(shard, '10115', Date.parse('2026-09-18T10:00:00Z'), Date.parse('2026-09-18T13:00:00Z'))!;
    expect(day.shortwave).toEqual([400, 450, null]);
    expect(day.temperature).toEqual([18.1, 19, null]);
  });
  it('findet die nächste Postleitzahl', () => {
    expect(nearestPlz(52.53, 13.38)).toBe('10115');
  });
});

describe('Kühlgradstunden aus ERA5', () => {
  it('tragen den jüngsten abgeschlossenen Sommer (sonst: npm run klima:kuehlgrad)', async () => {
    const file = (await import('../kuehlgrad.json')).default as unknown as { summers: number[]; points: Record<string, [number, number]> };
    // Rot ab dem 1. Januar, solange der Sommer davor fehlt — der Rechner nennt
    // „die letzten fünf Sommer", und ein Jahr alter Stand wäre dann falsch.
    expect(file.summers[0]).toBeGreaterThanOrEqual(new Date().getFullYear() - 1);
    expect(Object.keys(file.points).length).toBeGreaterThan(8000);
    const [avg5, last] = file.points['10115'];
    expect(avg5).toBeGreaterThan(50);
    expect(last).toBeGreaterThan(50);
  });
});
