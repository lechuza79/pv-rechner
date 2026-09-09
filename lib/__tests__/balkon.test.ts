import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { calcBalkon, recommendBalkon } from "../balkon";
import { simulateSolarYear, monthlyFromAnnual } from "../balkon-sim";
import { FUNDING_PROGRAMS, fundingAmount } from "../funding-programs";
import { DEFAULT_BALKON_CONFIG as CFG, BALKON_RECHT } from "../balkon-config";
import { balkonFaq, balkonAnmeldenFaq } from "../faq";
import { SOLAR_YEAR_DE, referenceYearKwh } from "../solar-year";
import { DAYS_IN_MONTH, type HouseholdProfile } from "../consumption";

const base = {
  setId: "duo" as const,
  orientationId: "sued_gelaender" as const,
  presenceId: "teils" as const,
  haushaltKwh: 2800,
  specificYield: 950,
  stromPrice: 0.34,
};

describe("Referenz-Sonnenjahr (geteilte Basis)", () => {
  // Waechter fuer lib/solar-year.ts: Wird die Datei neu erzeugt, muessen Energie,
  // Spitze und Kalender stimmen — sonst kippt still das Clipping und damit die
  // Empfehlung, ohne dass ein anderer Test anschlaegt.
  const ORIENTATIONS = ["sued_flach", "sued_gelaender", "ost_west", "nord_schatten"];

  it("reproduces the PVGIS reference year for the optimal orientation", () => {
    expect(referenceYearKwh("sued_flach")).toBeGreaterThan(1000); // PVGIS 2023: 1013,3
    expect(referenceYearKwh("sued_flach")).toBeLessThan(1025);
  });

  it("keeps the midday peak (otherwise nothing would ever clip)", () => {
    const peak = Math.max(...SOLAR_YEAR_DE.sued_flach.flatMap(month => month.flatMap(t => t.w)));
    // Original-Spitze 885 W/kWp, durch die Mittelung im Sextil leicht gedaempft.
    // Faellt sie unter 800, clippt ein 1-kWp-Set gar nicht mehr → zu grob.
    expect(peak).toBeGreaterThan(800);
    expect(peak).toBeLessThanOrEqual(885);
  });

  it("ranks the orientations physically (south > vertical south > east/west > north)", () => {
    const rel = (o: string) => referenceYearKwh(o) / referenceYearKwh("sued_flach");
    expect(rel("sued_flach")).toBeCloseTo(1, 5);
    expect(rel("sued_gelaender")).toBeLessThan(rel("sued_flach"));
    expect(rel("ost_west")).toBeLessThan(rel("sued_gelaender"));
    expect(rel("nord_schatten")).toBeLessThan(rel("ost_west"));
    // Gemessene Werte (PVGIS): 0,69 / 0,51 / 0,20 — frueher geraten mit 0,72 /
    // 0,85 / 0,50, wobei Ost/West faelschlich ueber Sued-senkrecht lag.
    expect(rel("ost_west")).toBeLessThan(0.6);
    expect(rel("nord_schatten")).toBeLessThan(0.3);
  });

  it("covers every calendar day in every orientation", () => {
    for (const o of ORIENTATIONS) {
      SOLAR_YEAR_DE[o].forEach((month, m) => {
        expect(month.reduce((s, t) => s + t.days, 0)).toBe(DAYS_IN_MONTH[m]);
      });
    }
  });

  // ─── Externe Validierung: sind die Reihen noch PVGIS? ──────────────────────
  // Der Rest dieser Datei prueft nur Selbst-Konsistenz — das faengt einen
  // Vorzeichenfehler, aber keine falsch abgerufene Reihe. Diese Werte stammen
  // aus einer PVGIS-Direktabfrage (v5_2 PVcalc, lat 51.3 / lon 9.5, 1 kWp,
  // 14 % loss), also aus DERSELBEN Quelle, aus der die Reihen erzeugt wurden.
  // Toleranz 5 %: Unsere Reihen sind das reale Jahr 2023, PVcalc liefert das
  // Mittel 2005–2020 — ein kleiner Versatz ist erwartet, ein grosser heisst,
  // die Reihe wurde mit falschem Winkel/Azimut neu erzeugt.
  it("matches a direct PVGIS query per orientation (external reference)", () => {
    const PVGIS_DIRECT: Record<string, number> = {
      sued_flach: 995.7,      // angle 35, aspect 0
      sued_gelaender: 703.6,  // angle 90, aspect 0
      ost_west: 501.3,        // Mittel aus Ost (506,4) und West (496,1), beide angle 90
      nord_schatten: 194.2,   // angle 90, aspect 180
    };
    for (const [o, expected] of Object.entries(PVGIS_DIRECT)) {
      const dev = Math.abs(referenceYearKwh(o) - expected) / expected;
      expect(dev, `${o} weicht ${(dev * 100).toFixed(1)} % von PVGIS ab`).toBeLessThan(0.05);
    }
  });

  it("keeps east/west a single morning-peaked series (it is east, not a split array)", () => {
    // Die Reihe ist eine reine OST-Reihe: eine Spitze am Vormittag. Fruehere
    // Kommentare behaupteten "zwei flache Spitzen" (= geteilte Ost/West-Anlage),
    // was die Daten nie hergaben. Der Test nagelt die tatsaechliche Form fest,
    // damit Beschreibung und Daten nicht wieder auseinanderlaufen.
    const june = SOLAR_YEAR_DE.ost_west[5];
    const sunniest = june[june.length - 1];
    const peakHour = sunniest.w.indexOf(Math.max(...sunniest.w));
    expect(peakHour).toBeLessThan(10);
    // Nachmittags (ab 14 h) faellt sie klar ab — kein zweiter West-Buckel.
    const afternoon = Math.max(...sunniest.w.slice(14));
    expect(afternoon).toBeLessThan(Math.max(...sunniest.w) * 0.3);
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
    // 500 Wp senkrecht erreichen nie die 600-W-Grenze des kleinen Wechselrichters:
    // die Spitze der Suedsenkrecht-Reihe liegt bei ~810 W/kWp, also ~405 W.
    const r = calcBalkon({ ...base, setId: "single", orientationId: "sued_gelaender" });
    expect(r.clipped).toBe(false);
    // Ohne Clipping muss der Ertrag exakt der Referenzreihe entsprechen, skaliert
    // auf den Standort — keine feste Zahl, damit der Test nicht an einer
    // Kalibrierung klebt.
    const expected = 0.5 * referenceYearKwh("sued_gelaender") * (base.specificYield / referenceYearKwh("sued_flach"));
    expect(r.annualYield).toBeCloseTo(expected, 0);
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

// Realitaets-Anker fuer den Speicher-Wirkungsgrad (Waechter-Gate, Regel 7).
// Er ist die Stellschraube, an der die Speicher-Empfehlung haengt, und war bis
// 07/2026 eine Herstellerangabe (0,90) — ueber dem Bestpunkt des besten je
// gemessenen Geraets. Aufgeloest per Council (3/3, adversarialer Pruefer
// eingeschlossen) gegen die HTW-Dokumentation; Herleitung im Kommentar in
// balkon-config.ts, Primaerquelle in docs/quellen/.
describe("Speicher-Wirkungsgrad: Realitaets-Anker", () => {
  // HTW Berlin, Stecker-Solar-Simulator, Dokumentation der Berechnungsgrundlagen
  // V3.0, Kap. 4.2 — woertlich am PDF geprueft (docs/quellen/):
  // "ein mittlerer Umwandlungswirkungsgrad im Lade- bzw. Entladebetrieb von
  //  91,7 % bzw. 92 % ..., der Batteriewirkungsgrad betraegt 97,8 %."
  const HTW_LADEN = 0.917, HTW_ENTLADEN = 0.920, HTW_BATTERIE = 0.978;

  it("entspricht der HTW-Wirkungsgradkette fuer diese Geraeteklasse", () => {
    const kette = HTW_LADEN * HTW_ENTLADEN * HTW_BATTERIE; // = 0,82508
    expect(CFG.storageRoundtrip,
      "Wirkungsgrad weicht von der HTW-Kette ab — neue Quelle? Dann Wert, Kommentar und diesen Test gemeinsam nachziehen (scripts/balkon-verify.md)")
      .toBeCloseTo(kette, 3);
  });

  it("bleibt unter dem besten je gemessenen Geraet (89,7 % bei Volllast)", () => {
    // Der HTW-Wert ist bereits eine Obergrenze: Standby- und Regelungsverluste
    // sind laut derselben Quelle ausdruecklich NICHT abgebildet. Ein Jahreswert
    // darf deshalb nie an den Bestpunkt eines Einzelgeraets heranreichen — im
    // Jahresbetrieb dominiert die Grundlast, dort messen dieselben Geraete
    // 71,6–79,5 %. Schlaegt das an, wurde ein Datenblatt abgeschrieben.
    expect(CFG.storageRoundtrip).toBeLessThan(0.897);
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
    for (const presenceId of ["weg", "teils", "home", "immer"] as const) {
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

// ─── Energieerhaltung der geteilten Stunden-Jahressimulation ────────────────
// simulateSolarYear ist der Kern für ALLE Rechner (Balkon + Dach-PV). Diese
// Invarianten stellen sicher, dass in der Dispatch-Schleife keine Energie
// erfunden oder verschluckt wird — egal wie die Speicher-/Clipping-Pfade
// später umgebaut werden.
describe("simulateSolarYear — Energieerhaltung", () => {
  const hh: HouseholdProfile = { baseKwh: 3800, tagQuote: 0.30, wpActive: false, eaActive: false };
  const baseInput = {
    moduleKwp: 8,
    inverterKw: 8,
    monthlyYieldPerKwp: monthlyFromAnnual(950),
    orientation: "sued_flach",
    household: hh,
    batteryKwh: 8,
    roundtrip: 0.9,
  };

  it("Produktions-Bilanz: rawYield = annualYield + clippedKwh", () => {
    const r = simulateSolarYear(baseInput);
    expect(Math.abs(r.rawYield - (r.annualYield + r.clippedKwh))).toBeLessThanOrEqual(2);
  });

  it("Monatssummen decken sich mit den Jahressummen (±Monatsrundung)", () => {
    const r = simulateSolarYear(baseInput);
    const prod = r.monthly.reduce((s, m) => s + m.production, 0);
    const cons = r.monthly.reduce((s, m) => s + m.consumption, 0);
    expect(Math.abs(prod - r.annualYield)).toBeLessThanOrEqual(6);   // 12 × ±0,5 kWh
    expect(Math.abs(cons - r.consumptionKwh)).toBeLessThanOrEqual(6);
  });

  it("jeder Monat: production = direct + stored + feedIn UND consumption = selfUsed + gridDraw", () => {
    const r = simulateSolarYear(baseInput);
    for (const m of r.monthly) {
      expect(Math.abs(m.production - (m.direct + m.stored + m.feedIn))).toBeLessThanOrEqual(2);
      expect(Math.abs(m.consumption - (m.selfUsed + m.gridDraw))).toBeLessThanOrEqual(1);
    }
  });

  it("Speicher schafft keine Energie: Entlade-Beitrag ≤ Geladenes × Wirkungsgrad", () => {
    const r = simulateSolarYear(baseInput);
    const discharged = r.selfUsedKwh - r.directUsedKwh;
    const stored = r.monthly.reduce((s, m) => s + m.stored, 0);
    expect(discharged).toBeGreaterThan(0); // der Speicher trägt tatsächlich bei
    expect(discharged).toBeLessThanOrEqual(stored * baseInput.roundtrip + 7); // +Monatsrundung
  });

  it("ohne Speicher: selfUsed = directUsed exakt, kein stored", () => {
    const r = simulateSolarYear({ ...baseInput, batteryKwh: 0 });
    expect(r.selfUsedKwh).toBe(r.directUsedKwh);
    expect(r.monthly.every(m => m.stored === 0)).toBe(true);
  });

  it("Eigennutzung überschreitet weder Verbrauch noch Ertrag", () => {
    const r = simulateSolarYear(baseInput);
    expect(r.selfUsedKwh).toBeLessThanOrEqual(r.consumptionKwh);
    expect(r.selfUsedKwh).toBeLessThanOrEqual(r.annualYield);
  });

  it("WP-Zuteilung bleibt innerhalb der Bilanz (wpSelfCovered ≤ selfUsed, wpLoad ≤ Verbrauch)", () => {
    const wpHh: HouseholdProfile = { ...hh, wpActive: true, wpAnnualKwh: 5000 };
    const r = simulateSolarYear({ ...baseInput, household: wpHh });
    expect(r.wpLoadKwh).toBeGreaterThan(0);
    expect(r.wpLoadKwh).toBeLessThanOrEqual(r.consumptionKwh + 1);
    expect(r.wpSelfCoveredKwh).toBeGreaterThan(0);
    expect(r.wpSelfCoveredKwh).toBeLessThanOrEqual(r.selfUsedKwh + 1);
  });
});

// ─── Rechtssätze: EINE Quelle für Tool und FAQ ──────────────────────────────
// Die Aussagen zu Anmeldung, Miete und fehlender Vergütung erscheinen an drei
// Stellen (Rechner-Ergebnis, Textabschnitte der Seite, FAQ + FAQPage-JSON-LD).
// Sie stehen deshalb in BALKON_RECHT. Dieser Test schlägt an, sobald eine
// Oberfläche wieder eine handgetippte Zweitkopie bekommt — die Fehlerklasse aus
// CLAUDE.md, Faktenprüfung Regel 11.
describe("Rechtssätze", () => {
  it("das FAQ zitiert die geteilten Sätze wörtlich, statt sie zu wiederholen", () => {
    const faq = balkonFaq();
    const antworten = faq.map(e => e.a).join("\n");
    expect(antworten).toContain(BALKON_RECHT.anmeldung);
    expect(antworten).toContain(BALKON_RECHT.mieteEigentum);
    expect(antworten).toContain(BALKON_RECHT.keineVerguetung);
  });

  it("der Unterschied Gesetz / freiwillige Vornorm bleibt im Modul-Satz stehen", () => {
    // Die 2.000-Wp-Grenze ist Gesetz, die Schuko-Grenze der VDE-Vornorm nicht.
    // Wer den Satz kürzt, macht aus einer freiwilligen Produktnorm eine Pflicht.
    const modulFrage = balkonFaq().find(e => e.q.includes("Module darf"))!;
    expect(modulFrage.a).toContain("freiwillig");
    expect(modulFrage.a).toContain("kein Gesetz");
  });

  it("keine getippten Euro-Beträge im FAQ — alle Zahlen kommen aus dem Modell", () => {
    // Realitäts-Anker: Die Beispielzahlen müssen mit dem übereinstimmen, was der
    // Rechner für denselben Fall ausgibt. Driftet die Config, driftet das FAQ mit.
    const referenz = calcBalkon({
      setId: "duo", orientationId: "sued_gelaender", presenceId: "teils",
      storageId: "none", haushaltKwh: 2800, specificYield: CFG.specificYield,
      monthlyYield: null, stromPrice: CFG.stromPrice,
    });
    const lohntSich = balkonFaq().find(e => e.q === "Lohnt sich ein Balkonkraftwerk?")!;
    expect(lohntSich.a).toContain(referenz.savingPerYear.toLocaleString("de-DE"));
    expect(lohntSich.a).toContain(CFG.sets.find(s => s.id === "duo")!.price.toLocaleString("de-DE"));
  });
});

// Die beiden geprüften Rechtsaussagen tragen je einen Vorbehalt, der sie erst
// richtig macht. Beide Vorbehalte sind schon einmal beim Kürzen verlorengegangen
// bzw. standen kurz davor — deshalb hier festgenagelt.
describe("Geprüfte Rechtsaussagen: die Vorbehalte", () => {
  it("Nullsteuersatz: die 5-kWh-Schwelle steht drin, aber nicht als Ausschluss", () => {
    // Der Satz kann in ZWEI Richtungen falsch werden, deshalb zwei Prüfungen.
    // Zu lasch: die Schwelle fällt weg, dann liest sich der Speicher als
    // bedingungslos steuerfrei.
    expect(BALKON_RECHT.nullsteuer).toContain("5 kWh");
    // Zu streng: aus der Vermutungsregel wird ein Ausschluss. UStAE 12.18
    // Abs. 7 S. 9 begünstigt auch kleinere Speicher, sobald die Zweckbestimmung
    // feststeht. Die 19 % dürfen deshalb nur als HÄNDLERPRAXIS auftauchen,
    // nie als Rechtsfolge — die Reihenfolge im Satz trägt genau das.
    expect(BALKON_RECHT.nullsteuer).toMatch(/nicht ausgeschlossen/);
    expect(BALKON_RECHT.nullsteuer).toMatch(/in der Praxis/);
    // „Steuerfrei" ist der falsche Rechtsbegriff — es ist ein Nullsteuersatz.
    expect(BALKON_RECHT.nullsteuer).not.toMatch(/steuerfrei|steuerbefreit/);
    // Alle Balkonspeicher liegen unter der Vermutungsgrenze — fiele das je weg,
    // wäre der Halbsatz gegenstandslos und der Satz müsste neu gefasst werden.
    expect(CFG.storage.every(s => s.kwh < 5)).toBe(true);
  });

  it("Anmeldung: Frist ja, aber kein 50.000-Euro-Drohsatz", () => {
    // § 5 Abs. 1 MaStRV: ein Monat. § 21 Nr. 1 MaStRV verweist auf § 95 Abs. 1
    // Nr. 5 Buchst. e EnWG zurück — deshalb "Ordnungswidrigkeit" belegbar.
    expect(BALKON_RECHT.anmeldeFrist).toMatch(/eine[nm]? Monat/);
    // "grundsätzlich ordnungswidrig" statt einer Automatik — § 21 MaStRV
    // verlangt Vorsatz oder Fahrlässigkeit (Council-Einwand 16.08.2026).
    expect(BALKON_RECHT.anmeldeFrist).toMatch(/grundsätzlich ordnungswidrig/);
    // Inbetriebnahme ist der erste Tag der Stromerzeugung, nicht der Kauf.
    expect(BALKON_RECHT.anmeldeFrist).toMatch(/nicht ab Kauf/);
    // Der gesetzliche Höchstrahmen gilt für alle Verstöße dieser Nummer und ist
    // als Drohung gegenüber einem Balkon-Betreiber irreführend (§ 17 OWiG).
    //
    // Die Regel galt bis zum 25.08.2026 nur für DIESE eine FAQ — und deshalb
    // stand die Zahl weiter im Anmelde-Ratgeber und in dessen eigener FAQ, also
    // ausgerechnet auf der Seite, auf der jemand landet, der Angst vor
    // Konsequenzen hat. Dort war sie sauber eingeordnet; als abgeschnittener
    // Suchergebnis-Ausschnitt überlebt aber nur der Drohsatz, und genau den
    // vermeidet das Projekt bewusst. Betreiber-Entscheidung: Regel ausweiten.
    //
    // Geprüft ist die Zahl übrigens und richtig (§ 95 Abs. 2 Nr. 6 EnWG,
    // Halbierung nach § 17 Abs. 2 OWiG, beides im Volltext gelesen) — sie wird
    // nicht als falsch verschwiegen, sondern als irreführend weggelassen.
    const antworten = [
      ...balkonFaq(),
      ...balkonAnmeldenFaq(),
    ].map(e => e.a).join(" ");
    expect(
      antworten,
      "Keine Balkon-Antwort nennt den Bußgeld-Höchstrahmen als Zahl.",
    ).not.toMatch(/50\.?000/);

    // Und ebenso wenig die Ratgeber-Seite, auf die sie verlinken.
    const seite = readFileSync(
      join(__dirname, "..", "..", "app", "(site)", "balkonkraftwerk", "ratgeber", "anmelden", "page.tsx"),
      "utf8",
    );
    expect(
      seite.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""),
      "Der Anmelde-Ratgeber nennt den Bußgeld-Höchstrahmen als Zahl.",
    ).not.toMatch(/50\.?000/);
  });
});

describe("Wohnform: wer zur Miete wohnt, bekommt eine andere Förderung", () => {
  const mv = FUNDING_PROGRAMS["mv-mini-solaranlagen"];

  it("zahlt dem Mieter, aber nicht dem Eigentümer", () => {
    const anlage = (wohnform: "mieter" | "eigentuemer") =>
      ({ technik: "balkon", wattPeak: 960, kosten: 500, wohnform }) as const;
    expect(fundingAmount(mv, anlage("mieter")).total).toBe(500);
    expect(fundingAmount(mv, anlage("eigentuemer")).computable).toBe(false);
  });

  it("rechnet gar nicht, solange die Wohnform unbekannt ist", () => {
    // Raten wäre hier die schlechteste Möglichkeit: Der eine Topf ist leer, der
    // andere nicht — eine Voreinstellung würde die Hälfte der Nutzer belügen.
    const a = { technik: "balkon", wattPeak: 960, kosten: 500 } as const;
    expect(fundingAmount(mv, a).computable).toBe(false);
  });

  it("lässt Programme ohne Einschränkung unberührt", () => {
    // Die Einschränkung ist die Ausnahme. Ein Programm ohne Angabe darf durch
    // die neue Dimension nichts verlieren — sonst hätte sie 40 Programme still
    // abgeschaltet.
    const ohne = Object.values(FUNDING_PROGRAMS).filter(
      (p) => !p.nurWohnform && (p.foerdert ?? ["pv"]).includes("balkon") && p.balkonPauschale,
    );
    expect(ohne.length).toBeGreaterThan(5);
    for (const p of ohne) {
      const a = { technik: "balkon", wattPeak: 960, kosten: 800 } as const;
      expect(fundingAmount(p, a).computable, p.id).toBe(true);
    }
  });
});
