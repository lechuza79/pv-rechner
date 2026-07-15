import { describe, it, expect } from "vitest";
import { calcBalkon, recommendBalkon } from "../balkon";
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
    // Amortisation ist ein Break-even-Jahr mit steigendem Strompreis — höchstens so
    // lang wie die naive Jahr-1-Rechnung (der Preisanstieg verkürzt sie).
    expect(r.amortYears).toBeGreaterThan(0);
    expect(r.amortYears).toBeLessThanOrEqual(250 / r.savingPerYear + 1e-6);
  });

  it("compounds the electricity-price increase over the lifetime", () => {
    const r = calcBalkon(base);
    // Konstanter-Preis-Schätzer (ohne Degradation). Da der Strompreisanstieg
    // (systemweit 3 %/Jahr) die Moduldegradation (0,5 %/Jahr) überwiegt, liegt der
    // Lebensdauer-Gewinn ÜBER dem Konstant-Preis-Schätzer.
    const constantNaive = base.stromPrice * r.selfUsedKwh * CFG.lifetimeYears - r.invest;
    expect(r.lifetimeSaving).toBeGreaterThan(constantNaive);
  });

  it("a higher price increase yields a larger lifetime gain", () => {
    const low = calcBalkon({ ...base, priceIncrease: 0 });
    const high = calcBalkon({ ...base, priceIncrease: 0.05 });
    expect(high.lifetimeSaving).toBeGreaterThan(low.lifetimeSaving);
  });
});

describe("calcBalkon — Speicher", () => {
  it("without storage: no added kWh, self-used equals base, no storage payback", () => {
    const r = calcBalkon(base); // storageId default "none"
    expect(r.storageKwh).toBe(0);
    expect(r.storagePrice).toBe(0);
    expect(r.storageAddedKwh).toBe(0);
    expect(r.selfUsedKwh).toBe(r.baseSelfUsedKwh);
    expect(r.savingPerYear).toBe(r.baseSavingPerYear);
    expect(r.storagePayback).toBe(Infinity);
  });

  it("storage raises self-consumption and yearly saving", () => {
    const without = calcBalkon({ ...base, storageId: "none" });
    const withS = calcBalkon({ ...base, storageId: "small" });
    expect(withS.storageAddedKwh).toBeGreaterThan(0);
    expect(withS.selfUsedKwh).toBeGreaterThan(without.selfUsedKwh);
    expect(withS.savingPerYear).toBeGreaterThan(without.savingPerYear);
    expect(withS.selfShare).toBeGreaterThan(without.selfShare);
  });

  it("storage adds its price to the investment", () => {
    const withS = calcBalkon({ ...base, storageId: "small" });
    const price = CFG.storage.find(s => s.id === "small")!.price;
    expect(withS.storagePrice).toBe(price);
    // duo set price 500 + Speicher-Aufpreis
    expect(withS.invest).toBe(500 + price);
  });

  it("stored energy never exceeds the available surplus", () => {
    // sued_flach saturates the inverter → high self-use already, little surplus
    // for a 2 kWh storage to soak up.
    const r = calcBalkon({ ...base, setId: "max", orientationId: "sued_flach", storageId: "large" });
    const surplusWithoutStorage = r.annualYield - r.baseSelfUsedKwh;
    expect(r.storageAddedKwh).toBeLessThanOrEqual(surplusWithoutStorage);
  });

  it("self-consumption stays at or below the storage cap (never 100 %)", () => {
    const r = calcBalkon({ ...base, storageId: "large", haushaltKwh: 5000 });
    expect(r.selfShare).toBeLessThanOrEqual(CFG.storageSelfShareCap + 1e-9);
  });

  it("storage payback is finite and worse (longer) than the whole-system amortisation", () => {
    const r = calcBalkon({ ...base, storageId: "small", presenceId: "weg" });
    expect(r.storagePayback).toBeGreaterThan(0);
    expect(isFinite(r.storagePayback)).toBe(true);
    // The storage alone pays back slower than the modules+storage together —
    // that is the honest signal that the battery is the weaker part of the deal.
    expect(r.storagePayback).toBeGreaterThan(r.amortYears);
  });

  it("does not store more than the household can consume", () => {
    const r = calcBalkon({ ...base, storageId: "large", haushaltKwh: 300 });
    expect(r.selfUsedKwh).toBeLessThanOrEqual(300);
  });
});

describe("recommendBalkon", () => {
  const base = {
    orientationId: "sued_gelaender" as const,
    presenceId: "teils" as const,
    haushaltKwh: 2800,
    specificYield: 950,
    stromPrice: 0.34,
  };

  it("ranks all set×storage combinations by 20-year net gain, descending", () => {
    const rec = recommendBalkon(base);
    expect(rec.ranked).toHaveLength(CFG.sets.length * CFG.storage.length);
    for (let i = 1; i < rec.ranked.length; i++) {
      expect(rec.ranked[i - 1].result.lifetimeSaving).toBeGreaterThanOrEqual(rec.ranked[i].result.lifetimeSaving);
    }
    // Die Empfehlung ist eine der gerankten Kombinationen — aber nicht zwingend die
    // NPV-Nr. 1: der Speicher wird nur empfohlen, wenn er sich innerhalb der
    // Amortisations-Schwelle rechnet (konservatives Gate).
    expect(rec.ranked).toContain(rec.best);
  });

  it("recommends a bigger set for a household that can absorb the yield", () => {
    const rec = recommendBalkon({ ...base, haushaltKwh: 4500, presenceId: "home" });
    expect(rec.best.setId).toBe("max");
  });

  it("does not push the largest set when the inverter is already saturated (optimal orientation)", () => {
    // Süd, aufgeständert lastet den 800-W-Wechselrichter fast aus → zusätzliche
    // Module bringen kaum mehr Ertrag, kosten aber extra → duo schlägt max.
    const rec = recommendBalkon({ ...base, orientationId: "sued_flach" });
    expect(rec.best.setId).toBe("duo");
  });

  it("recommends the largest set for a vertical balcony (angle loss favours more modules)", () => {
    const rec = recommendBalkon({ ...base, orientationId: "sued_gelaender", haushaltKwh: 3800 });
    expect(rec.best.setId).toBe("max");
  });

  it("best config uses one of the configured sets and storage options", () => {
    const rec = recommendBalkon(base);
    expect(CFG.sets.map(s => s.id)).toContain(rec.best.setId);
    expect(CFG.storage.map(s => s.id)).toContain(rec.best.storageId);
  });

  it("storage pays back slower for someone home all day than for someone away", () => {
    // Oft zuhause → der Strom wird schon tagsüber direkt verbraucht: weniger
    // Überschuss zum Puffern UND weniger Abendbedarf zum Entladen → der Speicher
    // rechnet sich langsamer. Robuste Aussage: gilt bei jedem Strompreis, anders
    // als die Frage, ob er die Empfehlungs-Schwelle gerade eben reißt.
    const home = calcBalkon({ ...base, setId: "max", presenceId: "home", storageId: "small" });
    const away = calcBalkon({ ...base, setId: "max", presenceId: "weg", storageId: "small" });
    expect(home.storageAddedKwh).toBeLessThan(away.storageAddedKwh);
    expect(home.storagePayback).toBeGreaterThan(away.storagePayback);
  });

  it("a bigger storage brings nothing extra once the balcony surplus is the limit", () => {
    // Kernaussage des Modells: Ein Balkon liefert zu wenig Überschuss, um einen
    // grossen Speicher zu fuellen/leeren → die groessere Stufe schiebt dieselbe
    // Menge, kostet aber mehr → sie gewinnt nie.
    const small = calcBalkon({ ...base, setId: "max", storageId: "small" });
    const large = calcBalkon({ ...base, setId: "max", storageId: "large" });
    expect(large.storageAddedKwh).toBe(small.storageAddedKwh);
    expect(large.lifetimeSaving).toBeLessThan(small.lifetimeSaving);
  });

  it("DOES recommend a storage when the household is away by day (much surplus)", () => {
    // Tagsüber weg → viel Überschuss, der abends aus dem Speicher gedeckt wird →
    // ein Speicher amortisiert sich klar → wird empfohlen.
    const rec = recommendBalkon({ ...base, presenceId: "weg", haushaltKwh: 3200 });
    expect(rec.best.storageId).not.toBe("none");
    expect(rec.best.result.storagePayback).toBeLessThanOrEqual(CFG.storageRecommendMaxPayback);
  });

  it("a recommended storage always amortises within the recommend threshold", () => {
    // Invariante: wenn ein Speicher empfohlen wird, rechnet er sich unter der
    // Schwelle — der ehrliche Gate.
    for (const presenceId of ["weg", "teils", "home"] as const) {
      for (const kwh of [1500, 2800, 4500]) {
        const rec = recommendBalkon({ ...base, presenceId, haushaltKwh: kwh });
        if (rec.best.storageId !== "none") {
          expect(rec.best.result.storagePayback).toBeLessThanOrEqual(CFG.storageRecommendMaxPayback);
        }
      }
    }
  });

  it("returns switchable alternatives that differ from the recommendation", () => {
    const rec = recommendBalkon(base);
    expect(rec.alternatives.length).toBeGreaterThan(0);
    for (const alt of rec.alternatives) {
      const sameAsBest = alt.setId === rec.best.setId && alt.storageId === rec.best.storageId;
      expect(sameAsBest).toBe(false);
    }
  });

  it("provides plain-language reasons for set and storage choice", () => {
    const rec = recommendBalkon(base);
    expect(rec.setReason.length).toBeGreaterThan(0);
    expect(rec.storageReason.length).toBeGreaterThan(0);
  });
});
