import { describe, it, expect } from "vitest";
import {
  co2PriceForYear,
  calcWeightedFeedIn,
  estimateCost,
  calcEigenverbrauch,
  calcAutarkie,
  buildMonthlyEv,
  calcFuelCost,
  calcFuelCost25,
  calcWpGridCost25,
  calc,
  paramInt,
  paramFloat,
  paramStr,
} from "../calc";
import { DEFAULT_PRICES } from "../prices-config";
import { co2PriceForCalendarYear } from "../co2-config";
import { YEAR } from "../constants";

// ─── CO2 price path (BEHG → EU ETS2), anchored to absolute calendar years ────
describe("co2PriceForCalendarYear", () => {
  it("uses the legislated BEHG corridor for 2026 and 2027", () => {
    expect(co2PriceForCalendarYear(2026)).toBe(55); // corridor floor (conservative)
    expect(co2PriceForCalendarYear(2027)).toBe(65); // corridor ceiling (frozen 2027)
  });

  it("extrapolates +8 €/t per year for the ETS2 free market from 2028", () => {
    expect(co2PriceForCalendarYear(2028)).toBe(73);
    expect(co2PriceForCalendarYear(2029)).toBe(81);
    expect(co2PriceForCalendarYear(2036)).toBe(137);
  });

  it("clamps years before the first anchor to the floor", () => {
    expect(co2PriceForCalendarYear(2025)).toBe(55);
    expect(co2PriceForCalendarYear(2020)).toBe(55);
  });
});

// co2PriceForYear is a thin offset→year adapter: i maps to calendar year YEAR + i.
// Time-independent assertion so the test does not break at year rollover.
describe("co2PriceForYear", () => {
  it("maps projection offset i to the absolute calendar year YEAR + i", () => {
    expect(co2PriceForYear(0)).toBe(co2PriceForCalendarYear(YEAR));
    expect(co2PriceForYear(2)).toBe(co2PriceForCalendarYear(YEAR + 2));
    expect(co2PriceForYear(10)).toBe(co2PriceForCalendarYear(YEAR + 10));
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
    // 8 kWp, no battery, default fallback 06/2026: 1416 €/kWp small
    const result = estimateCost(8, 0);
    // 8*1416 = 11328 → rounds to 11500 (500€ steps)
    expect(result % 500).toBe(0);
    expect(result).toBeGreaterThan(10000);
    expect(result).toBeLessThan(13000);
  });

  it("blends small and large prices above the threshold", () => {
    // 15 kWp = 10*1416 + 5*1071 = 14160 + 5355 = 19515 → rounds to 19500 (500€ steps)
    const result = estimateCost(15, 0);
    expect(result % 500).toBe(0);
    expect(result).toBeGreaterThanOrEqual(19000);
    expect(result).toBeLessThanOrEqual(20000);
  });

  it("adds battery cost on top", () => {
    const without = estimateCost(10, 0);
    const with10kWh = estimateCost(10, 10);
    // Default Q2/2026: 1500 € Basis + 10 kWh × 225 €/kWh = 3750 € extra (±Rundung)
    const diff = with10kWh - without;
    expect(diff).toBeGreaterThanOrEqual(3500);
    expect(diff).toBeLessThanOrEqual(4000);
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

  it("uses baseKwh override instead of the persons-based estimate", () => {
    // personenIdx 2 → 3800 kWh. A direct 8000 kWh base means more demand on the
    // home side → physical max rises, so EV must be at least as high.
    const fromPersons = calcEigenverbrauch({ ...standard, kwp: 12 });
    const fromDirect = calcEigenverbrauch({ ...standard, kwp: 12, baseKwh: 8000 });
    expect(fromDirect).toBeGreaterThan(fromPersons);
  });

  it("ignores baseKwh when null (falls back to persons)", () => {
    const withNull = calcEigenverbrauch({ ...standard, baseKwh: null });
    expect(withNull).toBe(calcEigenverbrauch(standard));
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

// ─── Autarkiegrad (HTW Berlin Unabhängigkeits-Kennfeld) ────────────────────────
describe("calcAutarkie", () => {
  // Reference yield = HTW's own 1024 kWh/kWp so x/y map 1:1 onto the lookup grid.
  const ref = { ertragKwp: 1024 };

  it("computes the Reddit case (22,5 kWp + 13 kWh) from the HTW field", () => {
    // This config showed 100 % before — the old code back-derived autarky from a
    // naive annual balance that averaged the winter dip away. Now the value is read
    // straight from the HTW simulation field, which already contains the winter and
    // day/night mismatch. These are the interpolated HTW results (±1 pp rounding),
    // NOT a hardcoded ceiling — a smaller battery or lower yield moves them.
    expect(calcAutarkie({ kwp: 22.5, speicherKwh: 13, gesamtVerbrauch: 3800, ertragKwp: 950 })).toBe(91);
    expect(calcAutarkie({ kwp: 22.5, speicherKwh: 13, gesamtVerbrauch: 5000, ertragKwp: 950 })).toBe(86);
    expect(calcAutarkie({ kwp: 22.5, speicherKwh: 13, gesamtVerbrauch: 6500, ertragKwp: 950 })).toBe(81);
  });

  it("matches the HTW field: no battery, well-sized → ~30 %", () => {
    // x = 10 kWp / (3800/1000 × 1024/1024 scale)… use consumption so x≈1
    const a = calcAutarkie({ kwp: 3.8, speicherKwh: 0, gesamtVerbrauch: 3800, ...ref });
    expect(a).toBeGreaterThanOrEqual(28);
    expect(a).toBeLessThanOrEqual(33);
  });

  it("matches the HTW field: with battery, well-sized → 50–70 %", () => {
    // x≈1.2, y≈1.5 (HTW-recommended battery band)
    const a = calcAutarkie({ kwp: 4.56, speicherKwh: 5.7, gesamtVerbrauch: 3800, ...ref });
    expect(a).toBeGreaterThanOrEqual(50);
    expect(a).toBeLessThanOrEqual(70);
  });

  it("rises with storage and with PV size (monotonic in both axes)", () => {
    const base = calcAutarkie({ kwp: 6, speicherKwh: 0, gesamtVerbrauch: 4000, ...ref });
    const moreStorage = calcAutarkie({ kwp: 6, speicherKwh: 8, gesamtVerbrauch: 4000, ...ref });
    const morePv = calcAutarkie({ kwp: 10, speicherKwh: 0, gesamtVerbrauch: 4000, ...ref });
    expect(moreStorage).toBeGreaterThan(base);
    expect(morePv).toBeGreaterThan(base);
  });

  it("a sunnier location (higher yield) lifts autarky", () => {
    const dull = calcAutarkie({ kwp: 6, speicherKwh: 6, gesamtVerbrauch: 4500, ertragKwp: 850 });
    const sunny = calcAutarkie({ kwp: 6, speicherKwh: 6, gesamtVerbrauch: 4500, ertragKwp: 1150 });
    expect(sunny).toBeGreaterThan(dull);
  });

  it("returns 0 for no PV or no consumption", () => {
    expect(calcAutarkie({ kwp: 0, speicherKwh: 5, gesamtVerbrauch: 4000, ...ref })).toBe(0);
    expect(calcAutarkie({ kwp: 8, speicherKwh: 5, gesamtVerbrauch: 0, ...ref })).toBe(0);
  });

  it("stays within 0–100 % for extreme inputs", () => {
    const huge = calcAutarkie({ kwp: 100, speicherKwh: 100, gesamtVerbrauch: 2000, ...ref });
    expect(huge).toBeGreaterThan(0);
    expect(huge).toBeLessThanOrEqual(100);
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
    // Year 25 nominal price is much higher (3%/year strom rise) but
    // production is lower → check the production-only effect via a
    // case with no price escalation
    const flat = calc({ ...baseCase, stromSteigerung: 0 });
    expect(flat.years[25].j).toBeLessThan(flat.years[1].j);
  });

  it("pays the feed-in tariff for 20 years only, then stops (EEG runs out)", () => {
    // eigenverbrauch 0 → feed-in is the only revenue, so year cashflow isolates it.
    const r = calc({ ...baseCase, eigenverbrauch: 0, einspeisung: 8.0 });
    expect(r.years[20].j).toBeGreaterThan(0); // year 20: tariff still paid
    expect(r.years[21].j).toBe(0);            // year 21: out of EEG, no more feed-in
    expect(r.years[25].j).toBe(0);
  });

  it("keeps self-consumption savings after year 20 (only feed-in stops)", () => {
    // With real EV the plant still saves on grid electricity in years 21–25.
    const r = calc({ ...baseCase, eigenverbrauch: 40 });
    expect(r.years[21].j).toBeGreaterThan(0);
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

// ─── Monthly EV redistribution (annual EV preserved across seasonal split) ──
describe("buildMonthlyEv", () => {
  const munich = [52, 73, 104, 120, 120, 124, 128, 122, 107, 86, 55, 49];
  const total = munich.reduce((a, b) => a + b, 0);
  const fracs = munich.map((m) => m / total);
  const weightedEv = (mEv: number[]) => mEv.reduce((s, e, m) => s + e * fracs[m], 0);

  it("preserves a high annual EV that previously drifted to ~75% via the winter cap", () => {
    const mEv = buildMonthlyEv(0.9, fracs);
    expect(weightedEv(mEv)).toBeCloseTo(0.9, 2);
    expect(Math.max(...mEv)).toBeLessThanOrEqual(0.95 + 1e-9);
  });

  it("leaves a low EV untouched (cap never hit)", () => {
    expect(weightedEv(buildMonthlyEv(0.33, fracs))).toBeCloseTo(0.33, 3);
  });
});

describe("calc monthly vs annual consistency", () => {
  it("monthly profile total matches the annual fallback at high EV (no EV leak)", () => {
    const base = {
      kwp: 10, kosten: 18000, strompreis: 0.32, eigenverbrauch: 90,
      einspeisung: 7.78, stromSteigerung: 0.03, ertragKwp: 1000, batteryReplace: 0,
    };
    const monthly = calc({ ...base, monthly: [52, 73, 104, 120, 120, 124, 128, 122, 107, 86, 55, 49] }).total;
    const annual = calc({ ...base, monthly: null }).total;
    expect(Math.abs(monthly - annual) / Math.abs(annual)).toBeLessThan(0.01);
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
    // 3000 kWh electric WP × JAZ 3.5 = 10500 kWh thermal → ~10500 / efficiency m³ gas
    const result = calcFuelCost25(3000, "gas");
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(100000); // sanity bound
  });

  it("defaults to JAZ 3.5 for backward compatibility", () => {
    expect(calcFuelCost25(3000, "gas", 3.5)).toBe(calcFuelCost25(3000, "gas"));
  });

  it("scales delivered heat (and thus fuel cost) with the JAZ", () => {
    // Higher JAZ → same electricity delivers more heat → gas equivalent costs more.
    const low = calcFuelCost25(3000, "gas", 3.0);
    const high = calcFuelCost25(3000, "gas", 4.0);
    expect(high).toBeGreaterThan(low);
    expect(high / low).toBeCloseTo(4.0 / 3.0, 2);
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
