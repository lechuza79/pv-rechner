import { describe, expect, it } from 'vitest';
import { importDailyEquivalents, IMPORT_COMPARISON as a } from '../atomstrom-comparison';

describe('nuclear-import energy equivalents', () => {
  it('compares the same seven-day energy for each example, not nameplate GW', () => {
    const r = importDailyEquivalents(1)!;
    expect(r.dailyGwh).toBe(24);
    const expectedWeekKwh = 168_000_000;
    expect(r.solarSystems * a.solarKwp * a.solarKwhPerKwp * 7 / 365).toBeCloseTo(expectedWeekKwh);
    expect(r.windTurbines * a.windMw * 1000 * a.windFullLoadHours * 7 / 365).toBeCloseTo(expectedWeekKwh);
    expect(r.households * a.householdKwhPerYear * 7 / 365).toBeCloseTo(expectedWeekKwh);
  });
  it('distinguishes zero imports from invalid values', () => {
    expect(importDailyEquivalents(0)?.dailyGwh).toBe(0);
    expect(importDailyEquivalents(NaN)).toBeNull();
    expect(importDailyEquivalents(-1)).toBeNull();
    expect(importDailyEquivalents(Infinity)).toBeNull();
  });
});
