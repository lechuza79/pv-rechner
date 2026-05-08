import { describe, it, expect } from "vitest";
import {
  WP_ANNUAL_KWH,
  EA_KWH_PER_KM,
  calcWpAnnual,
  calcEaAnnual,
  calcExtraConsumption,
  calcTotalAnnual,
  calcHourlyConsumption,
  type HouseholdProfile,
} from "../consumption";

// ─── Annual calculations ────────────────────────────────────────────────────
describe("calcWpAnnual", () => {
  it("returns the WP annual constant", () => {
    expect(calcWpAnnual()).toBe(WP_ANNUAL_KWH);
    expect(calcWpAnnual()).toBe(3500);
  });
});

describe("calcEaAnnual", () => {
  it("multiplies km by the per-km consumption factor", () => {
    expect(calcEaAnnual(15000)).toBe(Math.round(15000 * EA_KWH_PER_KM));
    expect(calcEaAnnual(15000)).toBe(2700);
  });

  it("rounds to integer kWh", () => {
    const result = calcEaAnnual(12345);
    expect(Number.isInteger(result)).toBe(true);
  });

  it("scales linearly", () => {
    expect(calcEaAnnual(10000)).toBe(2 * calcEaAnnual(5000));
  });
});

describe("calcExtraConsumption", () => {
  it("returns 0 when neither WP nor EA is active", () => {
    expect(calcExtraConsumption("nein", "nein", 15000)).toBe(0);
  });

  it("adds WP when WP is active (any value other than 'nein')", () => {
    expect(calcExtraConsumption("ja", "nein", 15000)).toBe(WP_ANNUAL_KWH);
    expect(calcExtraConsumption("geplant", "nein", 15000)).toBe(WP_ANNUAL_KWH);
  });

  it("adds EA scaled by km when EA is active", () => {
    expect(calcExtraConsumption("nein", "ja", 15000)).toBe(calcEaAnnual(15000));
    expect(calcExtraConsumption("nein", "ja", 20000)).toBe(calcEaAnnual(20000));
  });

  it("adds both WP and EA when both active", () => {
    expect(calcExtraConsumption("ja", "ja", 15000)).toBe(WP_ANNUAL_KWH + calcEaAnnual(15000));
  });
});

describe("calcTotalAnnual", () => {
  it("sums base + extras", () => {
    expect(calcTotalAnnual(3800, "nein", "nein", 15000)).toBe(3800);
    expect(calcTotalAnnual(3800, "ja", "nein", 15000)).toBe(3800 + WP_ANNUAL_KWH);
    expect(calcTotalAnnual(3800, "ja", "ja", 15000)).toBe(3800 + WP_ANNUAL_KWH + calcEaAnnual(15000));
  });
});

// ─── Hourly profile ────────────────────────────────────────────────────────
describe("calcHourlyConsumption", () => {
  const baseProfile: HouseholdProfile = {
    baseKwh: 3800,
    tagQuote: 0.30,
    wpActive: false,
    eaActive: false,
  };

  it("returns 0 when household is null (no profile)", () => {
    expect(calcHourlyConsumption(null, 12, 5)).toBe(0);
  });

  it("annualizes back to roughly the input baseKwh (sum across year ≈ baseKwh)", () => {
    // Sum 24 hours × 365 days
    let totalKwh = 0;
    for (let m = 0; m < 12; m++) {
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
      for (let day = 0; day < daysInMonth; day++) {
        for (let h = 0; h < 24; h++) {
          totalKwh += calcHourlyConsumption(baseProfile, h, m) / 1000; // W → kWh
        }
      }
    }
    // Should be close to baseKwh (3800), within 10% — the BDEW factor smooths to ~1.0
    expect(totalKwh).toBeGreaterThan(3800 * 0.9);
    expect(totalKwh).toBeLessThan(3800 * 1.1);
  });

  it("higher tagQuote shifts more load into daytime hours", () => {
    const lowTag = { ...baseProfile, tagQuote: 0.20 };
    const highTag = { ...baseProfile, tagQuote: 0.45 };
    const noonLow = calcHourlyConsumption(lowTag, 12, 5);
    const noonHigh = calcHourlyConsumption(highTag, 12, 5);
    expect(noonHigh).toBeGreaterThan(noonLow);

    // Inverse at night: low tagQuote concentrates more at night
    const midnightLow = calcHourlyConsumption(lowTag, 23, 5);
    const midnightHigh = calcHourlyConsumption(highTag, 23, 5);
    expect(midnightLow).toBeGreaterThan(midnightHigh);
  });

  it("WP active → strong winter spike, summer floor", () => {
    const wpProfile = { ...baseProfile, wpActive: true };
    const winterLoad = calcHourlyConsumption(wpProfile, 7, 0);  // January 7am
    const summerLoad = calcHourlyConsumption(wpProfile, 7, 6);  // July 7am
    // Winter heat demand is dramatically higher than summer (only hot water)
    expect(winterLoad).toBeGreaterThan(summerLoad * 3);
  });

  it("EA active concentrates load in evening hours", () => {
    const eaProfile = { ...baseProfile, eaActive: true };
    const noon = calcHourlyConsumption(eaProfile, 12, 5);
    const evening = calcHourlyConsumption(eaProfile, 19, 5);
    expect(evening).toBeGreaterThan(noon);
  });

  it("returns integer watts", () => {
    const w = calcHourlyConsumption({ ...baseProfile, wpActive: true, eaActive: true }, 19, 0);
    expect(Number.isInteger(w)).toBe(true);
  });
});
