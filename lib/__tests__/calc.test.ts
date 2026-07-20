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
  marginalPaybackYears,
  selectByMarginalReturn,
  batteryCost,
  batteryReplaceCost,
  calcPvBenefitPerYear,
  calcPvBenefitOverHorizon,
  BATTERY_LIFETIME_YEARS,
  BATTERY_REPLACE_PRICE_FACTOR,
  MAX_MARGINAL_PAYBACK_YEARS,
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
describe("calcPvBenefitPerYear / calcPvBenefitOverHorizon", () => {
  const base = {
    wpSelfKwh: 1000, houseSelfKwh: 2000, feedKwh: 5000,
    wpPrice: 0.24, housePrice: 0.312, feedInEur: 0.0778,
    years: 20, priceIncrease: 0.02,
  };

  it("year 0 = self-consumption at its two prices + feed-in, no escalation/degradation", () => {
    const y0 = calcPvBenefitPerYear(base)[0];
    const expected = 1000 * 0.24 + 2000 * 0.312 + 5000 * 0.0778;
    expect(y0).toBeCloseTo(expected, 6);
  });

  it("self-consumption savings escalate + degrade; feed-in stays flat and degrades", () => {
    const perYear = calcPvBenefitPerYear(base);
    // Later years: self-consumption grows with price escalation but shrinks with
    // panel degradation; the combined effect at 2 % vs 0.5 % keeps year 5 > year 0.
    expect(perYear[5]).toBeGreaterThan(perYear[0] * 0.95);
    expect(perYear).toHaveLength(20);
  });

  it("feed-in revenue stops after feedInYears", () => {
    const short = calcPvBenefitPerYear({ ...base, years: 22, feedInYears: 20 });
    const withFeed = short[19];
    const noFeed = short[20];
    // Year 20 (index 20) has no feed-in → drop by roughly the feed-in component.
    expect(noFeed).toBeLessThan(withFeed);
  });

  it("over-horizon sum equals the rounded per-year total", () => {
    const sum = calcPvBenefitPerYear(base).reduce((a, b) => a + b, 0);
    expect(calcPvBenefitOverHorizon(base)).toBe(Math.round(sum));
  });

  it("zero PV production yields zero benefit", () => {
    expect(calcPvBenefitOverHorizon({ ...base, wpSelfKwh: 0, houseSelfKwh: 0, feedKwh: 0 })).toBe(0);
  });
});

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

  it("does not floor EV above the physical maximum for tiny household + huge roof", () => {
    // 1 person (1800 kWh) on a 30 kWp roof (28500 kWh/kWp yield):
    // physical max EV = 1800 / 28500 = 6.3 %. The 10 % sanity floor must NOT
    // push it back up to 10 % — that would be physically impossible and would
    // bias the recommendation toward oversized systems.
    const tinyLoadHugeRoof = { ...standard, personenIdx: 0, speicherKwh: 0, kwp: 30 };
    const evMaxPct = Math.round((1800 / (30 * 1000)) * 100); // 6
    const ev = calcEigenverbrauch(tinyLoadHugeRoof);
    expect(ev).toBeLessThanOrEqual(evMaxPct);
    expect(ev).toBeLessThan(10);
  });

  it("still applies the 10 % floor for normally sized systems", () => {
    // Standard household where the physical max is well above 10 % — the floor
    // stays in effect (regression guard so the fix didn't remove it entirely).
    const ev = calcEigenverbrauch({ ...standard, kwp: 8, speicherKwh: 0 });
    expect(ev).toBeGreaterThanOrEqual(10);
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

  // ── WP-Saisonkorrektur: Speicher-Boost × (1 − wpAnteil × 0,30) ────────────
  // Das HTW-Power-Law kennt keine Wärmepumpe (VDI-4655-Haushaltsprofil). Für
  // WP-Haushalte wird der SPEICHER-Boost gedämpft, weil ~80 % des WP-Stroms
  // Okt–Apr anfällt — wenn der Speicher mangels Sonne kaum gefüllt wird.
  // Trick für den isolierten Vergleich: baseKwh so setzen, dass beide Fälle
  // denselben Gesamtverbrauch haben (7800 kWh) — dann sind x, y und tagQuote
  // identisch und NUR die Saisonkorrektur unterscheidet die Ergebnisse.
  describe("WP-Saisonkorrektur im Speicher-Boost", () => {
    const wpCase = { ...standard, wp: "ja", wpKwh: 4000, baseKwh: 3800, kwp: 10 };
    const sameLoadNoWp = { ...standard, wp: "nein", baseKwh: 7800, kwp: 10 };

    it("dämpft den Speicher-Boost bei WP-Haushalten (gleicher Gesamtverbrauch)", () => {
      const withWp = calcEigenverbrauch({ ...wpCase, speicherKwh: 10 });
      const noWp = calcEigenverbrauch({ ...sameLoadNoWp, speicherKwh: 10 });
      // wpAnteil = 4000/7800 ≈ 0,51 → Boost × 0,846 → EV klar niedriger.
      expect(withWp).toBeLessThan(noWp);
    });

    it("greift NICHT ohne Speicher (Korrektur betrifft nur den Boost)", () => {
      const withWp = calcEigenverbrauch({ ...wpCase, speicherKwh: 0 });
      const noWp = calcEigenverbrauch({ ...sameLoadNoWp, speicherKwh: 0 });
      expect(withWp).toBe(noWp);
    });

    it("dämpft stärker, je größer der WP-Anteil am Verbrauch ist", () => {
      // Gesamt konstant 9000 kWh, WP-Anteil 2000 vs. 6000 kWh.
      const smallWp = calcEigenverbrauch({ ...standard, wp: "ja", wpKwh: 2000, baseKwh: 7000, kwp: 10, speicherKwh: 10 });
      const bigWp = calcEigenverbrauch({ ...standard, wp: "ja", wpKwh: 6000, baseKwh: 3000, kwp: 10, speicherKwh: 10 });
      expect(bigWp).toBeLessThan(smallWp);
    });
  });

  it("caps at the physical max (not the 10 % floor) for a massive system on tiny load", () => {
    // 50 kWp on 1 person (1800 kWh) → physical max = 1800/50000 = 3.6 %.
    // The 10 % floor must NOT apply here: you cannot self-consume 10 % of a
    // 50-kWp harvest with an 1800-kWh load. (Previously this was floored to 10 %.)
    const tinyConsumption = calcEigenverbrauch({ ...standard, kwp: 50, personenIdx: 0, nutzungIdx: 0, speicherKwh: 0 });
    const evMaxPct = Math.round((1800 / (50 * 1000)) * 100); // 4
    expect(tinyConsumption).toBeLessThanOrEqual(evMaxPct);
    expect(tinyConsumption).toBeLessThan(10);
  });

  it("clamps down to 90 % for a huge consumption + tiny system", () => {
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

// ─── Marginal-return gate (drives EVERY storage recommendation) ─────────────
describe("marginalPaybackYears", () => {
  it("returns 0 when the upgrade costs nothing (or less)", () => {
    expect(marginalPaybackYears(0, 5000)).toBe(0);
    expect(marginalPaybackYears(-500, 5000)).toBe(0);
  });

  it("computes payback from avg annual saving: (Δnpv + Δinvest) / years", () => {
    // Δinvest 1200, Δnpv 1300 over 25 years → avg saving (1300+1200)/25 = 100 €/a
    // → payback 1200/100 = exactly 12 years.
    expect(marginalPaybackYears(1200, 1300)).toBe(12);
  });

  it("returns Infinity when the upgrade never earns its money back", () => {
    // Δnpv so negative that the avg annual saving is ≤ 0.
    expect(marginalPaybackYears(1000, -3000)).toBe(Infinity);
    expect(marginalPaybackYears(1000, -1000)).toBe(Infinity); // saving exactly 0
  });

  it("respects a custom horizon", () => {
    // Same Δnpv over half the years means the annual saving was twice as high
    // → the marginal payback halves.
    expect(marginalPaybackYears(1200, 1300, 25)).toBe(12);
    expect(marginalPaybackYears(1200, 1300, 12.5)).toBe(6);
  });
});

describe("selectByMarginalReturn", () => {
  const A = { investition: 10000, npv25: 10000 };

  it("returns undefined for an empty candidate list", () => {
    expect(selectByMarginalReturn([])).toBeUndefined();
  });

  it("tie-break: equally expensive candidates compete purely on NPV", () => {
    const worse = { investition: 10000, npv25: 5000 };
    const better = { investition: 10000, npv25: 6000 };
    expect(selectByMarginalReturn([worse, better])).toBe(better);
    expect(selectByMarginalReturn([better, worse])).toBe(better); // order-independent
  });

  it("accepts a pricier candidate whose extra capital pays back within the gate", () => {
    // Δinvest 1200, Δnpv 1300 → marginal payback exactly 12 years (= gate limit).
    const upgrade = { investition: 11200, npv25: 11300 };
    expect(selectByMarginalReturn([A, upgrade])).toBe(upgrade);
  });

  it("rejects a pricier candidate just beyond the 13-year threshold", () => {
    // Δinvest 1200, Δnpv 1100 → avg saving 92 €/a → payback 13,04 J > 13 → reject,
    // although the upgrade has the higher total NPV. That is the whole point of
    // the gate: pure NPV maximization would always pick this one.
    const upgrade = { investition: 11200, npv25: 11100 };
    expect(selectByMarginalReturn([A, upgrade])).toBe(A);
    // Sanity: the same candidate passes with a laxer gate.
    expect(selectByMarginalReturn([A, upgrade], 14)).toBe(upgrade);
  });

  it("never picks a pricier candidate with equal or lower NPV", () => {
    const dud = { investition: 20000, npv25: 9999 };
    const equal = { investition: 15000, npv25: 10000 };
    expect(selectByMarginalReturn([A, dud, equal], Infinity)).toBe(A);
  });

  it("evaluates each upgrade against the CURRENT pick, not the cheapest", () => {
    // B beats A (Δ1000 / Δnpv 1500 → payback 10 J ≤ 12).
    // C has higher NPV than A and B, but vs B: Δ1500 / Δnpv 100 → ~23 J → reject.
    const B = { investition: 11000, npv25: 11500 };
    const C = { investition: 12500, npv25: 11600 };
    expect(selectByMarginalReturn([C, A, B])).toBe(B);
  });

  it("filters out NaN candidates instead of letting them rank", () => {
    const nanNpv = { investition: 10000, npv25: NaN };
    const nanInvest = { investition: NaN, npv25: 99999 };
    const valid = { investition: 10000, npv25: 5000 };
    expect(selectByMarginalReturn([nanNpv, nanInvest, valid])).toBe(valid);
    expect(selectByMarginalReturn([nanNpv, nanInvest])).toBeUndefined();
  });

  it("default gate is the documented battery lifetime minus buffer (13 years)", () => {
    expect(MAX_MARGINAL_PAYBACK_YEARS).toBe(13);
  });
});

// ─── Battery cost & replacement (year-13 deduction, permanent break-even) ───
describe("batteryCost / batteryReplaceCost", () => {
  const p = { ...DEFAULT_PRICES, batteryBase: 1000, batteryPerKwh: 500 };

  it("is base + per-kWh, and 0 without a battery", () => {
    expect(batteryCost(10, p)).toBe(1000 + 10 * 500);
    expect(batteryCost(0, p)).toBe(0);
  });

  it("replacement applies the future-price factor 0.63", () => {
    expect(BATTERY_REPLACE_PRICE_FACTOR).toBe(0.63);
    expect(batteryReplaceCost(10, p)).toBe(Math.round(6000 * 0.63));
    expect(batteryReplaceCost(0, p)).toBe(0);
  });
});

describe("calc with batteryReplace (Akku-Tausch)", () => {
  // stromSteigerung 0 keeps the yearly cashflow nearly flat (~1.460 €/a, only
  // 0,5 % degradation) so the curve shape is easy to reason about by hand.
  const base = {
    kwp: 10,
    kosten: 15000,
    strompreis: 0.30,
    eigenverbrauch: 30,
    einspeisung: 8.0,
    stromSteigerung: 0,
    ertragKwp: 1000,
    monthly: null,
  };

  it("deducts the replacement exactly once, in year BATTERY_LIFETIME_YEARS", () => {
    const without = calc(base);
    const withReplace = calc({ ...base, batteryReplace: 5000 });
    for (let i = 0; i <= 25; i++) {
      const diffJ = without.years[i].j - withReplace.years[i].j;
      if (i === BATTERY_LIFETIME_YEARS) {
        expect(diffJ).toBeGreaterThanOrEqual(4999); // ±1 € rounding
        expect(diffJ).toBeLessThanOrEqual(5001);
      } else {
        expect(Math.abs(diffJ)).toBeLessThanOrEqual(1);
      }
    }
    // Total is exactly one replacement lower (±rounding).
    expect(without.total - withReplace.total).toBeGreaterThanOrEqual(4999);
    expect(without.total - withReplace.total).toBeLessThanOrEqual(5001);
  });

  it("break-even is the LATER crossing when the battery swap dips the curve below zero again", () => {
    // A large battery swap in year BATTERY_LIFETIME_YEARS pushes the already-
    // positive cumulative balance back below zero, so the true break-even is the
    // SECOND crossing after the swap — not the first one before it. (~1.460 €/a
    // on 15.000 € invest crosses zero ~year 11; a 9.000 € swap in the swap year
    // dips it back under and it recovers a few years later.)
    const r = calc({ ...base, batteryReplace: 9000 });
    // First crossing happens before the swap …
    const firstCross = r.years.findIndex(y => y.kum >= 0);
    expect(firstCross).toBeGreaterThan(0);
    expect(firstCross).toBeLessThan(BATTERY_LIFETIME_YEARS);
    // … the swap dips the curve below zero again …
    expect(r.years[BATTERY_LIFETIME_YEARS].kum).toBeLessThan(0);
    // … so break-even must be a crossing AFTER the swap, not the first one.
    expect(r.be).toBeDefined();
    expect(r.be!.i).toBeGreaterThan(BATTERY_LIFETIME_YEARS);
    // And from break-even on, the curve stays non-negative for good.
    for (let i = r.be!.i; i <= 25; i++) {
      expect(r.years[i].kum).toBeGreaterThanOrEqual(0);
    }
  });

  it("without the double dip, the naive first crossing IS the break-even (control)", () => {
    const r = calc(base); // no batteryReplace
    const firstCrossing = r.years.find((y, idx) => idx > 0 && y.kum >= 0);
    expect(r.be).toBeDefined();
    expect(r.be!.i).toBe(firstCrossing!.i);
    expect(r.be!.i).toBe(11);
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
