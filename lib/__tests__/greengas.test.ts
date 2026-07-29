import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gasQuoteForYear, gasMixForYear, gasMixPriceEurForYear, gasMixSeries, heatCostComparisonSeries, annualHeatingCostSeries } from "../greengas";
import { BIO_TREPPE_STUFEN, bioTreppeStufenText, GREEN_GAS_CONFIG, GMODG_RECHTSSTAND, gmodgStandSatz } from "../greengas-config";

// Referenzwerte: IW-Report 36/2026 (Volltext im Repo unter docs/gmodg/), am
// 27.07.2026 seitenweise gegengelesen. Referenzhaushalt ist MFH1 — teilsanierte
// Altbauwohnung, 75 m², 10.000 kWh/a (Tabelle 3-1, S. 13):
//   1.080 € (2026) → 1.952 € (2040) → 2.366 € (2045)   [Kap. 4.1, S. 18]
// entspricht 10,8 / 19,5 / 23,7 ct je kWh brutto. Der 2045er-Wert gilt nur,
// „sofern bis dahin eine vollständige Versorgung mit Biomethan beziehungsweise
// klimaneutralem Gas unterstellt wird" (Zusammenfassung, S. 4) — gesetzlich
// (§ 43 GModG) endet die Bio-Treppe bei 60 % im Jahr 2040.
//
// Zu den Fundstellen: Sie waren zwischenzeitlich aus dieser Datei entfernt, weil
// niemand sie geprüft hatte. Sie sind jetzt geprüft und stehen wieder da — mit
// Seitenzahl. Regel bleibt (CLAUDE.md, Faktenprüfung Punkt 6): Wer eine Fundstelle
// zitiert, muss sie selbst aufgeschlagen haben. Tests ohne Report-Deckung prüfen
// die Modell-Konsistenz — das steht jeweils am Test dran.

describe("Bio-Treppe (Grüngasquote)", () => {
  it("folgt den gesetzlichen Stufen des § 43 GModG", () => {
    // Die vier Stufen, die WIRKLICH im Gesetz stehen — mehr gibt es nicht.
    expect(gasQuoteForYear(2026)).toBe(0);
    expect(gasQuoteForYear(2028)).toBe(0);
    expect(gasQuoteForYear(2029)).toBeCloseTo(0.1, 5);
    expect(gasQuoteForYear(2030)).toBeCloseTo(0.15, 5);
    expect(gasQuoteForYear(2035)).toBeCloseTo(0.3, 5);
    expect(gasQuoteForYear(2040)).toBeCloseTo(0.6, 5);
  });

  it("die Stufen-Liste für Texte enthält genau die vier Gesetzesstufen", () => {
    // Verhindert, dass in Ratgeber/FAQ/Rechner wieder eine erfundene Stufe auftaucht.
    expect(BIO_TREPPE_STUFEN.map((s) => [s.year, s.pct])).toEqual([
      [2029, 10],
      [2030, 15],
      [2035, 30],
      [2040, 60],
    ]);
    expect(bioTreppeStufenText()).toBe("10 % (2029), 15 % (2030), 30 % (2035) und 60 % (2040)");
    expect(bioTreppeStufenText()).not.toMatch(/100|2045/);
  });

  it("2045 = 100 % ist IW-Modellannahme, keine Gesetzesstufe", () => {
    // Der Report schreibt bis zur Klimaneutralität 2045 fort (§ 42a kündigt dafür
    // ein eigenes Gesetz an). Der Wert bleibt im Modell — aber nicht im Gesetzes-Text.
    expect(gasQuoteForYear(2045)).toBeCloseTo(1.0, 5);
    expect(BIO_TREPPE_STUFEN.some((s) => s.year === 2045)).toBe(false);
  });

  it("interpoliert Zwischenjahre linear", () => {
    // 2030 (15 %) → 2035 (30 %): +3 pp/Jahr
    expect(gasQuoteForYear(2032)).toBeCloseTo(0.21, 5);
    // 2035 (30 %) → 2040 (60 %): +6 pp/Jahr
    expect(gasQuoteForYear(2037)).toBeCloseTo(0.42, 5);
  });

  it("bleibt nach 2045 auf dem Endwert der Modellannahme (100 %)", () => {
    expect(gasQuoteForYear(2046)).toBe(1.0);
    expect(gasQuoteForYear(2050)).toBe(1.0);
  });
});

describe("Rechtsstand GModG — Realitäts-Anker für den Wächter", () => {
  // Der Verkündungs-Schalter ist der einzige Wert hier, den ein Wächter selbst
  // umlegen darf (scripts/gruengas-verify.md). Damit er das nicht unbelegt tut,
  // hängt dieser Block an der abgelegten Primärquelle. Geprüft am 28.07.2026 im
  // Volltext des Bundesgesetzblatts:
  //   § 43 Abs. 1: „nach dem 29. Juli 2026 in ein bestehendes Gebäude neu eingebaut"
  //   Art. 1 Nr. 9 a): § 10 Abs. 2 Nr. 3 neu — „die Maßgaben der §§ 42 bis 45
  //                   entsprechend eingehalten werden" (zieht den Neubau mit hinein)
  //   Art. 9 Abs. 1: „tritt vorbehaltlich der Absätze 2 bis 4 am Tag nach der
  //                   Verkündung in Kraft"
  const VOR_INKRAFTTRETEN = new Date("2026-07-28T12:00:00");
  const NACH_INKRAFTTRETEN = new Date("2026-07-29T00:00:00");

  it("die Verkündung ist mit Fundstelle belegt, nicht nur behauptet", () => {
    if (!GMODG_RECHTSSTAND.verkuendet) return; // vor der Verkündung nichts zu prüfen
    expect(GMODG_RECHTSSTAND.fundstelle).toBe("BGBl. 2026 I Nr. 226");
    expect(GMODG_RECHTSSTAND.verkuendetAm).toBe("28. Juli 2026");
    expect(GMODG_RECHTSSTAND.inKraftSeitIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(new Date(GMODG_RECHTSSTAND.inKraftSeitIso).getTime())).toBe(false);
  });

  it("der Gesetzestext liegt als Primärquelle im Repo", () => {
    // Fundstelle erst beschaffen, dann zitieren (CLAUDE.md, Faktenprüfung 6).
    const pdf = join(__dirname, "..", "..", "docs", "gmodg", "BGBl-2026-I-Nr-226_GModG_verkuendet-2026-07-28.pdf");
    expect(existsSync(pdf)).toBe(true);
  });

  it("auch die Materialien zur Neubau-Geltung liegen im Repo", () => {
    // Die Neubau-Aussage steht NICHT im Gesetzestext selbst, sondern in der
    // Begründung zum Verweis in § 10 Abs. 2 Nr. 3. Wer sie zitiert, muss beide
    // Drucksachen greifbar haben — sonst ist es wieder nur eine Behauptung.
    const docs = join(__dirname, "..", "..", "docs", "gmodg");
    expect(existsSync(join(docs, "BT-Drs-21-6278_GModG-Regierungsentwurf-Begruendung.pdf"))).toBe(true);
    expect(existsSync(join(docs, "BT-Drs-21-7009_GModG-Beschlussempfehlung.pdf"))).toBe(true);
  });

  it("kennt die Neubau-Stichtage als Datum, nicht als Fließtext", () => {
    // Artikel 2 (neues Referenzgebäude) und Artikel 4 (Nullemissionsgebäude) —
    // beide im selben Gesetz, beide mit eigenem Inkrafttreten (Art. 9 Abs. 2/4).
    expect(GMODG_RECHTSSTAND.neubauReferenzAb).toBe("1. Januar 2027");
    expect(GMODG_RECHTSSTAND.neubauNullemissionAb).toBe("1. Januar 2030");
    // Die Zeitgrenze der Bio-Treppe im Neubau — ohne sie ist jede Neubau-Aussage
    // zu weit (Begründung zu § 5b KostAufG, BT-Drs. 21/6278, S. 125).
    expect(GMODG_RECHTSSTAND.neubauBioTreppeBis).toBe("31. Dezember 2029");
  });

  it("keine Neubau-Aussage ohne Zeitgrenze — auch nicht in FAQ und Ratgeber", () => {
    // Zweite Ebene neben dem Standsatz: Jeder freie Text, der den Neubau in die
    // Beimischpflicht nimmt, muss die Grenze mitführen. Der Test liest die
    // echten Textquellen, nicht eine Kopie davon.
    const quellen = [
      join(__dirname, "..", "faq.ts"),
      join(__dirname, "..", "..", "app", "(site)", "ratgeber", "gasheizung-oder-waermepumpe", "page.tsx"),
      join(__dirname, "..", "..", "app", "(site)", "waermepumpe-rechner", "waermepumpe.tsx"),
    ];
    for (const datei of quellen) {
      const text = readFileSync(datei, "utf8");
      const nenntNeubau = /Neubau/.test(text);
      if (!nenntNeubau) continue;
      // Entweder über die Konstante (bevorzugt) oder wörtlich — Hauptsache, die
      // Grenze steht da, wo die Behauptung steht.
      const hatGrenze = text.includes("neubauBioTreppeBis") || text.includes(GMODG_RECHTSSTAND.neubauBioTreppeBis);
      expect(hatGrenze, `${datei} nennt den Neubau ohne die Zeitgrenze bis ${GMODG_RECHTSSTAND.neubauBioTreppeBis}`).toBe(true);
    }
  });

  it("behauptet vor dem Inkrafttreten kein geltendes Recht", () => {
    const satz = gmodgStandSatz(VOR_INKRAFTTRETEN);
    expect(satz).toContain("verkündet");
    expect(satz).toContain(GMODG_RECHTSSTAND.fundstelle);
    expect(satz).toMatch(/tritt am .* in Kraft/);
    expect(satz).not.toMatch(/ist seit|geltendes Recht/);
  });

  it("sagt ab dem Inkrafttreten, dass das Gesetz gilt — mit Geltungsbereich", () => {
    const satz = gmodgStandSatz(NACH_INKRAFTTRETEN);
    expect(satz).toContain("in Kraft");
    expect(satz).toContain(GMODG_RECHTSSTAND.fundstelle);
    // Der Satz muss BEIDE Fälle nennen. Am 28.07.2026 stand hier die Verengung
    // „neu in ein bestehendes Gebäude eingebaut" — abgeleitet aus dem Wortlaut
    // von § 43 Abs. 1, aber falsch: § 10 Abs. 2 Nr. 3 zieht den Neubau mit
    // hinein („die Maßgaben der §§ 42 bis 45 entsprechend"), die Begründung
    // sagt es ausdrücklich (BT-Drs. 21/6278, S. 96). Wer nur den Bestand nennt,
    // sagt jedem Bauherrn, er sei nicht gemeint — die Verengung darf nicht zurück.
    expect(satz).toMatch(/bestehende[ns]? Gebäude/);
    expect(satz).toContain("Neubau");
    expect(satz).not.toMatch(/neu in ein bestehendes Gebäude/);
    // Der ernsteste Befund des Council-Laufs: Ohne die Zeitgrenze ist die
    // Neubau-Aussage falsch für Gebäude ab 2030 (dann verdrängt das
    // Nullemissionsgebäude den Verweis). Begründung zu § 5b KostAufG,
    // BT-Drs. 21/6278, S. 125: „Erfasst werden nur Neubauten, die bis zum
    // 31.12.2029 errichtet werden."
    expect(satz).toContain(GMODG_RECHTSSTAND.neubauBioTreppeBis);
    // Zitierweise: für den Neubau ist § 43 nur ENTSPRECHEND anwendbar, die
    // tragende Norm ist § 10 Absatz 2 Nummer 3. „§ 43" allein wäre angreifbar.
    expect(satz).toContain("§ 10 Absatz 2 Nummer 3");
    // § 43 erfasst Gas, Heizöl UND Flüssiggas. Nur „Gas" zu nennen sagt einem
    // Ölheizungs-Besitzer, er sei nicht gemeint — die Verengung darf nicht zurück.
    expect(satz).toContain("Heizöl");
    expect(satz).toContain("Flüssiggas");
    // …und die erste Stufe kommt aus der Stufen-Liste, nicht handgetippt.
    expect(satz).toContain(String(BIO_TREPPE_STUFEN[0].year));
    // Die Pflicht nicht überzeichnen: § 43 Abs. 3 bis 5 kennt weitere
    // Erfüllungswege, Abs. 7 einen Aufschub bei irreparablem Ausfall. Bewusst
    // NICHT mehr „Ersatzwege und Härtefälle (Abs. 3–7)" — Abs. 6 ist kein
    // Erfüllungsweg, und der Härtefall-Dispens steht in § 102 (Legal-Judge).
    expect(satz).toMatch(/Erfüllungswege/);
    expect(satz).not.toMatch(/§ 43 Absatz 3 bis 7/);
    // Der Bundesrat beschließt kein Einspruchsgesetz mit.
    expect(satz).not.toContain("Bundesrat");
  });
});

describe("Config-Werte = Preisannahmen des Report-Anhangs (Kap. 6, S. 31–32)", () => {
  // Jede Zeile hier wurde am 27.07.2026 im PDF (docs/gmodg/) nachgeschlagen. Der
  // Anhang differenziert EFH/MFH — wir führen die MFH-Werte (Referenzhaushalt MFH1).
  it("Erdgas, Biomethan, Netzentgelt, Steuer/Konzession", () => {
    expect(GREEN_GAS_CONFIG.erdgasCt2026).toBe(5.2); // MFH; EFH wäre 5,5
    expect(GREEN_GAS_CONFIG.erdgasEndFactor).toEqual({ low: 0.85, base: 1.0, high: 1.15 });
    expect(GREEN_GAS_CONFIG.biomethanCt2026).toBe(12);
    expect(GREEN_GAS_CONFIG.biomethanCt2045).toEqual({ low: 12, base: 15, high: 18 });
    expect(GREEN_GAS_CONFIG.netzCt2026).toBe(2.2); // MFH; EFH wäre 2,6
    expect(GREEN_GAS_CONFIG.netzCt2045).toEqual({ low: 2.2, base: 4.3, high: 6.4 });
    expect(GREEN_GAS_CONFIG.steuerKonzessionCt).toBeCloseTo(0.58, 5); // 0,55 + 0,03
  });

  it("CO₂-Preispfad, Emissionsfaktor und Mehrwertsteuer", () => {
    expect(GREEN_GAS_CONFIG.co2EurT2026).toEqual({ low: 55, base: 60, high: 65 });
    expect(GREEN_GAS_CONFIG.co2EurT2045).toEqual({ low: 150, base: 250, high: 350 });
    // S. 32: 0,2029 kg/kWh (heizwertbezogen, EBeV 2030) × 0,903 = 0,18322; der
    // Report nennt daraus „rund 0,1833 kg CO₂e/kWh". Wir führen bewusst den vom
    // Report ausgewiesenen Wert, nicht das nachgerechnete Produkt — die Differenz
    // liegt bei 0,04 % und damit weit unter jeder sichtbaren Wirkung.
    expect(GREEN_GAS_CONFIG.emissionFactorKgPerKwh).toBe(0.1833);
    expect(GREEN_GAS_CONFIG.vat).toBe(0.19);
  });
});

describe("Gas-Mix-Endkundenpreis (Basisszenario) reproduziert den IW-Report", () => {
  it("2026: 10,8 ct/kWh brutto (= 1.080 € bei 10.000 kWh, Tabelle 3-2 S. 15)", () => {
    // Tabelle 3-2 rechnet netto 907,95 € × 1,19 = 1.080 € brutto, also 10,80 ct.
    // Abbildung 6-2 (S. 33) beschriftet denselben Punkt mit 10,9 ct — das ist die
    // gerundete Diagramm-Achse, nicht ein abweichender Wert.
    expect(gasMixForYear(2026, "base").totalCt).toBeCloseTo(10.8, 1);
  });

  it("2040: ~19,5 ct/kWh brutto", () => {
    expect(gasMixForYear(2040, "base").totalCt).toBeCloseTo(19.5, 1);
  });

  it("2045: ~23,7 ct/kWh brutto", () => {
    expect(gasMixForYear(2045, "base").totalCt).toBeCloseTo(23.7, 1);
  });

  it("liefert die Jahreskosten des Beispielhaushalts MFH1 (10.000 kWh, S. 18)", () => {
    expect(gasMixPriceEurForYear(2026, "base") * 10000).toBeCloseTo(1080, -1); // ±5 €
    expect(gasMixPriceEurForYear(2040, "base") * 10000).toBeCloseTo(1952, -1);
    expect(gasMixPriceEurForYear(2045, "base") * 10000).toBeCloseTo(2366, -1);
  });
});

describe("CO₂-Komponente", () => {
  it("2026 fossil: ~1,1 ct/kWh netto (vor MwSt)", () => {
    // Tabelle 3-2 (S. 15) weist die CO₂-Kosten mit 1,1 ct/kWh netto aus
    // (60 €/t × 0,1833 kg/kWh; Emissionsfaktor hergeleitet auf S. 32).
    const co2Brutto = gasMixForYear(2026, "base").components.co2;
    expect(co2Brutto / 1.19).toBeCloseTo(1.1, 1);
  });

  it("verschwindet bei voller Grüngas-Deckung (2045: 100 % biogen)", () => {
    expect(gasMixForYear(2045, "base").components.co2).toBeCloseTo(0, 5);
  });
});

describe("Preiskomponenten summieren sich zum Gesamtpreis", () => {
  it("Summe der Bestandteile = totalCt", () => {
    for (const year of [2026, 2030, 2035, 2040, 2045]) {
      const m = gasMixForYear(year, "base");
      const sum =
        m.components.erdgas +
        m.components.biomethan +
        m.components.netz +
        m.components.steuer +
        m.components.co2;
      expect(sum).toBeCloseTo(m.totalCt, 6);
    }
  });
});

describe("Szenario-Korridor (niedrig < basis < hoch)", () => {
  it("weitet sich über die Zeit auf und ist geordnet", () => {
    // 2026 sind alle Szenarien praktisch gleich (nur CO₂-Ausgangswert unterscheidet).
    const low2045 = gasMixForYear(2045, "low").totalCt;
    const base2045 = gasMixForYear(2045, "base").totalCt;
    const high2045 = gasMixForYear(2045, "high").totalCt;
    expect(low2045).toBeLessThan(base2045);
    expect(base2045).toBeLessThan(high2045);
  });

  it("hohes Szenario erreicht 2045 die obere Preisspanne des Reports", () => {
    // Kap. 4.1, S. 19: im Hochpreisszenario 2.973 € im Jahr 2045 bei 10.000 kWh,
    // also rund 29,7 ct/kWh. Abbildung 6-2 (S. 33) zeigt dieselbe Spanne.
    expect(gasMixForYear(2045, "high").totalCt).toBeGreaterThan(25);
  });
});

describe("gasMixSeries", () => {
  it("liefert n Jahre ab Startjahr", () => {
    const s = gasMixSeries(20, "base", 2026);
    expect(s).toHaveLength(20);
    expect(s[0].year).toBe(2026);
    expect(s[19].year).toBe(2045);
  });
});

describe("annualHeatingCostSeries (Jahreskosten in €)", () => {
  const base = {
    years: 20, startYear: 2026, scenario: "base" as const,
    fuelKwh: 10000, eWpKwh: 2700, wpTarifEurKwh: 0.24, stromInflation: 0.02, pvCoverage: 0.3,
  };

  it("Gas-Jahreskosten = Gasmenge × Gas-Mix-Preis (2026 ~1.080 € bei 10.000 kWh)", () => {
    const s = annualHeatingCostSeries(base).series;
    expect(s[0].gas).toBeCloseTo(1080, -1); // ±5 €
    // 2040 (i=14): Gas-Mix ~19,5 ct → ~1.952 €
    expect(s.find(p => p.year === 2040)!.gas).toBeCloseTo(1952, -1);
  });

  it("PV senkt die WP-Jahreskosten um den Deckungsanteil", () => {
    const s = annualHeatingCostSeries(base).series;
    expect(s[0].wpPv).toBeCloseTo(s[0].wp * 0.7, 5);
  });

  it("Summen sind die Jahres-Summen und geordnet (Gas > WP > WP+PV)", () => {
    const { series, totals } = annualHeatingCostSeries(base);
    expect(totals.gas).toBeCloseTo(series.reduce((a, p) => a + p.gas, 0), 5);
    expect(totals.gas).toBeGreaterThan(totals.wp);
    expect(totals.wp).toBeGreaterThan(totals.wpPv);
  });
});

describe("heatCostComparisonSeries (Heizkosten je kWh Wärme)", () => {
  const base = {
    years: 20, startYear: 2026, scenario: "base" as const,
    gasEfficiency: 0.95, jaz: 3.5, wpTarifEurKwh: 0.24, stromInflation: 0.02,
  };

  it("rechnet Gas auf Wärme um (÷ Kesselwirkungsgrad)", () => {
    // 2026: Gas-Mix 10,8 ct/kWh ÷ 0,95 ≈ 11,4 ct/kWh Wärme
    expect(heatCostComparisonSeries(base)[0].gas).toBeCloseTo(10.8 / 0.95, 1);
  });

  it("rechnet WP-Strom auf Wärme um (÷ JAZ)", () => {
    // 2026: 24 ct/kWh Strom ÷ 3,5 ≈ 6,9 ct/kWh Wärme
    expect(heatCostComparisonSeries(base)[0].wp).toBeCloseTo(24 / 3.5, 1);
  });

  it("WP-Wärme ist in jedem Jahr günstiger als Gas-Wärme (die Kernaussage)", () => {
    for (const p of heatCostComparisonSeries(base)) {
      expect(p.wp).toBeLessThan(p.gas);
    }
  });

  it("PV-Deckung senkt die WP-Wärmekosten", () => {
    const withPv = heatCostComparisonSeries({ ...base, pvCoverage: 0.3 });
    expect(withPv[0].wpPv).not.toBeNull();
    expect(withPv[0].wpPv!).toBeLessThan(withPv[0].wp);
    // 30 % PV-Deckung → 30 % günstiger als reiner Netzstrom-Betrieb
    expect(withPv[0].wpPv!).toBeCloseTo(withPv[0].wp * 0.7, 5);
  });

  it("ohne PV-Deckung bleibt die PV-Linie leer", () => {
    expect(heatCostComparisonSeries(base)[0].wpPv).toBeNull();
  });

  it("Gas-Wärmekosten steigen bis 2040 deutlich (Grüngas-Effekt)", () => {
    const s = heatCostComparisonSeries(base);
    const y2026 = s[0].gas;
    const y2040 = s.find(p => p.year === 2040)!.gas;
    expect(y2040).toBeGreaterThan(y2026 * 1.7);
  });
});
