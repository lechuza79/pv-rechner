import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { KLIMA_MODELLE, klimaProjektionFaktor, projectionYears } from '../klima-projektion';
import { DEFAULT_AIRCON_CONFIG as CFG } from '../aircon-config';
import table from '../klima-projektion.json';
import jahre from '../klima-projektion-jahre.json';
import kuehlgrad from '../kuehlgrad.json';
import plz from '../../public/plz.json';

const t = table as unknown as { today: number[]; then: number[]; models: string[]; factor: (number | null)[]; low: (number | null)[]; high: (number | null)[] };

describe('Klimaprojektion der Kühlstunden', () => {
  it('vergleicht genau die Sommer, die die Seite „heute" nennt, mit den Jahren, die sie beschriftet', () => {
    // Läuft einer der beiden Datenläufe ohne den anderen, beschreiben Zahl und
    // Beschriftung verschiedene Jahre — sichtbar wäre das nirgends.
    expect([...t.today].sort()).toEqual([...(kuehlgrad as { summers: number[] }).summers].sort());
    expect(t.then).toEqual(projectionYears(Math.max(...t.today) + 1));
    expect((jahre as { then: number[] }).then).toEqual(t.then);
  });

  it('rechnet mit den Modellen, deren Lizenz geprüft ist', () => {
    expect(t.models).toEqual([...KLIMA_MODELLE]);
  });

  it('jedes Rasterfeld liegt innerhalb der Spanne seiner Einzelmodelle und zeigt Erwärmung', () => {
    for (let c = 0; c < t.factor.length; c++) {
      const f = t.factor[c];
      if (f == null) continue;
      expect(t.low[c]!).toBeLessThanOrEqual(f);
      expect(t.high[c]!).toBeGreaterThanOrEqual(f);
      expect(f).toBeGreaterThan(1);
    }
  });

  it('der Süden bekommt mehr Zuwachs als die Küste (Plausibilitätsanker)', () => {
    expect(klimaProjektionFaktor(47.99, 7.85)!.factor).toBeGreaterThan(klimaProjektionFaktor(53.55, 9.99)!.factor);
  });

  it('praktisch jede Postleitzahl bekommt einen Faktor, und der Ersatzwert ist deren Median', () => {
    const werte: number[] = [];
    let ohne = 0;
    for (const [lat, lon] of Object.values(plz as unknown as Record<string, [number, number]>)) {
      const f = klimaProjektionFaktor(lat, lon);
      if (f) werte.push(f.factor); else ohne++;
    }
    expect(ohne / (werte.length + ohne)).toBeLessThan(0.01);
    werte.sort((a, b) => a - b);
    expect(Math.abs(werte[Math.floor(werte.length / 2)] - CFG.projectionFactor)).toBeLessThan(0.05);
  });

  it('die Schnittstelle liest keine gespeicherten Werte der nicht-kommerziellen Klima-Schnittstelle mehr', () => {
    const route = readFileSync('app/api/cooling-degree/route.ts', 'utf8');
    expect(route).not.toMatch(/klima_cache/);
    expect(route).toMatch(/klimaProjektionFaktor\(/);
  });
});
