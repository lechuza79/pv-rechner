import { describe, expect, it } from "vitest";
import { empfiehlMesskonzept, messkonzeptKosten, PARAGRAF_14A, type MesskonzeptEingabe } from "../wp-messkonzept";
import { simulatePvYear } from "../pv-sim";

const basis = (over: Partial<MesskonzeptEingabe> = {}): MesskonzeptEingabe => ({
  mitWp: { gridKwh: 5000, feedInKwh: 4000, wpLoadKwh: 4000, wpSelfCoveredKwh: 1000 },
  ohneWp: { gridKwh: 2500, feedInKwh: 4800 },
  haushaltsPreis: 0.31, wpTarif: 0.24, wpZaehlerGrundpreis: 50, einspeiseSatz: 0.08,
  ...over,
});
const by = (e: MesskonzeptEingabe) => Object.fromEntries(messkonzeptKosten(e).map(k => [k.id, k]));

describe("heat-pump metering options", () => {
  it("module 1 lowers the shared meter by exactly the BNetzA range", () => {
    const k = by(basis()).gemeinsam;
    const brutto = 5000 * 0.31 - 4000 * 0.08;
    expect(k.max).toBeCloseTo(brutto - PARAGRAF_14A.modul1EuroProJahr.min, 6);
    expect(k.min).toBeCloseTo(brutto - PARAGRAF_14A.modul1EuroProJahr.max, 6);
  });

  it("anchors the BNetzA statement read on 06.10.2026", () => {
    expect(PARAGRAF_14A.modul1EuroProJahr).toEqual({ min: 110, max: 190 });
    expect(PARAGRAF_14A.modul2ArbeitspreisAnteil).toBe(0.4);
  });

  it("cascade and separate meter coincide when solar power covers no heat-pump hour", () => {
    const e = basis({
      mitWp: { gridKwh: 6500, feedInKwh: 4800, wpLoadKwh: 4000, wpSelfCoveredKwh: 0 },
      ohneWp: { gridKwh: 2500, feedInKwh: 4800 },
    });
    const k = by(e);
    expect(k.kaskade.max).toBeCloseTo(k.getrennt.max, 6);
  });

  it("without a tariff advantage the shared meter always wins", () => {
    const r = empfiehlMesskonzept(basis({ wpTarif: 0.31 }), 20);
    expect(r.empfohlen).toBe("gemeinsam");
  });

  it("a costly conversion removes the advantage of a second meter", () => {
    const big = basis({ mitWp: { gridKwh: 9000, feedInKwh: 3000, wpLoadKwh: 8000, wpSelfCoveredKwh: 1000 } });
    expect(empfiehlMesskonzept(big, 20).empfohlen).toBe("kaskade");
    expect(empfiehlMesskonzept({ ...big, umbauKosten: 20000 }, 20).empfohlen).toBe("gemeinsam");
  });

  it("names both candidates when the grid area decides", () => {
    const r = empfiehlMesskonzept(basis(), 20);
    if (r.empfohlen === null) expect(r.kandidaten).toHaveLength(2);
    else expect(r.kandidaten).toEqual([r.empfohlen]);
  });

  it("the simulation supplies consistent totals for the comparison", () => {
    const household = { baseKwh: 3800, tagQuote: 0.3, eaActive: false, wpActive: true, wpAnnualKwh: 4000 };
    const mit = simulatePvYear({ kwp: 8, speicherKwh: 0, monthlyYieldPerKwp: null, ertragKwp: 950, household });
    const ohne = simulatePvYear({ kwp: 8, speicherKwh: 0, monthlyYieldPerKwp: null, ertragKwp: 950, household: { ...household, wpActive: false } });
    expect(mit.wpLoadKwh).toBeGreaterThan(3000);
    expect(mit.wpSelfCoveredKwh).toBeLessThan(mit.wpLoadKwh);
    // The heat pump uses solar power, so less is fed in with it than without it.
    expect(mit.feedInKwh).toBeLessThan(ohne.feedInKwh);
    expect(mit.gridKwh).toBeGreaterThan(ohne.gridKwh);
  });
});
