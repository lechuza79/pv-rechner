import { describe, expect, it } from 'vitest';
import { calcHeatPump, heatPumpScenarioAdj, type HeatPumpInputs } from '../heatpump';
import { heatPumpRace } from '../heatpump-race';
import { DEFAULT_HEATPUMP_CONFIG } from '../heatpump-config';

const base: HeatPumpInputs = { situation: 'bestand', wohnflaeche: 140, insulationIdx: 1, personen: 4, heizsystem: 'hk_neu', wpType: 'lwwp', haustypFaktor: 1 };
describe('Personal heat cost race', () => {
  it('accumulates more heating costs in January than July', () => {
    const result = calcHeatPump(base, DEFAULT_HEATPUMP_CONFIG, heatPumpScenarioAdj('realistic'));
    const race = heatPumpRace(result, 2026);
    const day = (month: number) => (Date.UTC(2026, month, 1) - Date.UTC(2026, 0, 1)) / 86400000;
    for (const costs of [race.wp, race.fossil]) {
      expect(costs[day(1)] - costs[0]).toBeGreaterThan(costs[day(7)] - costs[day(6)]);
      expect(Array.from(costs).every(Number.isFinite)).toBe(true);
    }
  });
  for (const situation of ['bestand', 'neubau'] as const) {
    for (const scenario of ['pessimistic', 'realistic', 'optimistic']) {
      it(`agrees with every annual balance and final costs: ${situation}, ${scenario}`, () => {
        const result = calcHeatPump({ ...base, situation }, DEFAULT_HEATPUMP_CONFIG, heatPumpScenarioAdj(scenario));
        const race = heatPumpRace(result, 2026);
        expect(race.wp[0]).toBe(result.investNetto);
        expect(race.fossil[0]).toBe(result.gasInvest);
        expect(race.wp[race.days]).toBeCloseTo(result.tcoWp, 4);
        expect(race.fossil[race.days]).toBeCloseTo(result.tcoGas, 4);
        expect(Math.round(race.fossil[race.days] - race.wp[race.days])).toBe(result.tcoEinsparung);
        for (const year of result.years) {
          const day = (Date.UTC(2026 + year.i, 0, 1) - Date.UTC(2026, 0, 1)) / 86400000;
          if (year.i < race.years) expect(Math.round(race.fossil[day] - race.wp[day])).toBe(year.kum);
          else expect(Math.abs(race.fossil[day] - race.wp[day] - year.kum)).toBeLessThanOrEqual(1);
        }
        expect(race.firstDay).toHaveLength(race.years * 12 + 1);
        expect(race.dateAt(race.days)).toEqual({ jahr: 2045, monat: 11, tag: 31 });
      });
    }
  }
});
