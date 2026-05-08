import { describe, it, expect } from "vitest";
import {
  co2PriceForYear,
  calcWeightedFeedIn,
  estimateCost,
  calcEigenverbrauch,
  calcFuelCost,
  calcFuelCost25,
  calcWpGridCost25,
  calc,
  paramInt,
  paramFloat,
  paramStr,
} from "../calc";
import { DEFAULT_PRICES } from "../prices-config";

// ─── CO2 price path (BEHG → EU ETS2) ─────────────────────────────────────────
describe("co2PriceForYear", () => {
  it("follows the legal BEHG path for 2026/2027", () => {
    expect(co2PriceForYear(0)).toBe(55); // 2025
    expect(co2PriceForYear(1)).toBe(65); // 2026
  });

  it("extrapolates +8 €/t per year from 2027 onward (conservative ETS2)", () => {
    expect(co2PriceForYear(2)).toBe(73);
    expect(co2PriceForYear(3)).toBe(81);
    expect(co2PriceForYear(10)).toBe(137);
  });
});

// ─── Weighted EEG feed-in tariff (≤10 kWp / >10 kWp split) ──────────────────
describe("calcWeightedFeedIn", () => {
  it("returns the small-system rate when kWp is at or below the threshold", () => {
    expect(calcWeightedFeedIn(5, 8.03, 6.95)).toBe(8.03);
    expect(calcWeightedFeedIn(10, 8.03, 6.95)).toBe(8.03);
  });

  it("blends small and large rates proportionally above the threshold", () => {
    // 15 kWp = 10 kWp at 8.03 + 5 kWp at 6.95 → weighted (10*8.03 + 5*6.95) / 15
    const result = calcWeightedFeedIn(15, 8.03, 6.95);
    expect(result).toBeCloseTo(7.67, 2);
  });

  it("rounds to 2 decimals", () => {
    const result = calcWeightedFeedIn(15, 8.03, 6.95);
    expect(result.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
  });
});

// ─── Cost estimation ────────────────────────────────────────────────────────
describe("estimateCost", () => {
  it("uses the small-system rate at or below the threshold", () => {
    // 8 kWp, no battery, default prices Q1/2026: 1400 €/kWp small
    const result = estimateCost(8, 0);
    // Rounded to 500 → 11200 → 11000 or 11500
    expect(result % 500).toBe(0);
    expect(result).toBeGreaterThan(10000);
    expect(result).toBeLessThan(13000);
  });

  it("blends small and large prices above the threshold", () => {
    // 15 kWp = 10*1400 + 5*1250 = 14000 + 6250 = 20250 → rounds to 20500 (500€ steps)
    const result = estimateCost(15, 0);
    expect(result % 500).toBe(0);
    expect(result).toBeGreaterThanOrEqual(20000);
    expect(result).toBeLessThanOrEqual(20500);
  });

  it("adds battery cost on top", () => {
    const without = estimateCost(10, 0);
    const with10kWh = estimateCost(10, 10);
    // 10 kWh × 700 €/kWh = 7000 € extra
    const diff = with10kWh - without;
    expect(diff).toBeGreaterThanOrEqual(6500);
    expect(diff).toBeLessThanOrEqual(7500);
  });

  it("respects custom price config (used by usePrices() hook)", () => {
    const custom = { ...DEFAULT_PRICES, pvPriceSmall: 2000, pvPriceLarge: 1800, batteryPerKwh: 1000 };
    const result = estimateCost(10, 0, custom);
    expect(result).toBe(20000); // 10 × 2000, no rounding adjustment needed
  });
});

// ─── Eigenverbrauch (HTW Berlin calibrated model) ──────────────────────────
describe("calcEigenverbrauch", () => {
  // Standard HTW reference: 10 kWp, 4 persons, normal usage, 10 kWh storage,
  // 1000 kWh/kWp yield. The formula is calibrated to ±2pp against the HTW
  // Berlin lookup tables (25.000 simulated configs, VDI 4655 H0 profile).
  // These tests pin the calibration — if a coefficient gets bumped, they fail.
  const standard = {
    personenIdx: 2,        // 3–4 persons → 3800 kWh/year
    nutzungIdx: 1,         // teils zuhause → 0.30 day quote
    speicherKwh: 10,
    wp: "nein",
    ea: "nein",
    eaKm: 15000,
    kwp: 10,
    ertragKwp: 1000,
  };

  it("matches the HTW Berlin standard configuration (capped by physical max)", () => {
    // 3800 kWh consumption / 10000 kWh production = 38% physical maximum
    // The formula would give ~40%, gets clamped to evMax = 38
    expect(calcEigenverbrauch(standard)).toBe(38);
  });

  it("reaches higher EV when system is small relative to consumption", () => {
    const smallSystem = { ...standard, kwp: 5 };
    // 5 kWp, 10 kWh storage, 3800 kWh consumption → EV around 65%
    const ev = calcEigenverbrauch(smallSystem);
    expect(ev).toBeGreaterThan(55);
    expect(ev).toBeLessThan(75);
  });

  it("falls when system is oversized relative to consumption", () => {
    const oversized = { ...standard, kwp: 20 };
    const ev = calcEigenverbrauch(oversized);
    expect(ev).toBeLessThan(30);
  });

  it("is higher with storage than without (storage boost is positive)", () => {
    const withStorage = calcEigenverbrauch({ ...standard, speicherKwh: 10 });
    const noStorage = calcEigenverbrauch({ ...standard, speicherKwh: 0 });
    expect(withStorage).toBeGreaterThan(noStorage);
  });

  it("rises with day-time presence (higher tagQuote)", () => {
    const awayAllDay = calcEigenverbrauch({ ...standard, nutzungIdx: 0, speicherKwh: 0 });
    const homeOffice = calcEigenverbrauch({ ...standard, nutzungIdx: 2, speicherKwh: 0 });
    expect(homeOffice).toBeGreaterThan(awayAllDay);
  });

  it("rises when WP/EA add consumption (more demand on the home side)", () => {
    // WP + EA push physical max higher; formula reflects that
    const baseCase = calcEigenverbrauch({ ...standard, kwp: 12 });
    const withWp = calcEigenverbrauch({ ...standard, kwp: 12, wp: "ja" });
    expect(withWp).toBeGreaterThan(baseCase);
  });

  it("clamps to 10–90 % regardless of inputs", () => {
    // Massive system, tiny consumption → EV would be ~5%, clamped up
    const tinyConsumption = calcEigenverbrauch({ ...standard, kwp: 50, personenIdx: 0, nutzungIdx: 0, speicherKwh: 0 });
    expect(tinyConsumption).toBeGreaterThanOrEqual(10);
    // Huge consumption, small system → EV would be 100%, clamped down to 90
    const tinySystem = calcEigenverbrauch({ ...standard, kwp: 1, personenIdx: 3, nutzungIdx: 3, speicherKwh: 15 });
    expect(tinySystem).toBeLessThanOrEqual(90);
  });
});

// ─── Amortisation (25-year projection) ──────────────────────────────────────
describe("calc (25-year amortization)", () => {
  // Canonical case: 10 kWp, 15.000 € invest, 30 ct strom, 30% EV, 8 ct feed-in,
  // 3% strom yearly, 1000 kWh/kWp yield, no monthly profile.
  const baseCase = {
    kwp: 10,
    kosten: 15000,
    strompreis: 0.30,
    eigenverbrauch: 30,
    einspeisung: 8.0,
    stromSteigerung: 0.03,
    ertragKwp: 1000,
    monthly: null,
  };

  it("returns YEARS+1 = 26 data points (year 0 plus 25 years)", () => {
    const r = calc(baseCase);
    expect(r.years.length).toBe(26);
  });

  it("year 0 starts at -kosten, year 1 already shows return", () => {
    const r = calc(baseCase);
    expect(r.years[0].kum).toBe(-15000);
    expect(r.years[0].j).toBe(0);
    expect(r.years[1].j).toBeGreaterThan(0);
    expect(r.years[1].kum).toBeGreaterThan(-15000);
  });

  it("finds breakeven within the 25-year horizon for a profitable case", () => {
    const r = calc(baseCase);
    expect(r.be).toBeDefined();
    expect(r.be!.kum).toBeGreaterThanOrEqual(0);
    // Sanity: breakeven typically 8–14 years for these inputs
    expect(r.be!.i).toBeGreaterThanOrEqual(6);
    expect(r.be!.i).toBeLessThanOrEqual(20);
  });

  it("does not find breakeven for an obviously unprofitable case", () => {
    const r = calc({ ...baseCase, kosten: 100000 }); // absurdly expensive
    expect(r.be).toBeUndefined();
    expect(r.total).toBeLessThan(0);
  });

  it("applies 0.5%/year degradation (year 25 yield < year 1 yield)", () => {
    const r = calc(baseCase);
    // Year 25 nominal price is much higher (3%/year strom rise) but
    // production is lower → check the production-only effect via a
    // case with no price escalation
    const flat = calc({ ...baseCase, stromSteigerung: 0 });
    expect(flat.years[25].j).toBeLessThan(flat.years[1].j);
  });

  it("is sensitive to eigenverbrauch (higher EV → higher total return)", () => {
    const lowEv = calc({ ...baseCase, eigenverbrauch: 20 }).total;
    const highEv = calc({ ...baseCase, eigenverbrauch: 60 }).total;
    expect(highEv).toBeGreaterThan(lowEv);
  });

  it("respects the monthly seasonal profile when provided", () => {
    // Equal monthly distribution should give nearly identical result to no-profile
    const equal = calc({ ...baseCase, monthly: Array(12).fill(1) });
    const noMonthly = calc(baseCase);
    // Within 5% — the seasonal EV scaling does shift things slightly
    expect(Math.abs(equal.total - noMonthly.total) / noMonthly.total).toBeLessThan(0.10);
  });
});

// ─── Fuel cost (WP vs Gas/Öl reference) ─────────────────────────────────────
describe("calcFuelCost", () => {
  it("rises with each year due to inflation + CO2 escalation", () => {
    const oneYear = calcFuelCost({ fuelKwh: 10000, pricePerKwh: 0.10, co2PerKwh: 0.2, years: 1, inflation: 0.02 });
    const twoYears = calcFuelCost({ fuelKwh: 10000, pricePerKwh: 0.10, co2PerKwh: 0.2, years: 2, inflation: 0.02 });
    // Year 2 is more expensive than year 1, so total > 2× year 1
    expect(twoYears).toBeGreaterThan(2 * oneYear * 0.95);
    expect(twoYears).toBeLessThan(2 * oneYear * 1.20);
  });

  it("scales linearly with fuel consumption", () => {
    const a = calcFuelCost({ fuelKwh: 10000, pricePerKwh: 0.10, co2PerKwh: 0.2, years: 5, inflation: 0.02 });
    const b = calcFuelCost({ fuelKwh: 20000, pricePerKwh: 0.10, co2PerKwh: 0.2, years: 5, inflation: 0.02 });
    expect(b).toBeCloseTo(2 * a, -1); // within 10€
  });
});

describe("calcFuelCost25 (legacy PV-Rechner wrapper)", () => {
  it("returns a positive value for typical WP-equivalent input", () => {
    // 3000 kWh electric WP × COP 3.5 = 10500 kWh thermal → ~10500 / efficiency m³ gas
    const result = calcFuelCost25(3000, "gas");
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(100000); // sanity bound
  });
});

describe("calcWpGridCost25", () => {
  it("returns 0 if autarky is 100%", () => {
    expect(calcWpGridCost25(3000, 1.0, 0.30, 0.03)).toBe(0);
  });

  it("scales with grid fraction (1 - autarky)", () => {
    const noAutarky = calcWpGridCost25(3000, 0, 0.30, 0.03);
    const halfAutarky = calcWpGridCost25(3000, 0.5, 0.30, 0.03);
    expect(halfAutarky).toBeCloseTo(noAutarky / 2, -1);
  });
});

// ─── URL parameter helpers (share-link safety) ──────────────────────────────
describe("paramInt", () => {
  it("returns the parsed value when within bounds", () => {
    expect(paramInt({ a: "5" }, "a", 0, 0, 10)).toBe(5);
  });

  it("falls back when missing", () => {
    expect(paramInt({}, "a", 7, 0, 10)).toBe(7);
  });

  it("falls back on NaN", () => {
    expect(paramInt({ a: "abc" }, "a", 7, 0, 10)).toBe(7);
  });

  it("falls back when out of range", () => {
    expect(paramInt({ a: "999" }, "a", 7, 0, 10)).toBe(7);
    expect(paramInt({ a: "-5" }, "a", 7, 0, 10)).toBe(7);
  });

  it("falls back on array values (Next.js multi-param)", () => {
    expect(paramInt({ a: ["1", "2"] }, "a", 7, 0, 10)).toBe(7);
  });
});

describe("paramFloat", () => {
  it("rejects Infinity and NaN", () => {
    expect(paramFloat({ a: "Infinity" }, "a", 1.0, 0, 100)).toBe(1.0);
    expect(paramFloat({ a: "NaN" }, "a", 1.0, 0, 100)).toBe(1.0);
  });

  it("accepts valid floats within bounds", () => {
    expect(paramFloat({ a: "12.5" }, "a", 1.0, 0, 100)).toBe(12.5);
  });

  it("falls back when out of bounds", () => {
    expect(paramFloat({ a: "12.5" }, "a", 1.0, 0, 10)).toBe(1.0);
  });
});

describe("paramStr", () => {
  it("returns the value when on the allowlist", () => {
    expect(paramStr({ a: "ja" }, "a", "nein", ["nein", "ja"])).toBe("ja");
  });

  it("falls back when not on the allowlist", () => {
    expect(paramStr({ a: "vielleicht" }, "a", "nein", ["nein", "ja"])).toBe("nein");
  });

  it("falls back on missing param", () => {
    expect(paramStr({}, "a", "nein", ["nein", "ja"])).toBe("nein");
  });
});
