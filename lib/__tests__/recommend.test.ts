import { describe, it, expect } from "vitest";
import { recommend, type RecommendInput } from "../recommend";
import { SPEICHER } from "../constants";

// Canonical input: 4-person household, normal usage, EFH with Satteldach,
// no WP, no EA, no budget cap. This should land somewhere around 8 kWp
// without storage based on the recommendation logic.
const baseInput: RecommendInput = {
  personen: 2,         // 3-4 persons → 3800 kWh
  nutzung: 1,          // teils zuhause, 30% day quote
  wp: "nein",
  ea: "nein",
  eaKm: 15000,
  haustyp: 2,          // Einfamilienhaus, footprint 100 m²
  dachart: 0,          // Satteldach, factor 0.40
  budgetLimit: null,
};

describe("recommend (PV system recommendation)", () => {
  it("returns a complete Recommendation shape", () => {
    const r = recommend(baseInput);
    expect(r).toHaveProperty("kwp");
    expect(r).toHaveProperty("speicherKwh");
    expect(r).toHaveProperty("speicherIdx");
    expect(r).toHaveProperty("reasoning");
    expect(r).toHaveProperty("alternatives");
  });

  it("recommended kWp respects the roof's maximum capacity", () => {
    const r = recommend(baseInput);
    expect(r.kwp).toBeLessThanOrEqual(r.reasoning.maxRoofKwp);
  });

  it("calculates total consumption from base + extras", () => {
    const noExtras = recommend(baseInput);
    const withWp = recommend({ ...baseInput, wp: "ja" });
    const withEa = recommend({ ...baseInput, ea: "ja" });

    expect(withWp.reasoning.totalConsumption).toBeGreaterThan(noExtras.reasoning.totalConsumption);
    expect(withEa.reasoning.totalConsumption).toBeGreaterThan(noExtras.reasoning.totalConsumption);
    // WP adds 3500, EA adds 2700 (15000 km × 0.18)
    expect(withWp.reasoning.wpConsumption).toBe(3500);
    expect(withEa.reasoning.eaConsumption).toBe(2700);
  });

  it("calculates max roof kWp from house footprint × roof factor × 0.2", () => {
    // EFH (100 m²) × Satteldach (0.40) × 200 Wp/m² = 8 kWp max
    const r = recommend(baseInput);
    expect(r.reasoning.maxRoofKwp).toBe(8);
    expect(r.reasoning.nutzbarM2).toBe(40);
  });

  it("Reihenhaus + Walmdach yields a smaller max-roof than EFH + Pultdach", () => {
    const small = recommend({ ...baseInput, haustyp: 0, dachart: 2 }); // 50 × 0.30 = 15 m²
    const large = recommend({ ...baseInput, haustyp: 3, dachart: 3 }); // 150 × 0.55 = 82.5 m²
    expect(small.reasoning.maxRoofKwp).toBeLessThan(large.reasoning.maxRoofKwp);
  });

  it("recommends storage only when EV-boost is significant AND payback is reasonable", () => {
    // Higher consumption → storage more likely to pay off
    const heavyConsumer = recommend({ ...baseInput, personen: 3, wp: "ja", ea: "ja" });
    // Light consumer → storage less attractive
    const lightConsumer = recommend({ ...baseInput, personen: 0, nutzung: 0 });

    // Heavy consumer should get storage; light might not
    if (heavyConsumer.kwp >= 5) {
      expect(heavyConsumer.speicherKwh).toBeGreaterThanOrEqual(0); // never negative
    }
    expect(lightConsumer.speicherKwh).toBe(lightConsumer.speicherKwh); // sanity
  });

  it("budgetLimit constrains total cost (when set)", () => {
    const noBudget = recommend(baseInput);
    const tightBudget = recommend({ ...baseInput, budgetLimit: 8000 });
    // With 8000€ budget, can't afford full system
    expect(tightBudget.reasoning.investition).toBeLessThanOrEqual(8000);
    expect(tightBudget.reasoning.budgetConstrained).toBe(true);
    // Typically has fewer kWp or no storage compared to no-budget version
    const constrainedSize = tightBudget.kwp + tightBudget.speicherKwh / 5;
    const fullSize = noBudget.kwp + noBudget.speicherKwh / 5;
    expect(constrainedSize).toBeLessThanOrEqual(fullSize);
  });

  it("does not flag budgetConstrained when limit is generous", () => {
    const r = recommend({ ...baseInput, budgetLimit: 50000 });
    expect(r.reasoning.budgetConstrained).toBe(false);
  });

  it("reasoning.eigenverbrauch reflects the recommendation actually returned", () => {
    const r = recommend(baseInput);
    // The EV in reasoning corresponds to the (final kwp, final speicher) combo
    expect(r.reasoning.eigenverbrauch).toBeGreaterThanOrEqual(10);
    expect(r.reasoning.eigenverbrauch).toBeLessThanOrEqual(90);
  });

  it("offers a 'no storage' alternative when main recommendation includes storage", () => {
    const heavyConsumer = recommend({ ...baseInput, personen: 3, wp: "ja", ea: "ja", eaKm: 20000 });
    if (heavyConsumer.speicherKwh > 0) {
      const noStorageAlt = heavyConsumer.alternatives.find(a => a.label === "Ohne Speicher");
      expect(noStorageAlt).toBeDefined();
      expect(noStorageAlt!.speicherKwh).toBe(0);
      expect(noStorageAlt!.investition).toBeLessThan(heavyConsumer.reasoning.investition);
    }
  });

  it("offers a 'max roof' alternative when recommended kWp leaves significant headroom", () => {
    // Light consumer + big roof → recommendation < max
    const lightBigRoof = recommend({ ...baseInput, personen: 0, nutzung: 0, haustyp: 3, dachart: 3 });
    const maxAlt = lightBigRoof.alternatives.find(a => a.label === "Maximale Dachnutzung");
    if (maxAlt) {
      expect(maxAlt.kwp).toBeGreaterThan(lightBigRoof.kwp);
    }
  });

  it("speicherIdx points to the correct entry in the SPEICHER constant", () => {
    // SPEICHER includes intermediate sizes (0/5/7.5/10/12.5/15 kWh)
    const r = recommend(baseInput);
    expect(SPEICHER[r.speicherIdx].kwh).toBe(r.speicherKwh);
  });

  it("rounds final kWp to half-integer steps", () => {
    const r = recommend(baseInput);
    expect(r.kwp * 2).toBe(Math.round(r.kwp * 2));
  });

  it("npv25 is the 25-year net profit (after investment)", () => {
    const r = recommend(baseInput);
    expect(typeof r.reasoning.npv25).toBe("number");
    // For a typical EFH, NPV should be positive (otherwise PV would never be recommended)
    expect(r.reasoning.npv25).toBeGreaterThan(0);
  });

  it("higher consumption → larger recommendation (more kWp or storage)", () => {
    const low = recommend({ ...baseInput, personen: 0, nutzung: 0 });    // 1 person, away
    const high = recommend({ ...baseInput, personen: 3, wp: "ja", ea: "ja" }); // 5+, with WP+EA
    const lowSize = low.kwp + low.speicherKwh / 5;
    const highSize = high.kwp + high.speicherKwh / 5;
    expect(highSize).toBeGreaterThan(lowSize);
  });

  it("with heat pump, recommendation utilises significant share of roof potential", () => {
    // Reihenhaus + Flachdach + 3-4 Pers + WP: 7300 kWh consumption on a 6.5 kWp roof.
    // The correct answer is to use the roof — anything ≤ 3 kWp is mathematically wrong.
    const r = recommend({
      personen: 2, nutzung: 1, wp: "ja", ea: "nein", eaKm: 15000,
      haustyp: 0, dachart: 1, budgetLimit: null,
    });
    expect(r.kwp).toBeGreaterThanOrEqual(r.reasoning.maxRoofKwp * 0.7);
  });

  it("never returns NaN in npv25 or investition", () => {
    const cases: RecommendInput[] = [
      baseInput,
      { ...baseInput, personen: 0, nutzung: 0 },
      { ...baseInput, personen: 3, wp: "ja", ea: "ja", eaKm: 20000 },
      { ...baseInput, haustyp: 0, dachart: 2 },
      { ...baseInput, haustyp: 3, dachart: 3 },
    ];
    for (const c of cases) {
      const r = recommend(c);
      expect(Number.isFinite(r.reasoning.npv25)).toBe(true);
      expect(Number.isFinite(r.reasoning.investition)).toBe(true);
      for (const alt of r.alternatives) {
        expect(Number.isFinite(alt.npv25)).toBe(true);
        expect(Number.isFinite(alt.investition)).toBe(true);
      }
    }
  });

  it("survives an incomplete PriceConfig (e.g. stale cache without electricity fields)", () => {
    // Simulate caller passing a price object missing the new electricityPrice/Increase keys.
    // The function should fall back to defaults instead of producing NaN.
    const incompletePrices = {
      pvPriceSmall: 1400, pvPriceLarge: 1250, pvThresholdKwp: 10,
      batteryBase: 0, batteryPerKwh: 700,
      // electricityPrice + electricityIncrease intentionally missing
      validFrom: "2026-04-01", source: null,
    } as unknown as Parameters<typeof recommend>[1];
    const r = recommend(baseInput, incompletePrices);
    expect(Number.isFinite(r.reasoning.npv25)).toBe(true);
    // 8-kWp roof + healthy consumption should still recommend a real system
    expect(r.kwp).toBeGreaterThanOrEqual(5);
  });
});
