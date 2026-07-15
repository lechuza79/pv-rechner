import { describe, it, expect } from "vitest";
import {
  SAMPLE_POINTS,
  capacityShare,
  weightedSolarNow,
  dayOfYearUtc,
  type SolarSample,
} from "../solar-now";
import {
  sunElevation,
  clearSkyGhi,
  utilisation,
  applyConditions,
  DE_LAT,
  DE_LON,
} from "../theme-schedule";

const JUN_21 = 172;
const DEC_21 = 355;
// Solar noon over Germany is ~11:18 UTC (lon 10.45°E).
const SOLAR_NOON_UTC = 11.3;

describe("sunElevation", () => {
  it("is highest at solar noon and negative at midnight", () => {
    const noon = sunElevation(JUN_21, SOLAR_NOON_UTC, DE_LAT, DE_LON);
    const midnight = sunElevation(JUN_21, 23.3, DE_LAT, DE_LON);
    expect(noon).toBeGreaterThan(60); // ~62° midsummer at 51°N
    expect(midnight).toBeLessThan(0);
  });

  it("is far lower at midwinter noon than midsummer noon", () => {
    const summer = sunElevation(JUN_21, SOLAR_NOON_UTC, DE_LAT, DE_LON);
    const winter = sunElevation(DEC_21, SOLAR_NOON_UTC, DE_LAT, DE_LON);
    expect(winter).toBeGreaterThan(10); // ~15° — low, but up
    expect(winter).toBeLessThan(20);
    expect(summer - winter).toBeGreaterThan(40);
  });
});

describe("clearSkyGhi", () => {
  it("is zero below the horizon and high at a summer noon", () => {
    expect(clearSkyGhi(-5)).toBe(0);
    expect(clearSkyGhi(0)).toBe(0);
    expect(clearSkyGhi(62)).toBeGreaterThan(800);
  });

  it("is much lower at a winter noon than a summer noon", () => {
    expect(clearSkyGhi(15)).toBeLessThan(clearSkyGhi(62) / 2);
    expect(clearSkyGhi(15)).toBeGreaterThan(100);
  });
});

describe("utilisation", () => {
  it("is null when the sun is effectively down", () => {
    expect(utilisation(0, 0)).toBeNull();
    expect(utilisation(5, 10)).toBeNull();
  });
  it("is the share of the clear-sky potential, clamped to 0–1", () => {
    expect(utilisation(400, 800)).toBeCloseTo(0.5, 2);
    expect(utilisation(900, 800)).toBe(1);
    expect(utilisation(0, 800)).toBe(0);
  });
});

// The decision this feature turns on: a crisp winter noon must stay bright,
// an overcast noon must dim — and neither may ever read as night.
describe("applyConditions — the winter question", () => {
  const clearWinterNoon = clearSkyGhi(sunElevation(DEC_21, SOLAR_NOON_UTC, DE_LAT, DE_LON));

  it("keeps a clear winter noon bright, though its absolute power is low", () => {
    const util = utilisation(clearWinterNoon * 0.95, clearWinterNoon);
    expect(applyConditions("light", util)).toBe("light");
  });

  it("dims an overcast noon to dusk", () => {
    const util = utilisation(clearWinterNoon * 0.15, clearWinterNoon);
    expect(applyConditions("light", util)).toBe("dusk");
  });

  it("never turns daylight into night, however thick the cloud", () => {
    expect(applyConditions("light", 0)).toBe("dusk");
  });

  it("leaves night and dusk alone — the sun being down always wins", () => {
    expect(applyConditions("dark", 1)).toBe("dark");
    expect(applyConditions("dusk", 1)).toBe("dusk");
  });

  it("falls back to the sun-position theme when conditions are unknown", () => {
    expect(applyConditions("light", null)).toBe("light");
    expect(applyConditions("dark", null)).toBe("dark");
  });
});

describe("capacityShare", () => {
  it("is zero in the dark and rises with irradiance", () => {
    expect(capacityShare(0, 10)).toBe(0);
    expect(capacityShare(800, 20)).toBeGreaterThan(capacityShare(400, 20));
  });
  it("stays in a plausible range at full sun", () => {
    const share = capacityShare(1000, 25);
    expect(share).toBeGreaterThan(0.6);
    expect(share).toBeLessThan(0.9);
  });
});

describe("weightedSolarNow", () => {
  const at = (ghi: number): SolarSample[] =>
    SAMPLE_POINTS.map((p) => ({ ags: p.ags, lat: p.lat, lon: p.lon, ghi, temp: 20 }));
  const evenWeights = Object.fromEntries(SAMPLE_POINTS.map((p) => [p.ags, 1]));
  const noonUtc = new Date(Date.UTC(2024, 5, 21, 11, 18));

  it("returns no power and unknown conditions at night", () => {
    const r = weightedSolarNow(at(0), evenWeights, new Date(Date.UTC(2024, 5, 21, 0, 0)));
    expect(r.powerPct).toBe(0);
    expect(r.utilisation).toBeNull();
  });

  it("reports high utilisation under a clear summer noon", () => {
    const r = weightedSolarNow(at(850), evenWeights, noonUtc);
    expect(r.powerPct).toBeGreaterThan(40);
    expect(r.utilisation).toBeGreaterThan(0.8);
  });

  it("weights by installed capacity — a dark Bayern drags the country down", () => {
    // Bayern (09) sunny vs. Bayern overcast, everything else identical.
    const sunnyEverywhere = at(800);
    const bayernDark = at(800).map((s) => (s.ags === "09" ? { ...s, ghi: 100 } : s));
    const bayernHeavy = { ...evenWeights, "09": 100 }; // Bayern dominates

    const a = weightedSolarNow(sunnyEverywhere, bayernHeavy, noonUtc);
    const b = weightedSolarNow(bayernDark, bayernHeavy, noonUtc);
    expect(b.powerPct).toBeLessThan(a.powerPct / 2);
  });

  it("ignores regions without a weight", () => {
    const onlyBayern = weightedSolarNow(at(800), { "09": 1 }, noonUtc);
    expect(onlyBayern.powerPct).toBeGreaterThan(0);
    expect(weightedSolarNow(at(800), {}, noonUtc)).toEqual({ powerPct: 0, utilisation: null });
  });
});

describe("dayOfYearUtc", () => {
  it("counts from 1 on Jan 1", () => {
    expect(dayOfYearUtc(new Date(Date.UTC(2024, 0, 1, 12)))).toBe(1);
    expect(dayOfYearUtc(new Date(Date.UTC(2024, 5, 21, 12)))).toBe(173);
  });
});
