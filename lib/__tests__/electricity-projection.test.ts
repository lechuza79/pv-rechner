import { describe, expect, it } from 'vitest';
import { HOUSEHOLD_ELECTRICITY_INCREASE, electricityPriceAtYear, electricityRateLabel } from '../electricity-projection';
import { SCENARIOS } from '../constants';
import { DEFAULT_PRICES } from '../prices-config';
import { mergeWithDefaults } from '../prices';
import { calc } from '../calc';
import { calcBalkon } from '../balkon';

const base = { setId: 'duo' as const, orientationId: 'sued_flach' as const, presenceId: 'teils' as const, haushaltKwh: 2800, specificYield: 950, stromPrice: .34 };

describe('Shared household electricity projection', () => {
  it('reproduces UBA household prices including the source deflator, not WP tariff', () => {
    // Independently transcribed table 13 (2025 and 2045) and table 3 (2024,
    // 2030 and 2045). Geometric interpolation for the missing 2025 index.
    const index2025 = Math.exp(Math.log(118.2 / 100) / 6) * 100;
    const expectedTwentyYearFactor = (33.4 * 156) / (38.3 * index2025);
    expect(electricityPriceAtYear(1, 20)).toBeCloseTo(expectedTwentyYearFactor, 12);
    expect(HOUSEHOLD_ELECTRICITY_INCREASE * 100).toBeCloseTo(1.4094597186, 8);
    expect(electricityPriceAtYear(.34, 0)).toBe(.34);
    expect(electricityPriceAtYear(.34, 20, 0)).toBe(.34);
    expect(electricityRateLabel(HOUSEHOLD_ELECTRICITY_INCREASE)).toBe('+1,41 %/Jahr');
  });

  it('does not let stale price caches overwrite model assumptions or lose market prices', () => {
    const cached = mergeWithDefaults({ ...DEFAULT_PRICES, electricityPrice: .41, electricityIncrease: .02 });
    expect(cached.electricityPrice).toBe(.41);
    expect(cached.electricityIncrease).toBe(HOUSEHOLD_ELECTRICITY_INCREASE);
    expect(mergeWithDefaults({}).electricityIncrease).toBe(HOUSEHOLD_ELECTRICITY_INCREASE);
  });

  it('labels sensitivities honestly and leaves self-consumption unchanged', () => {
    expect(SCENARIOS[1].strom).toBe(DEFAULT_PRICES.electricityIncrease);
    for (const scenario of SCENARIOS) {
      expect(scenario.evDelta).toBe(0);
      expect(scenario.sub).toBe(electricityRateLabel(scenario.strom));
      if (scenario.id !== 'realistic') expect(scenario.explain).toContain('keine Vorhersage');
    }
    expect(SCENARIOS[2].strom - SCENARIOS[1].strom).toBeCloseTo(.01, 12);
    expect(SCENARIOS[1].strom - SCENARIOS[0].strom).toBeCloseTo(.01, 12);
  });

  for (const scenario of SCENARIOS) it(`prices the same self-used kWh identically in PV and BKW: ${scenario.id}`, () => {
    const bkw = calcBalkon({ ...base, priceIncrease: scenario.strom, invest: 0 });
    // Equal self-used output, no export revenue and no investment: only the
    // common electricity path and module degradation determine the annual gain.
    const pv = calc({ kwp: 1, kosten: 0, strompreis: base.stromPrice, eigenverbrauch: 100,
      einspeisung: 0, stromSteigerung: scenario.strom, ertragKwp: bkw.selfUsedKwh, monthly: null });
    for (let year = 0; year < bkw.annualCosts.grid.length; year++) {
      const gain = bkw.annualCosts.grid[year] - bkw.annualCosts.balcony[year];
      expect(pv.years[year + 1].j).toBeCloseTo(gain, 0);
    }
  });
});
