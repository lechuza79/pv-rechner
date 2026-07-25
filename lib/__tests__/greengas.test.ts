import { describe, it, expect } from "vitest";
import { gasQuoteForYear, gasMixForYear, gasMixPriceEurForYear, gasMixSeries, heatCostComparisonSeries } from "../greengas";

// Referenzwerte: IW-Report 36/2026, Tabelle 3-2 + Anhang Kap. 6 (Abb. 6-1/6-2).
// Der Gas-Mix-Endkundenpreis (brutto) im Basisszenario für den MFH-Beispielhaushalt:
//   2026: 10,9 ct/kWh  ·  2040: 19,5 ct/kWh  ·  2045: 23,7 ct/kWh
// Bei 10.000 kWh Jahresverbrauch: 1.080 € (2026) → 1.952 € (2040) → 2.366 € (2045).

describe("Bio-Treppe (Grüngasquote)", () => {
  it("folgt den gesetzlichen Stützstellen", () => {
    expect(gasQuoteForYear(2026)).toBe(0);
    expect(gasQuoteForYear(2028)).toBe(0);
    expect(gasQuoteForYear(2029)).toBeCloseTo(0.1, 5);
    expect(gasQuoteForYear(2030)).toBeCloseTo(0.15, 5);
    expect(gasQuoteForYear(2035)).toBeCloseTo(0.3, 5);
    expect(gasQuoteForYear(2040)).toBeCloseTo(0.6, 5);
    expect(gasQuoteForYear(2045)).toBeCloseTo(1.0, 5);
  });

  it("interpoliert Zwischenjahre linear", () => {
    // 2030 (15 %) → 2035 (30 %): +3 pp/Jahr
    expect(gasQuoteForYear(2032)).toBeCloseTo(0.21, 5);
    // 2035 (30 %) → 2040 (60 %): +6 pp/Jahr
    expect(gasQuoteForYear(2037)).toBeCloseTo(0.42, 5);
  });

  it("bleibt ab 2045 bei 100 %", () => {
    expect(gasQuoteForYear(2046)).toBe(1.0);
    expect(gasQuoteForYear(2050)).toBe(1.0);
  });
});

describe("Gas-Mix-Endkundenpreis (Basisszenario) reproduziert den IW-Report", () => {
  it("2026: 10,8 ct/kWh brutto (= 1.080 € bei 10.000 kWh, Tabelle 3-2)", () => {
    // Die präzise Tabellen-Basis ergibt 10,80 ct (1.080 €); die 10,9 ct in Abb. 6-2
    // sind die gerundete Diagramm-Achse.
    expect(gasMixForYear(2026, "base").totalCt).toBeCloseTo(10.8, 1);
  });

  it("2040: ~19,5 ct/kWh brutto", () => {
    expect(gasMixForYear(2040, "base").totalCt).toBeCloseTo(19.5, 1);
  });

  it("2045: ~23,7 ct/kWh brutto", () => {
    expect(gasMixForYear(2045, "base").totalCt).toBeCloseTo(23.7, 1);
  });

  it("liefert die Jahreskosten des MFH-Beispielhaushalts (10.000 kWh)", () => {
    expect(gasMixPriceEurForYear(2026, "base") * 10000).toBeCloseTo(1080, -1); // ±5 €
    expect(gasMixPriceEurForYear(2040, "base") * 10000).toBeCloseTo(1952, -1);
    expect(gasMixPriceEurForYear(2045, "base") * 10000).toBeCloseTo(2366, -1);
  });
});

describe("CO₂-Komponente", () => {
  it("2026 fossil: ~1,1 ct/kWh netto (vor MwSt)", () => {
    // Report Tabelle 3-2: CO₂-Kosten bei 1,1 ct/kWh netto (60 €/t × 0,1833 kg/kWh).
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

  it("hohes Szenario erreicht ~28–30 ct/kWh 2045 (obere Preisspanne)", () => {
    // Abb. 6-2: obere Spanne 2045 deutlich über 25 ct/kWh.
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
