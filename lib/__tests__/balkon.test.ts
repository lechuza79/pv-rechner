import { describe, it, expect } from "vitest";
import { calcBalkon, recommendBalkonSet } from "../balkon";
import { DEFAULT_BALKON_CONFIG as CFG } from "../balkon-config";

const base = {
  setId: "duo" as const,
  orientationId: "sued_gelaender" as const,
  presenceId: "teils" as const,
  haushaltKwh: 2800,
  specificYield: 950,
  stromPrice: 0.34,
};

describe("calcBalkon", () => {
  it("caps annual yield at the inverter limit (clipping) for the max set", () => {
    const r = calcBalkon({ ...base, setId: "max", orientationId: "sued_flach" });
    // 2000 Wp × 950 × 1.0 = 1900 kWh raw, aber 800 W × 1250 h = 1000 kWh Deckel
    expect(r.annualYield).toBe(1000);
    expect(r.clipped).toBe(true);
  });

  it("does not clip a small vertically mounted set", () => {
    const r = calcBalkon({ ...base, setId: "single", orientationId: "sued_gelaender" });
    // 500 Wp × 950 × 0.72 = 342 kWh < 600 W × 1250 = 750 kWh Deckel
    expect(r.clipped).toBe(false);
    expect(r.annualYield).toBe(342);
  });

  it("never self-consumes more than the household uses", () => {
    const r = calcBalkon({ ...base, haushaltKwh: 200 });
    expect(r.selfUsedKwh).toBeLessThanOrEqual(200);
    expect(r.autarky).toBeLessThanOrEqual(1);
  });

  it("self-consumption share falls as the system grows", () => {
    const small = calcBalkon({ ...base, setId: "single", orientationId: "sued_flach" });
    const big = calcBalkon({ ...base, setId: "max", orientationId: "sued_flach" });
    expect(small.selfShare).toBeGreaterThan(big.selfShare);
  });

  it("saving equals self-used energy times the electricity price", () => {
    const r = calcBalkon(base);
    expect(r.savingPerYear).toBe(Math.round(r.selfUsedKwh * base.stromPrice));
  });

  it("feed-in is the unused remainder of the yield", () => {
    const r = calcBalkon(base);
    expect(r.feedInKwh).toBe(r.annualYield - r.selfUsedKwh);
  });

  it("amortises within a plausible range for the standard set", () => {
    const r = calcBalkon(base);
    expect(r.amortYears).toBeGreaterThan(2);
    expect(r.amortYears).toBeLessThan(8);
  });

  it("respects an overridden invest price", () => {
    const r = calcBalkon({ ...base, invest: 250 });
    expect(r.invest).toBe(250);
    expect(r.amortYears).toBeCloseTo(250 / r.savingPerYear, 5);
  });

  it("uses the config lifetime for the lifetime saving horizon", () => {
    const r = calcBalkon(base);
    // grob: selfUsed × Preis × ~Lebensdauer − Invest, mit Degradation etwas darunter
    const naive = base.stromPrice * r.selfUsedKwh * CFG.lifetimeYears - r.invest;
    expect(r.lifetimeSaving).toBeLessThan(naive);
    expect(r.lifetimeSaving).toBeGreaterThan(naive * 0.9);
  });
});

describe("recommendBalkonSet", () => {
  const base = {
    orientationId: "sued_gelaender" as const,
    presenceId: "teils" as const,
    haushaltKwh: 2800,
    specificYield: 950,
    stromPrice: 0.34,
  };

  it("ranks all three sets by 20-year net gain, descending", () => {
    const rec = recommendBalkonSet(base);
    expect(rec.ranked).toHaveLength(3);
    expect(rec.ranked[0].result.lifetimeSaving).toBeGreaterThanOrEqual(rec.ranked[1].result.lifetimeSaving);
    expect(rec.ranked[1].result.lifetimeSaving).toBeGreaterThanOrEqual(rec.ranked[2].result.lifetimeSaving);
    expect(rec.bestId).toBe(rec.ranked[0].id);
  });

  it("recommends a bigger set for a household that can absorb the yield", () => {
    const rec = recommendBalkonSet({ ...base, haushaltKwh: 4500, presenceId: "home" });
    expect(rec.bestId).toBe("max");
  });

  it("does not push the largest set when the inverter is already saturated (optimal orientation)", () => {
    // Süd, aufgeständert lastet den 800-W-Wechselrichter fast aus → zusätzliche
    // Module bringen kaum mehr Ertrag, kosten aber extra → duo schlägt max.
    const rec = recommendBalkonSet({ ...base, orientationId: "sued_flach" });
    expect(rec.bestId).toBe("duo");
  });

  it("recommends the largest set for a vertical balcony (angle loss favours more modules)", () => {
    const rec = recommendBalkonSet({ ...base, orientationId: "sued_gelaender", haushaltKwh: 3800 });
    expect(rec.bestId).toBe("max");
  });

  it("bestId is one of the three configured sets", () => {
    const rec = recommendBalkonSet(base);
    expect(CFG.sets.map(s => s.id)).toContain(rec.bestId);
  });
});
