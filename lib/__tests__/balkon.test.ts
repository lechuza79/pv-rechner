import { describe, it, expect } from "vitest";
import { calcBalkon, recommendBalkon } from "../balkon";
import { DEFAULT_BALKON_CONFIG as CFG } from "../balkon-config";
import { SOLAR_YEAR_DE, REFERENCE_YEAR_KWH } from "../solar-year";
import { DAYS_IN_MONTH } from "../consumption";

const base = {
  setId: "duo" as const,
  orientationId: "sued_gelaender" as const,
  presenceId: "teils" as const,
  haushaltKwh: 2800,
  specificYield: 950,
  stromPrice: 0.34,
};

describe("Referenz-Sonnenjahr (geteilte Basis)", () => {
  it("reproduces the PVGIS reference year and keeps the peaks", () => {
    // Waechter fuer lib/solar-year.ts: Wird die Datei neu erzeugt, muessen Energie
    // UND Spitze stimmen — sonst kippt still das Clipping und damit die Empfehlung.
    expect(REFERENCE_YEAR_KWH).toBeGreaterThan(1000); // PVGIS 2023: 1012,7 kWh/kWp
    expect(REFERENCE_YEAR_KWH).toBeLessThan(1025);

    const peak = Math.max(...SOLAR_YEAR_DE.flatMap(month => month.flatMap(t => t.w)));
    // Original-Spitze 902 W/kWp, durch die Mittelung im Sextil auf ~810 gedaempft.
    // Faellt sie unter 800, clippt ein 1-kWp-Set gar nicht mehr — dann ist die
    // Verdichtung zu grob geworden.
    expect(peak).toBeGreaterThan(800);
    expect(peak).toBeLessThanOrEqual(902);

    // Jeder Monat braucht alle Tage — sonst fehlt Energie.
    SOLAR_YEAR_DE.forEach((month, m) => {
      const days = month.reduce((s, t) => s + t.days, 0);
      expect(days).toBe(DAYS_IN_MONTH[m]);
    });
  });
});

describe("calcBalkon", () => {
  it("clips the midday peak — more modules still yield more, just not proportionally", () => {
    const max = calcBalkon({ ...base, setId: "max", orientationId: "sued_flach" });
    const duo = calcBalkon({ ...base, setId: "duo", orientationId: "sued_flach" });
    expect(max.clipped).toBe(true);
    // Der Wechselrichter kappt die Spitze, nicht die Jahresmenge auf einen festen
    // Deckel: morgens und abends kommt alles durch. Also mehr als duo …
    expect(max.annualYield).toBeGreaterThan(duo.annualYield);
    // … aber deutlich weniger als das Doppelte, weil mittags gekappt wird.
    expect(max.annualYield).toBeLessThan(2 * duo.annualYield);
  });

  it("clipping eats more of the gain when the inverter already runs at the limit", () => {
    // Aufgeständert steht die Anlage mittags am Anschlag → zusätzliche Module
    // bringen relativ weniger als am (flacheren) Geländer. Physikalische
    // Aussage, die vorher im harten Deckel unterging.
    const ratio = (o: "sued_flach" | "sued_gelaender") =>
      calcBalkon({ ...base, setId: "max", orientationId: o }).annualYield /
      calcBalkon({ ...base, setId: "duo", orientationId: o }).annualYield;
    expect(ratio("sued_flach")).toBeLessThan(ratio("sued_gelaender"));
  });

  it("location changes the result even for a clipped set", () => {
    // Der eigentliche Grund für die Simulation: Ein sonnigerer Standort liegt
    // LÄNGER an der 800-W-Grenze → mehr Ertrag, obwohl gedeckelt. Mit dem alten
    // Jahres-Deckel war die PLZ hier komplett wirkungslos.
    const dim = calcBalkon({ ...base, setId: "max", orientationId: "sued_flach", specificYield: 900 });
    const bright = calcBalkon({ ...base, setId: "max", orientationId: "sued_flach", specificYield: 1150 });
    expect(bright.annualYield).toBeGreaterThan(dim.annualYield);
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

  it("a big set on a small household always spills surplus", () => {
    // Ergebnis der Simulation statt gesetzter Obergrenze: Wenn die Anlage gross
    // und der Haushalt klein ist, ist an Sonnentagen irgendwann der Akku voll UND
    // die Last gedeckt — der Rest fliesst unvergütet ab.
    const r = calcBalkon({ ...base, setId: "max", orientationId: "sued_flach", haushaltKwh: 1200, storageId: "large" });
    expect(r.feedInKwh).toBeGreaterThan(0);
    expect(r.selfShare).toBeLessThan(1);
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

  it("weighs the extra modules against what the inverter still lets through", () => {
    // Süd, aufgeständert lastet den 800-W-Wechselrichter mittags aus → das grosse
    // Set legt relativ weniger drauf als am Geländer. Es kann trotzdem gewinnen
    // (morgens/abends kommt alles durch) — entscheidend ist, dass die Empfehlung
    // den geringeren Zugewinn ueberhaupt sieht. Das alte Jahres-Deckel-Modell
    // machte daraus faelschlich "bringt gar nichts".
    const flat = recommendBalkon({ ...base, orientationId: "sued_flach" });
    const rail = recommendBalkon({ ...base, orientationId: "sued_gelaender" });
    const gain = (r: typeof flat) => {
      const max = r.ranked.find(o => o.setId === "max" && o.storageId === "none")!.result.annualYield;
      const duo = r.ranked.find(o => o.setId === "duo" && o.storageId === "none")!.result.annualYield;
      return max / duo;
    };
    expect(gain(flat)).toBeLessThan(gain(rail));
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

  it("a bigger storage captures more — the gain is real, the price decides", () => {
    // An Sonnentagen faellt mehr Ueberschuss an, als ein kleiner Akku fassen kann
    // → der groessere sammelt mehr ein. Das Jahressummen-Modell verschluckte das
    // (beide Groessen kamen auf dieselbe Menge), die Simulation sieht den
    // Sommertag. Ob sich der Aufpreis lohnt, entscheidet die Wirtschaftlichkeit.
    const small = calcBalkon({ ...base, setId: "max", storageId: "small" });
    const large = calcBalkon({ ...base, setId: "max", storageId: "large" });
    expect(large.storageAddedKwh).toBeGreaterThan(small.storageAddedKwh);
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
