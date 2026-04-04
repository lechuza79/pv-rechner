import { describe, it, expect } from "vitest";

// ─── Nuclear Import Calculation (pure logic, extracted for testing) ──────────

interface CountryMix {
  nuclear: number;
  total: number;
}

/**
 * Calculate nuclear import for a single timestamp.
 * This mirrors the logic in app/api/energy/nuclear-import/route.ts
 */
function calcNuclearImportGw(
  flows: Record<string, number>,
  countryMixes: Map<string, CountryMix>,
  nuclearCountries: string[]
): number {
  let nuclearGw = 0;
  for (const code of nuclearCountries) {
    const flowGw = flows[code] ?? 0;
    if (flowGw <= 0) continue; // Only imports

    const mix = countryMixes.get(code);
    if (!mix || mix.total <= 0) continue;

    const nuclearShare = mix.nuclear / mix.total;
    nuclearGw += flowGw * nuclearShare;
  }
  return Math.round(nuclearGw * 1000) / 1000;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("nuclear import calculation", () => {
  const countries = ["fr", "cz", "ch"];

  it("calculates nuclear share of imports correctly", () => {
    const flows = { fr: 2.0, cz: 0.5 }; // 2 GW from France, 0.5 GW from Czechia
    const mixes = new Map<string, CountryMix>([
      ["fr", { nuclear: 40000, total: 60000 }], // 66.7% nuclear
      ["cz", { nuclear: 2000, total: 8000 }],   // 25% nuclear
    ]);

    const result = calcNuclearImportGw(flows, mixes, countries);
    // France: 2.0 × 0.667 = 1.333
    // Czechia: 0.5 × 0.25 = 0.125
    // Total: 1.458 GW
    expect(result).toBeCloseTo(1.458, 2);
  });

  it("ignores exports (negative flows)", () => {
    const flows = { fr: -1.0 }; // Export TO France
    const mixes = new Map<string, CountryMix>([
      ["fr", { nuclear: 40000, total: 60000 }],
    ]);

    const result = calcNuclearImportGw(flows, mixes, countries);
    expect(result).toBe(0);
  });

  it("ignores zero flows", () => {
    const flows = { fr: 0 };
    const mixes = new Map<string, CountryMix>([
      ["fr", { nuclear: 40000, total: 60000 }],
    ]);

    const result = calcNuclearImportGw(flows, mixes, countries);
    expect(result).toBe(0);
  });

  it("handles missing country mix data gracefully", () => {
    const flows = { fr: 2.0 };
    const mixes = new Map<string, CountryMix>(); // No data

    const result = calcNuclearImportGw(flows, mixes, countries);
    expect(result).toBe(0);
  });

  it("handles zero total generation", () => {
    const flows = { fr: 2.0 };
    const mixes = new Map<string, CountryMix>([
      ["fr", { nuclear: 0, total: 0 }], // No generation data
    ]);

    const result = calcNuclearImportGw(flows, mixes, countries);
    expect(result).toBe(0);
  });

  it("handles country with no nuclear but positive import", () => {
    const flows = { ch: 1.0 }; // Switzerland
    const mixes = new Map<string, CountryMix>([
      ["ch", { nuclear: 0, total: 10000 }], // Hydro only, no nuclear
    ]);

    const result = calcNuclearImportGw(flows, mixes, countries);
    expect(result).toBe(0);
  });

  it("sums across multiple countries", () => {
    const flows = { fr: 1.0, cz: 1.0, ch: 1.0 };
    const mixes = new Map<string, CountryMix>([
      ["fr", { nuclear: 50000, total: 100000 }], // 50%
      ["cz", { nuclear: 20000, total: 100000 }], // 20%
      ["ch", { nuclear: 30000, total: 100000 }], // 30%
    ]);

    const result = calcNuclearImportGw(flows, mixes, countries);
    // 1.0 × 0.5 + 1.0 × 0.2 + 1.0 × 0.3 = 1.0 GW
    expect(result).toBe(1);
  });

  it("only considers specified nuclear countries", () => {
    const flows = { fr: 1.0, dk: 1.0 }; // Denmark has no nuclear
    const mixes = new Map<string, CountryMix>([
      ["fr", { nuclear: 50000, total: 100000 }],
      ["dk", { nuclear: 0, total: 50000 }],
    ]);

    // dk is not in the countries list, so it's ignored
    const result = calcNuclearImportGw(flows, mixes, countries);
    expect(result).toBe(0.5);
  });
});
