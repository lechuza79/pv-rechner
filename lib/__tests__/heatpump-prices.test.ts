import { describe, it, expect } from "vitest";
import {
  deriveLwwpBaseFromRanges,
  REFERENCE_HEIZLAST_KW,
  WP_PRICE_BOUNDS,
  DEFAULT_HEATPUMP_PRICES,
} from "../heatpump-prices";
import { DEFAULT_HEATPUMP_CONFIG } from "../heatpump-config";

describe("REFERENCE_HEIZLAST_KW", () => {
  it("is a plausible single-family-home heat load (~8–12 kW)", () => {
    expect(REFERENCE_HEIZLAST_KW).toBeGreaterThan(6);
    expect(REFERENCE_HEIZLAST_KW).toBeLessThan(14);
  });
});

describe("deriveLwwpBaseFromRanges", () => {
  const perKw = DEFAULT_HEATPUMP_CONFIG.investLwwpPerKw;

  it("derives the base from the taptaphome LWWP ranges (Gerät 12–20k, Einbau 3–7,5k)", () => {
    const base = deriveLwwpBaseFromRanges(12000, 20000, 3000, 7500, perKw);
    expect(base).not.toBeNull();
    // typical all-in = mid(Gerät) + mid(Einbau) = 16000 + 5250 = 21250
    // base = 21250 − perKw × ref, rounded to 500
    const expected = Math.round((21250 - perKw * REFERENCE_HEIZLAST_KW) / 500) * 500;
    expect(base).toBe(expected);
  });

  it("lands markedly below the old 18.000 € flat base (fixes small-system overpricing)", () => {
    const base = deriveLwwpBaseFromRanges(12000, 20000, 3000, 7500, perKw)!;
    expect(base).toBeLessThan(14000);
    expect(base).toBeGreaterThanOrEqual(WP_PRICE_BOUNDS.lwwpBaseMin);
  });

  it("at the reference heat load the model stays on the scraped market level", () => {
    const base = deriveLwwpBaseFromRanges(12000, 20000, 3000, 7500, perKw)!;
    const modelAtRef = base + perKw * REFERENCE_HEIZLAST_KW;
    // within one rounding step (500 €) of the scraped typical all-in (21250)
    expect(Math.abs(modelAtRef - 21250)).toBeLessThanOrEqual(500);
  });

  it("returns null when the derived base exceeds the plausibility window", () => {
    expect(deriveLwwpBaseFromRanges(30000, 40000, 20000, 30000, perKw)).toBeNull();
  });

  it("returns null when the derived base falls below the plausibility window", () => {
    expect(deriveLwwpBaseFromRanges(3000, 4000, 1000, 2000, perKw)).toBeNull();
  });

  it("returns null for inverted or non-positive ranges", () => {
    expect(deriveLwwpBaseFromRanges(20000, 12000, 3000, 7500, perKw)).toBeNull();
    expect(deriveLwwpBaseFromRanges(12000, 20000, 7500, 3000, perKw)).toBeNull();
    expect(deriveLwwpBaseFromRanges(0, 20000, 3000, 7500, perKw)).toBeNull();
    expect(deriveLwwpBaseFromRanges(12000, 20000, -1, 7500, perKw)).toBeNull();
  });

  it("rounds to the nearest 500 €", () => {
    const base = deriveLwwpBaseFromRanges(12000, 20000, 3000, 7500, perKw)!;
    expect(base % 500).toBe(0);
  });
});

describe("DEFAULT_HEATPUMP_PRICES", () => {
  it("mirrors the config snapshot (fallback when the DB is unavailable)", () => {
    expect(DEFAULT_HEATPUMP_PRICES.investLwwpBase).toBe(DEFAULT_HEATPUMP_CONFIG.investLwwpBase);
    expect(DEFAULT_HEATPUMP_PRICES.investLwwpPerKw).toBe(DEFAULT_HEATPUMP_CONFIG.investLwwpPerKw);
  });
});
