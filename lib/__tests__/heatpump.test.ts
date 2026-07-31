import { describe, it, expect } from "vitest";
import {
  calcHeatDemand,
  calcHeatLoad,
  auslegungsleistung,
  flowTempForSystem,
  calcJAZ,
  calcInvestBrutto,
  calcBegSubsidy,
  calcHeatPump,
  calcHeatPumpScenarios,
  estimatePvCoverageOfWp,
  calcWpAnnualElectricity,
  type HeatPumpInputs,
} from "../heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "../heatpump-config";
import { INSULATION_BESTAND, INSULATION_NEUBAU, WP_FUEL_OPTIONS } from "../constants";
import { verbrauchAusBedarf } from "../heat-consumption";
import { verbrauchSpecKwh } from "../heatpump-core";

// Canonical test case: 130 m² Bestand, halbsaniert, 2 Personen, alte Heizkörper, LWWP, no PV
const baseInputs: HeatPumpInputs = {
  situation: "bestand",
  wohnflaeche: 130,
  insulationIdx: 1,         // teilsaniert → 160 kWh/m²·a
  personen: 3.5,
  heizsystem: "hk_alt",
  wpType: "lwwp",
};

// ─── Heat demand (Wohnfläche × spezifischer Bedarf + Warmwasser) ────────────
describe("calcHeatDemand", () => {
  it("rechnet den Bestand mit dem VERBRAUCH, nicht mit dem Norm-Bedarf", () => {
    // 130 m², teilsaniert. Der Norm-Bedarf der Stufe ist 160 kWh/m²·a; für die
    // Betriebskosten zählt der erwartete reale Verbrauch (Prebound, siehe
    // lib/heat-consumption.ts) — hier ~130 kWh/m²·a.
    const r = calcHeatDemand("bestand", 130, 1, 3.5);
    const spec = verbrauchSpecKwh("bestand", 1);
    expect(spec).toBeLessThan(INSULATION_BESTAND[1].specKwh);   // korrigiert
    expect(r.qHeiz).toBe(Math.round(130 * verbrauchAusBedarf(160)));
    expect(r.qWw).toBe(2275);      // 3.5 × 650 — Warmwasser bleibt unkorrigiert
    expect(r.qGes).toBe(r.qHeiz + 2275);
  });

  it("lässt eine bereits GEMESSENE Stufe unangetastet (keine Doppelkorrektur)", () => {
    // „Vollsaniert" trägt einen gemessenen Verbrauchswert, keinen Normbedarf.
    // Ein zweites Mal zu korrigieren würde ihn unter jedes reale Gebäude drücken.
    const voll = INSULATION_BESTAND.length - 1;
    expect(INSULATION_BESTAND[voll].art).toBe("verbrauch");
    expect(verbrauchSpecKwh("bestand", voll)).toBe(INSULATION_BESTAND[voll].specKwh);
  });

  it("uses Neubau coefficients when situation is neubau", () => {
    // Neubau: KEINE Bedarf→Verbrauch-Korrektur. Dort verbrauchen Gebäude eher mehr
    // als berechnet, nach unten zu korrigieren wäre die falsche Richtung
    // (FHNW PRO380 S. 17, Volltext in docs/quellen/).
    const r = calcHeatDemand("neubau", 150, 0, 4); // EnEV 2014
    expect(r.qHeiz).toBe(150 * 75);
    expect(r.qGes).toBe(150 * 75 + 4 * 650);
  });

  it("clamps insulation index to valid range", () => {
    // Bewusst an der LÄNGE der Skala festgemacht, nicht an einer festen Stufennummer:
    // Als die vierte Stufe („vollsaniert") dazukam, hätte ein hartes `2` hier still
    // etwas anderes geprüft als das Clamping auf die beste Stufe.
    const lastIdx = INSULATION_BESTAND.length - 1;
    const high = calcHeatDemand("bestand", 100, 99, 1);  // out-of-range high
    const lastValid = calcHeatDemand("bestand", 100, lastIdx, 1); // beste Stufe
    expect(high.qHeiz).toBe(lastValid.qHeiz);

    const low = calcHeatDemand("bestand", 100, -5, 1);
    const firstValid = calcHeatDemand("bestand", 100, 0, 1); // unsaniert
    expect(low.qHeiz).toBe(firstValid.qHeiz);
  });
});

// ─── Heat load (W/m² × Fläche × Haustyp, für Anlagengröße) ─────────────────
describe("calcHeatLoad", () => {
  it("sinkt mit besserer Dämmung", () => {
    const unsaniert = calcHeatLoad("bestand", 150, 0, 1);
    const saniert = calcHeatLoad("bestand", 150, 2, 1);
    expect(unsaniert).toBeGreaterThan(saniert);
  });

  it("Haustyp senkt die Heizlast (Reihenmitte < Reihenend < frei)", () => {
    const frei = calcHeatLoad("bestand", 150, 0, 1.0);
    const reihenend = calcHeatLoad("bestand", 150, 0, 0.88);
    const reihenmitte = calcHeatLoad("bestand", 150, 0, 0.78);
    expect(reihenend).toBeLessThan(frei);
    expect(reihenmitte).toBeLessThan(reihenend);
  });

  it("nicht mehr aus dem Jahresbedarf ÷ 2000 (Regression: WW zählte mit)", () => {
    // 150 m² unsaniert freistehend: Norm-Heizlast ~17 kW (150 × 115 W/m²),
    // nicht 18+ aus der alten Formel qGes/2000, die das Warmwasser mitzählte.
    const hl = calcHeatLoad("bestand", 150, 0, 1);
    expect(hl).toBeLessThan(19);
    expect(hl).toBeGreaterThan(15);
  });

  it("Heizlast und Auslegungsleistung sind zwei verschiedene Größen", () => {
    // Die Norm-Heizlast beschreibt das GEBÄUDE, die Auslegung die ANLAGE (rund 85 %,
    // den Rest deckt der Heizstab). Bis 28.07.2026 lieferte calcHeatLoad die
    // Auslegung, hieß aber „Heizlast" — wer seine echte DIN-Heizlast eintrug, bekam
    // dadurch eine 18 % zu große und zu teure Anlage gerechnet.
    const norm = calcHeatLoad("bestand", 150, 0, 1);
    const auslegung = auslegungsleistung(norm);
    expect(auslegung).toBeLessThan(norm);
    expect(auslegung).toBeCloseTo(norm * DEFAULT_HEATPUMP_CONFIG.auslegungsfaktor, 0);
  });

  it("egal ob geschätzt oder eingetragen — der Auslegungsfaktor wirkt gleich", () => {
    // Der eigentliche Fix: derselbe Weg für beide Quellen der Heizlast.
    const base = { situation: "bestand" as const, wohnflaeche: 150, insulationIdx: 0, personen: 2,
      heizsystem: "hk_neu" as const, wpType: "lwwp" as const };
    const geschaetzt = calcHeatPump(base);
    const eingetragen = calcHeatPump({ ...base, override: { heizlast: geschaetzt.heizlastKw } });
    expect(eingetragen.auslegungKw).toBe(geschaetzt.auslegungKw);
    expect(eingetragen.investBrutto).toBe(geschaetzt.investBrutto);
  });

  it("die Anlage wird nie kleiner als 4 kW ausgelegt", () => {
    expect(auslegungsleistung(1)).toBe(4);
    expect(auslegungsleistung(0)).toBe(4);
    expect(auslegungsleistung(-5)).toBe(4);   // geteilte Funktion: gegen Unsinn absichern
  });
});

describe("calcHeatPump heat load override", () => {
  it("override.heizlast schlägt die Schätzung (DIN-Berechnung)", () => {
    const base = { situation: "bestand" as const, wohnflaeche: 150, insulationIdx: 0, personen: 3.5, heizsystem: "hk_alt" as const, wpType: "lwwp" as const, haustypFaktor: 0.88 };
    const geschaetzt = calcHeatPump(base);
    const gemessen = calcHeatPump({ ...base, override: { heizlast: 7.5 } });
    expect(gemessen.heizlastKw).toBe(7.5);
    expect(gemessen.investBrutto).toBeLessThan(geschaetzt.investBrutto);
  });
});

// ─── Flow temperature by heating system ────────────────────────────────────
describe("flowTempForSystem", () => {
  it("FBH < HK_neu < HK_alt", () => {
    expect(flowTempForSystem("fbh")).toBe(35);
    expect(flowTempForSystem("hk_neu")).toBe(45);
    expect(flowTempForSystem("hk_alt")).toBe(55);
  });
});

// ─── JAZ (linear in flow temp, clamped to plausible range) ─────────────────
describe("calcJAZ", () => {
  it("LWWP at 35°C (FBH): JAZ = 5.5 - 0.05 × 35 = 3.75", () => {
    expect(calcJAZ("lwwp", 35)).toBeCloseTo(3.75, 2);
  });

  it("LWWP at 55°C (old radiators): JAZ degraded to ~2.75", () => {
    expect(calcJAZ("lwwp", 55)).toBeCloseTo(2.75, 2);
  });

  it("SWWP outperforms LWWP at the same flow temp", () => {
    expect(calcJAZ("swwp", 35)).toBeGreaterThan(calcJAZ("lwwp", 35));
  });

  it("clamps to [2.2, 4.8] regardless of flow temp", () => {
    expect(calcJAZ("lwwp", 100)).toBeGreaterThanOrEqual(2.2);
    expect(calcJAZ("swwp", 0)).toBeLessThanOrEqual(4.8);
  });
});

// ─── Investment (base + perKw × heat load + radiator swap) ─────────────────
describe("calcInvestBrutto", () => {
  it("LWWP for 8 kW load = base + perKw × 8 (from config, not hardcoded)", () => {
    const r = calcInvestBrutto("lwwp", 8, false);
    // Config-derived, damit eine gepflegte Marktanpassung den Test nicht bricht.
    expect(r).toBe(DEFAULT_HEATPUMP_CONFIG.investLwwpBase + DEFAULT_HEATPUMP_CONFIG.investLwwpPerKw * 8);
  });

  it("SWWP costs more than LWWP at the same load (drilling/probes)", () => {
    expect(calcInvestBrutto("swwp", 8, false)).toBeGreaterThan(calcInvestBrutto("lwwp", 8, false));
  });

  it("adds the radiator swap cost when the measure is chosen", () => {
    const withSwap = calcInvestBrutto("lwwp", 8, true);
    const withoutSwap = calcInvestBrutto("lwwp", 8, false);
    expect(withSwap - withoutSwap).toBe(DEFAULT_HEATPUMP_CONFIG.heizkoerperTauschKosten);
  });

  // ── Marktanker (BLOCKER: Zahlen-Korrektheit) ──────────────────────────────
  // Quelle: Verbraucherzentrale Rheinland-Pfalz, Auswertung von 160 Angeboten für
  // Luft-Wasser-Wärmepumpen (Angebote 10/2024–05/2025, Bruttopreise inkl. MwSt.;
  // Volltext in docs/quellen/). Gesamtkosten Median 34.979 €, Mittelwert 36.279 €,
  // Minimum 20.228 €; angebotene Leistungen 4–18 kW, Median 10 kW.
  // Diese Tests halten das Preisniveau am Markt fest — sie schlagen an, wenn eine
  // künftige Anpassung den Rechner wieder unter reale Angebote schiebt (2026-07:
  // eine gescrapte Portal-Kostenseite ergab 15.020 € für ein kleines Haus, also
  // WENIGER als das günstigste von 160 echten Angeboten).
  describe("Marktanker gegen echte Angebote (VZ RLP, 160 Angebote)", () => {
    it("trifft im Median-Fall (10 kW) den Median der realen Angebote (±10 %)", () => {
      const r = calcInvestBrutto("lwwp", 10, false);
      expect(r).toBeGreaterThan(34979 * 0.9);
      expect(r).toBeLessThan(34979 * 1.1);
    });

    it("bleibt über dem günstigsten realen Angebot — auch bei der kleinsten Anlage", () => {
      // 4 kW ist die untere Grenze sowohl der Auswertung als auch unserer Auslegung.
      expect(calcInvestBrutto("lwwp", 4, false)).toBeGreaterThan(20228);
    });

    it("bleibt bei der größten Anlage (18 kW) unter dem teuersten realen Angebot", () => {
      expect(calcInvestBrutto("lwwp", 18, false)).toBeLessThan(63061);
    });
  });

  it("no swap cost by default (old radiators stay in place)", () => {
    const noSwap = calcInvestBrutto("lwwp", 8, false);
    const base = calcInvestBrutto("lwwp", 8, false);
    expect(noSwap).toBe(base);
  });
});

// ─── BEG funding (Bestand only; KfW 458 ab 21.07.2026: Klima 16 %, Einkommen 40/30/10 %, Deckel 70/80 % · 28.000 €) ──
describe("calcBegSubsidy", () => {
  it("returns 0 % for Neubau (no funding eligible)", () => {
    const r = calcBegSubsidy("neubau", "lwwp", 28000);
    expect(r.rate).toBe(0);
    expect(r.amount).toBe(0);
  });

  it("Bestand default (nur Klima-Bonus, kein Einkommen): 30 + 16 = 46 %", () => {
    const r = calcBegSubsidy("bestand", "lwwp", 28000);
    expect(r.rate).toBeCloseTo(0.46, 2);
    expect(r.amount).toBe(Math.round(28000 * 0.46));
  });

  it("only Grundförderung when Klima off, no income (30 %)", () => {
    const r = calcBegSubsidy("bestand", "lwwp", 28000, { klimaBonus: false });
    expect(r.rate).toBeCloseTo(0.30, 2);
    expect(r.breakdown).toHaveLength(1);
  });

  it("Einkommens-Bonus staffelt 40/30/10 % nach Haushaltseinkommen", () => {
    const rate = (income: number) => calcBegSubsidy("bestand", "lwwp", 28000, { klimaBonus: false, haushaltseinkommen: income }).rate;
    expect(rate(28000)).toBeCloseTo(0.70, 2); // 30 + 40
    expect(rate(38000)).toBeCloseTo(0.60, 2); // 30 + 30
    expect(rate(48000)).toBeCloseTo(0.40, 2); // 30 + 10
    expect(rate(60000)).toBeCloseTo(0.30, 2); // über 50k → kein Bonus
  });

  it("niedrigstes Einkommen hebt den Deckel auf 80 % (statt 70 %)", () => {
    // 30 + 16 + 40 = 86 → für ≤ 30.000 € gilt 80 %
    const r = calcBegSubsidy("bestand", "lwwp", 28000, { klimaBonus: true, haushaltseinkommen: 30000 });
    expect(r.rate).toBe(0.80);
    expect(r.amount).toBe(Math.round(28000 * 0.80));
  });

  it("mittleres Einkommen bleibt beim Regeldeckel 70 %", () => {
    // 30 + 16 + 30 = 76 → auf 70 % gedeckelt
    const r = calcBegSubsidy("bestand", "lwwp", 28000, { klimaBonus: true, haushaltseinkommen: 40000 });
    expect(r.rate).toBe(0.70);
  });

  it("Familienzuschlag hebt die Einkommensgrenze um 10.000 €", () => {
    const ohne = calcBegSubsidy("bestand", "lwwp", 28000, { klimaBonus: false, haushaltseinkommen: 48000 });
    const mit  = calcBegSubsidy("bestand", "lwwp", 28000, { klimaBonus: false, haushaltseinkommen: 48000, kindImHaushalt: true });
    expect(ohne.rate).toBeCloseTo(0.40, 2); // 48k → 10 %-Stufe: 30 + 10
    expect(mit.rate).toBeCloseTo(0.60, 2);  // 48k − 10k = 38k → 30 %-Stufe: 30 + 30
  });

  it("Förderbetrag bounded by 28.000 € förderfähige Kosten", () => {
    const small = calcBegSubsidy("bestand", "lwwp", 20000);   // 46 % von 20k
    const large = calcBegSubsidy("bestand", "lwwp", 100000);  // 46 % von gedeckelten 28k
    expect(small.amount).toBe(Math.round(20000 * 0.46)); // 9.200
    expect(large.amount).toBe(Math.round(28000 * 0.46)); // 12.880
  });
});

// ─── Full TCO calculation ──────────────────────────────────────────────────
describe("calcHeatPump (full TCO)", () => {
  it("returns 21 chart data points (year 0 plus 20 years)", () => {
    const r = calcHeatPump(baseInputs);
    expect(r.years.length).toBe(21);
  });

  it("year 0 starts at -mehrInvest (Mehrkosten gegenüber der fossilen Anschaffung)", () => {
    const r = calcHeatPump(baseInputs);
    expect(r.years[0].i).toBe(0);
    expect(r.years[0].kum).toBeLessThanOrEqual(0);
    // Startpunkt ist die MEHR-Investition: Wer die Wärmepumpe kauft, spart sich die
    // neue fossile Heizung. Seit 28.07.2026 gilt das auch im Bestand — die Alternative
    // zur Wärmepumpe ist über 20 Jahre keine unsterbliche Altanlage, sondern ein
    // Ersatzkessel (derselbe Neueinbau, der die Bio-Treppe auslöst).
    expect(r.years[0].kum).toBe(-(r.investNetto - r.gasInvest));
  });

  it("eWp = qGes / jaz (energy balance holds)", () => {
    const r = calcHeatPump(baseInputs);
    expect(r.eWp).toBe(Math.round(r.qGes / r.jaz));
  });

  it("BEG subsidy reduces investNetto vs investBrutto for Bestand", () => {
    const r = calcHeatPump(baseInputs);
    expect(r.investNetto).toBeLessThan(r.investBrutto);
    expect(r.investNetto).toBe(r.investBrutto - r.beg.amount);
  });

  it("Neubau gets no BEG funding (investNetto = investBrutto)", () => {
    const r = calcHeatPump({ ...baseInputs, situation: "neubau", insulationIdx: 0 });
    expect(r.beg.rate).toBe(0);
    expect(r.investNetto).toBe(r.investBrutto);
  });

  it("die fossile Alternative kostet auch im Bestand eine Anschaffung", () => {
    // Bis 28.07.2026 war das im Bestand 0 — zusammen mit der Grüngas-Pflicht ergab
    // das zwei Hälften verschiedener Fälle: Wir rechneten die Beimischungspflicht
    // (die nur für NEU eingebaute Heizungen gilt, § 43 Abs. 1 GModG), ließen aber
    // den Neueinbau selbst kostenlos. Jetzt gehört beides zusammen.
    const bestand = calcHeatPump(baseInputs);
    const neubau = calcHeatPump({ ...baseInputs, situation: "neubau", insulationIdx: 0 });
    expect(bestand.gasInvest).toBeGreaterThan(0);
    expect(neubau.gasInvest).toBeGreaterThan(0);
  });

  it("wer eine junge Heizung hat, setzt die Anschaffung auf 0", () => {
    // Der Ersatzfall ist der Regelfall, nicht das Gesetz: Eine fünf Jahre alte
    // Heizung hält die 20 Jahre durch — dann ist die Referenz wirklich der
    // Weiterbetrieb, und die Wärmepumpe muss ohne diesen Vorteil auskommen.
    const mitErsatz = calcHeatPump(baseInputs);
    const ohneErsatz = calcHeatPump({ ...baseInputs, override: { ...baseInputs.override, fossilErsatzInvest: 0 } });
    expect(ohneErsatz.gasInvest).toBe(0);
    expect(ohneErsatz.tcoEinsparung).toBeLessThan(mitErsatz.tcoEinsparung);
  });

  it("CO2 savings positive (WP cleaner than gas over 20 years)", () => {
    const r = calcHeatPump(baseInputs);
    expect(r.co2Einsparung).toBeGreaterThan(0);
  });

  it("FBH (35°C flow) yields better JAZ than HK_alt (55°C flow)", () => {
    const fbh = calcHeatPump({ ...baseInputs, heizsystem: "fbh" });
    const hkAlt = calcHeatPump({ ...baseInputs, heizsystem: "hk_alt" });
    expect(fbh.jaz).toBeGreaterThan(hkAlt.jaz);
    expect(fbh.eWp).toBeLessThan(hkAlt.eWp);  // higher JAZ → less electricity
  });

  it("old radiators alone add NO swap cost (Ist-Zustand, not the swap)", () => {
    // Regression: früher zahlte man 6.000 € Tausch ohne JAZ-Nutzen.
    const hkAlt = calcHeatPump({ ...baseInputs, heizsystem: "hk_alt" });
    const hkNeu = calcHeatPump({ ...baseInputs, heizsystem: "hk_neu" });
    expect(hkAlt.investBrutto).toBe(hkNeu.investBrutto);
  });

  it("radiator swap measure: raises JAZ, adds cost, improves 20y balance", () => {
    const ist = calcHeatPump({ ...baseInputs, heizsystem: "hk_alt", heizkoerperTausch: false });
    const mit = calcHeatPump({ ...baseInputs, heizsystem: "hk_alt", heizkoerperTausch: true });
    expect(mit.jaz).toBeGreaterThan(ist.jaz);                       // 55°C → 45°C
    expect(mit.investBrutto).toBe(ist.investBrutto + DEFAULT_HEATPUMP_CONFIG.heizkoerperTauschKosten);  // Tauschkosten
    expect(mit.eWp).toBeLessThan(ist.eWp);                          // weniger Strom
    expect(mit.tcoEinsparung).toBeGreaterThan(ist.tcoEinsparung);   // besseres Ergebnis
  });

  it("swap flag is a no-op for FBH/modern radiators (only hk_alt)", () => {
    const fbh = calcHeatPump({ ...baseInputs, heizsystem: "fbh", heizkoerperTausch: false });
    const fbhSwap = calcHeatPump({ ...baseInputs, heizsystem: "fbh", heizkoerperTausch: true });
    expect(fbhSwap.investBrutto).toBe(fbh.investBrutto);
    expect(fbhSwap.jaz).toBe(fbh.jaz);
  });

  it("override.qGes replaces calculated demand", () => {
    const baseline = calcHeatPump(baseInputs);
    const overridden = calcHeatPump({ ...baseInputs, override: { qGes: 50000 } });
    expect(overridden.qGes).toBe(50000);
    expect(overridden.eWp).not.toBe(baseline.eWp);
  });

  it("amortisationsJahre is null when investment never pays back", () => {
    // Force absurdly expensive WP via override
    const r = calcHeatPump({ ...baseInputs, override: { investNetto: 500000 } });
    expect(r.amortisationsJahre).toBeNull();
  });

  it("amortisationsJahre is in valid range when investment pays back", () => {
    const r = calcHeatPump(baseInputs);
    if (r.amortisationsJahre !== null) {
      expect(r.amortisationsJahre).toBeGreaterThanOrEqual(1);
      expect(r.amortisationsJahre).toBeLessThanOrEqual(20);
    }
  });
});

// ─── Scenario wrappers (pessimistic/realistic/optimistic) ──────────────────
describe("calcHeatPumpScenarios", () => {
  const scenarios = calcHeatPumpScenarios(baseInputs);

  it("returns exactly 3 scenarios", () => {
    expect(scenarios).toHaveLength(3);
    expect(scenarios.map(s => s.id)).toEqual(["pessimistic", "realistic", "optimistic"]);
  });

  it("optimistic outperforms pessimistic in TCO savings", () => {
    const opt = scenarios.find(s => s.id === "optimistic")!;
    const pess = scenarios.find(s => s.id === "pessimistic")!;
    expect(opt.tcoEinsparung).toBeGreaterThan(pess.tcoEinsparung);
  });

  it("each scenario has consistent JAZ direction (opt > real > pess)", () => {
    const [pess, real, opt] = scenarios;
    expect(opt.jaz).toBeGreaterThanOrEqual(real.jaz);
    expect(real.jaz).toBeGreaterThanOrEqual(pess.jaz);
  });
});

// ─── PV synergy heuristic ──────────────────────────────────────────────────
describe("estimatePvCoverageOfWp", () => {
  it("returns 0 when no PV system (kwp=0)", () => {
    expect(estimatePvCoverageOfWp(0, 5000, 0)).toBe(0);
  });

  it("returns 0 when no WP electricity (eWp=0)", () => {
    expect(estimatePvCoverageOfWp(10, 0, 0)).toBe(0);
  });

  it("clamps coverage to [5%, 35%]", () => {
    // Tiny PV vs huge WP → would be near 0, clamped to 5
    const tiny = estimatePvCoverageOfWp(1, 100000, 0);
    expect(tiny).toBeGreaterThanOrEqual(0.05);
    // Huge PV with large storage → would exceed 35, clamped
    const huge = estimatePvCoverageOfWp(50, 3000, 30);
    expect(huge).toBeLessThanOrEqual(0.35);
  });

  it("storage increases coverage", () => {
    const noStorage = estimatePvCoverageOfWp(10, 5000, 0);
    const withStorage = estimatePvCoverageOfWp(10, 5000, 10);
    expect(withStorage).toBeGreaterThan(noStorage);
  });
});

// ─── PV synergy branch inside the full TCO engine ──────────────────────────
describe("calcHeatPump with PV synergy", () => {
  const noPv = calcHeatPump(baseInputs);
  const pvVorhanden = calcHeatPump({ ...baseInputs, pv: { status: "vorhanden", kwp: 10, speicherKwh: 10 } });
  const pvGeplant = calcHeatPump({ ...baseInputs, pv: { status: "geplant", kwp: 10, speicherKwh: 10 } });

  it("status 'nein' or kwp 0 disables the branch entirely", () => {
    const off = calcHeatPump({ ...baseInputs, pv: { status: "nein", kwp: 10, speicherKwh: 10 } });
    const zeroKwp = calcHeatPump({ ...baseInputs, pv: { status: "vorhanden", kwp: 0, speicherKwh: 0 } });
    for (const r of [off, zeroKwp]) {
      expect(r.pvCoverage).toBe(0);
      expect(r.pvStromSavings).toBe(0);
      expect(r.pvBenefit).toBe(0);
      expect(r.stromKosten).toBe(noPv.stromKosten);
    }
  });

  it("credits only the WP synergy, not the full PV benefit", () => {
    expect(pvVorhanden.pvCoverage).toBeGreaterThan(0);
    // Coverage is bounded by the conservative HTW heuristic (≤ 35 %): the WP runs
    // mostly in winter when PV yield is low, so it can never cover most of it.
    expect(pvVorhanden.pvCoverage).toBeLessThanOrEqual(0.35);
    // WP electricity is billed at the full grid price regardless of PV.
    expect(pvVorhanden.stromKosten).toBe(noPv.stromKosten);
    // TCO improves by EXACTLY the synergy credit (no PV cost, no household/feed-in).
    expect(noPv.tcoWp - pvVorhanden.tcoWp).toBe(pvVorhanden.pvBenefit);
    expect(pvVorhanden.pvBenefit).toBeGreaterThan(0);
    // The synergy is a fraction of the full PV value: a 10 kWp system's full
    // 20-year benefit is tens of thousands of € — the WP-attributable synergy
    // (solar the WP self-consumes instead of feeding in cheaply) is far smaller.
    expect(pvVorhanden.pvBenefit).toBeLessThan(20000);
    expect(pvVorhanden.pvStromSavings).toBe(pvVorhanden.pvBenefit); // alias
  });

  it("synergy rises monotonically with PV size and with storage (no physical inversions)", () => {
    // Guards the defect an earlier estimator had: differencing two rounded/clamped
    // self-consumption quotas produced non-monotonic coverage (a battery LOWERED
    // it, big systems peaked then crashed). The HTW heuristic must be smooth.
    const bySize = [2, 5, 10, 15, 20, 30].map(kwp =>
      calcHeatPump({ ...baseInputs, pv: { status: "vorhanden", kwp, speicherKwh: 0 } }).pvBenefit);
    for (let i = 1; i < bySize.length; i++) expect(bySize[i]).toBeGreaterThanOrEqual(bySize[i - 1]);

    const byStorage = [0, 2, 5, 10, 15].map(sp =>
      calcHeatPump({ ...baseInputs, pv: { status: "vorhanden", kwp: 10, speicherKwh: sp } }).pvBenefit);
    for (let i = 1; i < byStorage.length; i++) expect(byStorage[i]).toBeGreaterThanOrEqual(byStorage[i - 1]);

    // And coverage never breaks the physical 35 % ceiling, even in the worst corner.
    const corner = calcHeatPump({ ...baseInputs, personen: 1, wohnflaeche: 60, pv: { status: "vorhanden", kwp: 15, speicherKwh: 10 } });
    expect(corner.pvCoverage).toBeLessThanOrEqual(0.35);
  });

  it("existing PV improves the TCO without touching the chart's year-0 investment", () => {
    expect(pvVorhanden.tcoWp).toBeLessThan(noPv.tcoWp);
    // PV cost is NOT part of the WP comparison → year-0 (−mehrInvest) unchanged.
    expect(pvVorhanden.years[0].kum).toBe(noPv.years[0].kum);
  });

  it("'geplant' and 'vorhanden' are identical for the WP calc (PV cost belongs to the PV-Rechner)", () => {
    // Only the synergy matters to the WP-vs-gas verdict; the PV purchase itself is
    // a separate decision, so planned vs existing PV make no difference here.
    expect(pvGeplant.pvBenefit).toBe(pvVorhanden.pvBenefit);
    expect(pvGeplant.tcoWp).toBe(pvVorhanden.tcoWp);
    expect(pvGeplant.years[0].kum).toBe(pvVorhanden.years[0].kum);
  });
});

// ─── Config integrity ─────────────────────────────────────────────────────
describe("DEFAULT_HEATPUMP_CONFIG", () => {
  it("has BEG cap below sum of all bonuses (cap actually bites)", () => {
    const cfg = DEFAULT_HEATPUMP_CONFIG;
    const topIncome = Math.max(...cfg.begEinkommensStaffel.map(t => t.rate));
    const allBonuses = cfg.begGrundfoerderung + cfg.begKlimaBonus + topIncome;
    expect(allBonuses).toBeGreaterThan(cfg.begMaxRateLowIncome); // 30 + 16 + 40 = 86 % > 80 % → Deckel greift
  });

  it("flow temps escalate FBH < HK_neu < HK_alt", () => {
    const cfg = DEFAULT_HEATPUMP_CONFIG;
    expect(cfg.flowTempFbh).toBeLessThan(cfg.flowTempHkNeu);
    expect(cfg.flowTempHkNeu).toBeLessThan(cfg.flowTempHkAlt);
  });

  it("SWWP base higher than LWWP base (drilling premium)", () => {
    const cfg = DEFAULT_HEATPUMP_CONFIG;
    expect(cfg.investSwwpBase).toBeGreaterThan(cfg.investLwwpBase);
  });
});

// ─── Shared WP annual electricity (PV ↔ WP consistency) ─────────────────────
describe("calcWpAnnualElectricity", () => {
  it("equals Q_ges / JAZ of the full engine (same physics)", () => {
    const eng = calcHeatPump(baseInputs);
    const shared = calcWpAnnualElectricity({
      situation: baseInputs.situation,
      wohnflaeche: baseInputs.wohnflaeche,
      insulationIdx: baseInputs.insulationIdx,
      personen: baseInputs.personen,
      heizsystem: baseInputs.heizsystem,
      wpType: baseInputs.wpType,
    });
    expect(shared).toBe(eng.eWp);
  });

  it("unsaniertes EFH liegt im realen Feldband (nicht bei der alten 3500-Pauschale)", () => {
    // 140 m², unsaniert, 2 Personen, alte Heizkörper (55 °C) → LWWP.
    // Band aus Feldmessungen an Luft/Wasser-Wärmepumpen im Bestand (Fraunhofer ISE,
    // „WPsmart im Bestand"): ein schlecht gedämmtes EFH mit Hochtemperatur-Heizkörpern
    // liegt bei rund 6.000–10.000 kWh Strom im Jahr. Die frühere Untergrenze von
    // 9.000 kWh kodierte den überhöhten Norm-Bedarf und wurde am 31.07.2026 mit der
    // Bedarf→Verbrauch-Korrektur nach unten gezogen — NICHT, damit ein Test grün wird,
    // sondern weil die Menge vorher zu hoch war (Nutzerkritik Reddit, siehe
    // lib/heat-consumption.ts).
    const kwh = calcWpAnnualElectricity({
      situation: "bestand", wohnflaeche: 140, insulationIdx: 0,
      personen: 2, heizsystem: "hk_alt", wpType: "lwwp",
    });
    expect(kwh).toBeGreaterThan(6000);
    expect(kwh).toBeLessThan(10000);
  });

  it("Fußbodenheizung braucht weniger Strom als alte Heizkörper (bessere JAZ)", () => {
    const common = { situation: "bestand" as const, wohnflaeche: 140, insulationIdx: 1, personen: 2, wpType: "lwwp" as const };
    const fbh = calcWpAnnualElectricity({ ...common, heizsystem: "fbh" });
    const hkAlt = calcWpAnnualElectricity({ ...common, heizsystem: "hk_alt" });
    expect(fbh).toBeLessThan(hkAlt);
  });

  it("besser gedämmt → weniger Heizstrom", () => {
    const common = { situation: "bestand" as const, wohnflaeche: 140, personen: 2, heizsystem: "hk_neu" as const, wpType: "lwwp" as const };
    const unsaniert = calcWpAnnualElectricity({ ...common, insulationIdx: 0 });
    const saniert = calcWpAnnualElectricity({ ...common, insulationIdx: 2 });
    expect(saniert).toBeLessThan(unsaniert);
  });
});

// ─── Referenzheizung: Gas vs. Heizöl ───────────────────────────────────────
// Anlass: Nutzerkritik aus einem Fachforum (28.07.2026) — „bei Öl kommt auch nur
// das Ergebnis für Gas". Der Brennstoff wirkte tatsächlich (Preis, Wirkungsgrad,
// CO₂), aber die Grundgebühr des GASANSCHLUSSES wurde auch dem Öltank
// aufgeschlagen. Diese Tests halten beides fest: dass der Energieträger wirkt und
// dass er den richtigen Posten trifft.
describe("Referenzheizung Gas vs. Heizöl", () => {
  const oel = WP_FUEL_OPTIONS.find(f => f.kind === "oil")!;
  const gas = WP_FUEL_OPTIONS.find(f => f.id === "gas_neu")!;
  const mit = (f: typeof gas): HeatPumpInputs => ({
    ...baseInputs,
    fuelKind: f.kind,
    override: { gasPrice: f.price, gasEfficiency: f.efficiency, gasCo2: f.co2PerKwh },
  });

  it("Heizöl trägt KEINE Grundgebühr, Gas schon", () => {
    expect(calcHeatPump(mit(oel)).gasFix).toBe(0);
    expect(calcHeatPump(mit(gas)).gasFix).toBeGreaterThan(0);
  });

  it("die Grundgebühr fehlt auch in der Jahreskurve, nicht nur in der Summe", () => {
    // Sonst stimmte die Hero-Zahl, aber die Amortisationskurve liefe weiter mit
    // der Gas-Gebühr — genau die Sorte Widerspruch, die niemandem auffällt.
    const o = calcHeatPump(mit(oel));
    const g = calcHeatPump(mit(gas));
    const fix = DEFAULT_HEATPUMP_CONFIG.fixCostPerYear.gas;
    // Erstes Jahr: Öl spart pro Jahr genau die Grundgebühr weniger als Gas,
    // bereinigt um den unterschiedlichen Brennstoffpreis.
    expect(g.years[1].annual - o.years[1].annual).toBeGreaterThan(fix * 0.5);
  });

  it("ohne Grundgebühr rechnet sich die Wärmepumpe gegen Öl SCHLECHTER", () => {
    // Richtungstest: Der alte Fehler hat die WP künstlich gut aussehen lassen.
    const o = calcHeatPump(mit(oel));
    const fruehereRechnung = o.tcoEinsparung + DEFAULT_HEATPUMP_CONFIG.fixCostPerYear.gas * DEFAULT_HEATPUMP_CONFIG.years;
    expect(o.tcoEinsparung).toBeLessThan(fruehereRechnung);
  });

  it("Grüngas-Pflicht greift nur bei Netzgas, nicht bei Heizöl", () => {
    // Der GModG-Preispfad ist an Biomethan + Gas-Netzentgelten kalibriert. Auf Öl
    // angewandt wäre er eine Zahl ohne Grundlage.
    const oelOhne = calcHeatPump({ ...mit(oel), greenGas: false });
    const oelMit = calcHeatPump({ ...mit(oel), greenGas: true });
    expect(oelMit.tcoGas).toBe(oelOhne.tcoGas);

    const gasOhne = calcHeatPump({ ...mit(gas), greenGas: false });
    const gasMit = calcHeatPump({ ...mit(gas), greenGas: true });
    expect(gasMit.tcoGas).toBeGreaterThan(gasOhne.tcoGas);
  });

  it("jede Brennstoff-Option trägt eine eigene Beschriftung für die Referenzheizung", () => {
    // Verhindert den Rückfall auf ein festes „Gas" in der Oberfläche.
    for (const f of WP_FUEL_OPTIONS) {
      expect(f.refLabel.length).toBeGreaterThan(0);
      if (f.kind === "oil") expect(f.refLabel).not.toMatch(/Gas/i);
    }
  });
});

// ─── Dämmzustand: eine Quelle, lückenlose Skala ────────────────────────────
describe("Dämmzustands-Skala", () => {
  it("UI-Auswahl und Rechen-Config sind dieselben Zahlen", () => {
    // Sie standen bis 28.07.2026 doppelt im Code und konnten auseinanderlaufen.
    expect(DEFAULT_HEATPUMP_CONFIG.specDemandBestand).toEqual(INSULATION_BESTAND.map(i => i.specKwh));
    expect(DEFAULT_HEATPUMP_CONFIG.specHeatLoadBestand).toEqual(INSULATION_BESTAND.map(i => i.heatLoadW));
    expect(DEFAULT_HEATPUMP_CONFIG.specDemandNeubau).toEqual(INSULATION_NEUBAU.map(i => i.specKwh));
    expect(DEFAULT_HEATPUMP_CONFIG.specHeatLoadNeubau).toEqual(INSULATION_NEUBAU.map(i => i.heatLoadW));
  });

  it("Bedarf und Heizlast fallen über die Stufen monoton", () => {
    for (const arr of [INSULATION_BESTAND, INSULATION_NEUBAU]) {
      for (let i = 1; i < arr.length; i++) {
        expect(arr[i].specKwh).toBeLessThan(arr[i - 1].specKwh);
        expect(arr[i].heatLoadW).toBeLessThan(arr[i - 1].heatLoadW);
      }
    }
  });

  it("der beste Bestand liegt unter dem schwächsten Neubau", () => {
    // DER Auslöser für die vierte Stufe: Vorher war die beste Bestandsstufe (100)
    // schlechter als der Neubau-Mindeststandard (75) — ein vollsaniertes Haus war
    // im Rechner schlicht nicht abbildbar und bekam eine zu große Wärmepumpe.
    const besterBestand = INSULATION_BESTAND[INSULATION_BESTAND.length - 1];
    expect(besterBestand.specKwh).toBeLessThan(INSULATION_NEUBAU[0].specKwh);
    // Die HEIZLAST darf dagegen über dem Neubau liegen: Ein rundum gedämmter Altbau
    // erreicht den Jahresverbrauch eines schwachen Neubaus, verliert an den kältesten
    // Tagen aber weiterhin mehr Wärme (Wärmebrücken, Geometrie, Fensterflächen). Sie
    // bleibt im Faustwert-Band „saniert" (30–50 W/m², Verbraucherzentrale/42watt).
    expect(besterBestand.heatLoadW).toBeGreaterThanOrEqual(30);
    expect(besterBestand.heatLoadW).toBeLessThanOrEqual(50);
  });

  it("Vollsanierung bleibt im belegten Band der dena-Verbrauchsstudie", () => {
    // dena, „Auswertung von Verbrauchskennwerten energieeffizienter Wohngebäude",
    // S. 25 / Abb. 7: sanierte Gebäude mit gut gedämmter Hülle streuen bei fossiler
    // Beheizung zwischen 10 und 90 kWh/(m²AN·a); 90 % liegen unter rund 70.
    // Der Wert darf nach unten wandern, aber nicht aus dem Band herausrutschen.
    const voll = INSULATION_BESTAND[INSULATION_BESTAND.length - 1].specKwh;
    expect(voll).toBeGreaterThanOrEqual(50);
    expect(voll).toBeLessThanOrEqual(90);
  });

  it("Vollsanierung senkt Heizbedarf UND Anlagengröße spürbar", () => {
    const gut = calcHeatDemand("bestand", 140, 2, 2).qGes;
    const voll = calcHeatDemand("bestand", 140, 3, 2).qGes;
    expect(voll).toBeLessThan(gut);
    expect(calcHeatLoad("bestand", 140, 3, 1)).toBeLessThan(calcHeatLoad("bestand", 140, 2, 1));
  });
});

// ─── Council-Befunde vom 28.07.2026 ────────────────────────────────────────
// Drei unabhängige Prüfer haben die Änderungen dieses Tages adversarial geprüft.
// Was sie gefunden haben, wird hier festgenagelt — die Fehler waren teuer und
// alle drei gehören zur selben Familie: Ein Kostenblock stammt aus dem einen Fall,
// ein anderer aus dem anderen.
describe("Referenzfall bleibt in sich geschlossen", () => {
  it("ein Kessel, den man WEITERBETREIBT, ist als solcher markiert", () => {
    // „Alter Gaskessel" (80 % Nutzungsgrad) als NEU eingebaute Heizung zu rechnen,
    // brachte der Wärmepumpe rund 14.000 € geschenkten Vorteil: Anschaffung und
    // Beimischungspflicht aus dem Ersatzfall, Verbrauch aus dem Weiterbetriebsfall.
    // Das UI filtert danach; die Markierung darf deshalb nicht verlorengehen.
    const alt = WP_FUEL_OPTIONS.filter(f => f.bestandsanlage);
    const neu = WP_FUEL_OPTIONS.filter(f => !f.bestandsanlage);
    expect(alt.length).toBeGreaterThan(0);
    expect(neu.length).toBeGreaterThan(0);
    // Neu eingebaute Kessel sind nie schlechter als der Stand der Technik.
    for (const f of neu) expect(f.efficiency).toBeGreaterThanOrEqual(0.85);
    // Und ein Bestandskessel ist immer schlechter als jedes Neugerät.
    for (const a of alt) {
      for (const n of neu.filter(x => x.kind === a.kind)) {
        expect(a.efficiency).toBeLessThan(n.efficiency);
      }
    }
  });

  it("die Wärmepumpe trägt ihren Zählergrundpreis, so wie die fossile Seite auch", () => {
    // Fehlte bis 28.07.2026 ganz — eine kleine, aber einseitige Schieflage.
    expect(DEFAULT_HEATPUMP_CONFIG.wpFixCostPerYear).toBeGreaterThan(0);
    const r = calcHeatPump(baseInputs);
    expect(r.wartungWp).toBe((DEFAULT_HEATPUMP_CONFIG.wpMaintenance + DEFAULT_HEATPUMP_CONFIG.wpFixCostPerYear) * DEFAULT_HEATPUMP_CONFIG.years);
  });

  it("die Betriebskosten stehen im belegten Verhältnis zueinander", () => {
    // Quelle beider Werte: Verbraucherzentrale RLP, Beispielrechnung 02.06.2025
    // (fossil 300 €/a inkl. Schornsteinfeger, Wärmepumpe 250 €/a). Wer hier etwas
    // ändert, muss die Quelle mitändern — nicht nur die Zahl.
    expect(DEFAULT_HEATPUMP_CONFIG.gasMaintenance).toBeGreaterThan(DEFAULT_HEATPUMP_CONFIG.wpMaintenance);
    // Fraunhofer ISE setzt in der Bio-Treppen-Kurzstudie 500 €/a je System an —
    // darüber wollen wir nicht liegen (sonst rechnen wir teurer als die Studie).
    expect(DEFAULT_HEATPUMP_CONFIG.gasMaintenance).toBeLessThanOrEqual(500);
    expect(DEFAULT_HEATPUMP_CONFIG.wpMaintenance).toBeLessThanOrEqual(500);
  });

  it("die Anschaffung der fossilen Alternative bleibt im belegten Band", () => {
    // Fraunhofer ISE, Kurzstudie „Vergleich Wärmeversorgung" (23.06.2026, S. 14):
    // Gaskessel Einfamilienhaus 11.400–20.400 € brutto bei 10 kW.
    expect(DEFAULT_HEATPUMP_CONFIG.fossilErsatzInvest).toBeGreaterThanOrEqual(11400);
    expect(DEFAULT_HEATPUMP_CONFIG.fossilErsatzInvest).toBeLessThanOrEqual(20400);
  });

  it("die Bilanz geht auf — jeder Posten steckt genau einmal in der Summe", () => {
    const r = calcHeatPump(baseInputs);
    expect(r.tcoGas).toBe(r.gasKosten + r.gasFix + r.gasWartung + r.gasInvest);
    expect(r.tcoWp).toBe(r.investNetto + r.stromKosten + r.wartungWp - r.pvBenefit);
    expect(r.tcoEinsparung).toBe(Math.round(r.tcoGas - r.tcoWp));
    // Die Kurve muss zur Summe passen (Rundung je Jahr erlaubt ein paar Euro).
    expect(Math.abs(r.years[r.years.length - 1].kum - r.tcoEinsparung)).toBeLessThanOrEqual(25);
  });
});
