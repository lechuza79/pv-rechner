import { describe, it, expect } from "vitest";
import {
  formatMW,
  formatGWh,
  formatPercent,
  calcPeriodStats,
  GENERATION_STACK_KEYS,
  RENEWABLE_KEYS,
  FOSSIL_KEYS,
  SONSTIGE_KEYS,
  META_KEYS,
  ENERGY_COLORS_HEX,
  ENERGY_LABELS,
} from "../chart-utils";

// ─── Formatters ─────────────────────────────────────────────────────────────

describe("formatMW", () => {
  it("formats MW below 1000", () => {
    expect(formatMW(500)).toBe("500 MW");
    expect(formatMW(0)).toBe("0 MW");
    expect(formatMW(999)).toBe("999 MW");
  });

  it("formats GW at and above 1000", () => {
    expect(formatMW(1000)).toBe("1.0 GW");
    expect(formatMW(1500)).toBe("1.5 GW");
    expect(formatMW(45000)).toBe("45.0 GW");
  });
});

describe("formatGWh", () => {
  it("formats small values", () => {
    expect(formatGWh(5.3)).toBe("5.3 GWh");
    expect(formatGWh(0.1)).toBe("0.1 GWh");
  });

  it("formats medium values without decimals", () => {
    expect(formatGWh(123)).toBe("123 GWh");
    expect(formatGWh(999)).toBe("999 GWh");
  });

  it("formats TWh", () => {
    expect(formatGWh(1500)).toBe("1.5 TWh");
    expect(formatGWh(10000)).toBe("10 TWh");
    expect(formatGWh(25000)).toBe("25 TWh");
  });
});

describe("formatPercent", () => {
  it("rounds to integer", () => {
    expect(formatPercent(80.4)).toBe("80 %");
    expect(formatPercent(80.6)).toBe("81 %");
    expect(formatPercent(0)).toBe("0 %");
  });
});

// ─── Key Consistency ────────────────────────────────────────────────────────

describe("energy key consistency", () => {
  it("all GENERATION_STACK_KEYS have colors", () => {
    for (const key of GENERATION_STACK_KEYS) {
      expect(ENERGY_COLORS_HEX[key]).toBeDefined();
    }
  });

  it("all GENERATION_STACK_KEYS have labels", () => {
    for (const key of GENERATION_STACK_KEYS) {
      expect(ENERGY_LABELS[key]).toBeDefined();
    }
  });

  it("all RENEWABLE_KEYS are in GENERATION_STACK_KEYS", () => {
    for (const key of RENEWABLE_KEYS) {
      expect(GENERATION_STACK_KEYS).toContain(key);
    }
  });

  it("all FOSSIL_KEYS are in GENERATION_STACK_KEYS", () => {
    for (const key of FOSSIL_KEYS) {
      expect(GENERATION_STACK_KEYS).toContain(key);
    }
  });

  it("all SONSTIGE_KEYS are in GENERATION_STACK_KEYS", () => {
    for (const key of SONSTIGE_KEYS) {
      expect(GENERATION_STACK_KEYS).toContain(key);
    }
  });

  it("SONSTIGE_KEYS don't overlap with RENEWABLE or FOSSIL", () => {
    for (const key of SONSTIGE_KEYS) {
      expect(RENEWABLE_KEYS).not.toContain(key);
      expect(FOSSIL_KEYS).not.toContain(key);
    }
  });

  it("RENEWABLE and FOSSIL keys don't overlap", () => {
    for (const key of RENEWABLE_KEYS) {
      expect(FOSSIL_KEYS).not.toContain(key);
    }
  });

  it("META_KEYS do not overlap with GENERATION_STACK_KEYS", () => {
    for (const key of META_KEYS) {
      expect(GENERATION_STACK_KEYS).not.toContain(key);
    }
  });
});

// ─── calcPeriodStats ────────────────────────────────────────────────────────

describe("calcPeriodStats", () => {
  it("returns null for fewer than 2 data points", () => {
    expect(calcPeriodStats([])).toBeNull();
    expect(calcPeriodStats([{ ts: "2026-01-01T00:00:00Z" }])).toBeNull();
  });

  it("calculates EE share correctly", () => {
    // 15-min intervals: 2 points, 15 min apart
    const data = [
      {
        ts: "2026-01-01T12:00:00Z",
        solar: 10000,      // 10 GW renewable
        wind_onshore: 5000, // 5 GW renewable
        fossil_gas: 5000,   // 5 GW fossil
        load: 20000,
      },
      {
        ts: "2026-01-01T12:15:00Z",
        solar: 10000,
        wind_onshore: 5000,
        fossil_gas: 5000,
        load: 20000,
      },
    ];

    const stats = calcPeriodStats(data);
    expect(stats).not.toBeNull();
    // 15 GW renewable / 20 GW total = 75%
    expect(stats!.eeSharePct).toBe(75);
  });

  it("calculates energy in GWh from MW × hours", () => {
    // 2 points 1 hour apart, each 10000 MW = 10 GW
    const data = [
      { ts: "2026-01-01T12:00:00Z", solar: 10000, load: 10000 },
      { ts: "2026-01-01T13:00:00Z", solar: 10000, load: 10000 },
    ];

    const stats = calcPeriodStats(data);
    expect(stats).not.toBeNull();
    // Each point: 10000 MW × 1h = 10000 MWh = 10 GWh, 2 points = 20 GWh
    expect(stats!.totalGenerationGWh).toBe(20);
    expect(stats!.renewableGWh).toBe(20);
  });

  it("calculates net import/export", () => {
    const data = [
      { ts: "2026-01-01T12:00:00Z", solar: 30000, load: 20000 },
      { ts: "2026-01-01T13:00:00Z", solar: 30000, load: 20000 },
    ];

    const stats = calcPeriodStats(data);
    // load (40 GWh) - generation (60 GWh) = -20 GWh (net export)
    expect(stats!.netImportGWh).toBeLessThan(0);
  });

  it("ignores negative values in generation", () => {
    const data = [
      { ts: "2026-01-01T12:00:00Z", solar: 10000, fossil_gas: -500, load: 10000 },
      { ts: "2026-01-01T12:15:00Z", solar: 10000, fossil_gas: -500, load: 10000 },
    ];

    const stats = calcPeriodStats(data);
    // Only solar counted (10000 MW), fossil_gas negative → ignored
    expect(stats!.eeSharePct).toBe(100);
  });
});
