import { describe, it, expect } from 'vitest';
import { calcBalkon } from '../balkon';
import { balkonRace } from '../balkon-race';
import { DEFAULT_BALKON_CONFIG as CFG } from '../balkon-config';

describe('BKW result race uses calculator balances', () => {
  for (const storageId of ['none', 'small', 'large'] as const) for (const priceIncrease of [0, .02, .05]) {
    it(`${storageId}, price increase ${priceIncrease}`, () => {
      const result = calcBalkon({ setId: 'duo', orientationId: 'sued_gelaender', presenceId: 'teils', haushaltKwh: 2800, specificYield: 950, stromPrice: .34, storageId, priceIncrease });
      const race = balkonRace(result, 2026);
      expect(race.balcony[0]).toBe(result.invest);
      expect(race.grid[0]).toBe(0);
      expect(race.grid[race.days] - race.balcony[race.days]).toBe(result.lifetimeSaving);
      expect(race.days).toBe((Date.UTC(2046, 0, 1) - Date.UTC(2026, 0, 1)) / 86400000);
      expect(result.annualCosts.grid).toHaveLength(CFG.lifetimeYears);
      expect(Math.round(result.annualCosts.grid.reduce((sum, cost, index) => sum + cost - result.annualCosts.balcony[index], 0) - result.invest)).toBe(result.lifetimeSaving);
      for (let year = 1; year < CFG.lifetimeYears; year++) {
        const day = (Date.UTC(2026 + year, 0, 1) - Date.UTC(2026, 0, 1)) / 86400000;
        expect(race.balcony[day]).toBeCloseTo(result.invest + result.annualCosts.balcony.slice(0, year).reduce((a,b)=>a+b,0), 6);
      }
    });
  }
});

describe('BKW seasonal cost ledger', () => {
  const input = { setId: 'duo' as const, orientationId: 'sued_flach' as const, presenceId: 'teils' as const, haushaltKwh: 2800, specificYield: 950, stromPrice: .34 };
  for (const storageId of ['none', 'small', 'large'] as const) it(`retains monthly and annual balances with ${storageId}`, () => {
    const result = calcBalkon({ ...input, storageId });
    const race = balkonRace(result, 2027); // Includes a leap February in year 2.
    let grid = 0, balcony = result.invest;
    for (let year = 0; year < CFG.lifetimeYears; year++) {
      expect(result.monthlyCosts.grid[year].reduce((a,b)=>a+b,0)).toBeCloseTo(result.annualCosts.grid[year], 8);
      expect(result.monthlyCosts.balcony[year].reduce((a,b)=>a+b,0)).toBeCloseTo(result.annualCosts.balcony[year], 8);
      for (let month = 0; month < 12; month++) {
        grid += result.monthlyCosts.grid[year][month];
        balcony += result.monthlyCosts.balcony[year][month];
        const day = (Date.UTC(2027 + year, month + 1, 1) - Date.UTC(2027, 0, 1)) / 86400000;
        if (day < race.days) {
          expect(race.grid[day]).toBeCloseTo(grid, 7);
          expect(race.balcony[day]).toBeCloseTo(balcony, 7);
        }
        expect(result.monthlyCosts.balcony[year][month]).toBeGreaterThanOrEqual(0);
      }
    }
    const saving = (month:number) => result.monthlyCosts.grid[0][month] - result.monthlyCosts.balcony[0][month];
    expect(saving(5)).toBeGreaterThan(saving(11));
    expect(result.monthlyCosts.grid[0][11]).toBeGreaterThan(result.monthlyCosts.grid[0][5]);
    // Once the battery retires, its monthly benefit must vanish as well.
    const noBattery = calcBalkon(input);
    for (let year = CFG.storageLifeYears; year < CFG.lifetimeYears; year++) {
      result.monthlyCosts.balcony[year].forEach((cost, month) => expect(cost).toBeCloseTo(noBattery.monthlyCosts.balcony[year][month], 8));
    }
  });
  it('handles zero solar yield without NaN or a fictional saving', () => {
    const result = calcBalkon({ ...input, monthlyYield: Array(12).fill(0), invest: 0 });
    const race = balkonRace(result, 2026);
    expect(result.selfUsedKwh).toBe(0);
    expect(result.monthlyCosts.balcony).toEqual(result.monthlyCosts.grid);
    expect([...race.balcony].every(Number.isFinite)).toBe(true);
    expect(race.balcony).toEqual(race.grid);
  });
});
