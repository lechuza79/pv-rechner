import { describe, it, expect } from "vitest";
import {
  CO2_INTENSITY_YEARS,
  CO2_INTENSITY_VALUES,
  CO2_ABSOLUTE_VALUES,
  CO2_INTENSITY_META,
  STROMMIX_HISTORY_YEARS,
} from "../strommix-history";

// Die CO₂-Reihe stammt aus einer PDF-Tabelle, die einmal jährlich (März) neu
// erscheint — und dabei auch alte Jahre revidiert. Beim Wechsel 13/2025 →
// 16/2026 (geprüft 27.07.2026, Volltext docs/uba/) haben sich 14 Altwerte
// geändert. Diese Tests halten fest, was beim Nachziehen zusammenpassen MUSS:
// gleiche Länge, plausible Richtung, und die Ankerwerte, die ich in der
// Tabelle selbst aufgeschlagen habe.
describe("CO₂-Intensität Strommix (UBA CLIMATE CHANGE 16/2026, Tabelle 2)", () => {
  it("Jahre und Werte sind index-gleich — sonst verrutscht die ganze Kurve", () => {
    expect(CO2_INTENSITY_VALUES).toHaveLength(CO2_INTENSITY_YEARS.length);
    expect(CO2_ABSOLUTE_VALUES).toHaveLength(CO2_INTENSITY_YEARS.length);
  });

  it("Jahre lückenlos aufsteigend ab 1990", () => {
    expect(CO2_INTENSITY_YEARS[0]).toBe(1990);
    CO2_INTENSITY_YEARS.forEach((y, i) => {
      if (i > 0) expect(y).toBe(CO2_INTENSITY_YEARS[i - 1] + 1);
    });
  });

  it("Ankerwerte aus der Tabelle: 1990, 2020, 2023, 2024, 2025", () => {
    const g = (year: number) => CO2_INTENSITY_VALUES[CO2_INTENSITY_YEARS.indexOf(year)];
    expect(g(1990)).toBe(765);
    expect(g(2020)).toBe(365);
    expect(g(2023)).toBe(379);
    expect(g(2024)).toBe(353); // vorläufig
    expect(g(2025)).toBe(344); // geschätzt
  });

  it("absolute Emissionen: Ankerwerte in Mio. t", () => {
    const t = (year: number) => CO2_ABSOLUTE_VALUES[CO2_INTENSITY_YEARS.indexOf(year)];
    expect(t(1990)).toBe(367);
    expect(t(2025)).toBe(154);
  });

  it("Größenordnung bleibt plausibel (fängt Tipp-/Spaltenfehler)", () => {
    for (const v of CO2_INTENSITY_VALUES) {
      expect(v).toBeGreaterThan(200);
      expect(v).toBeLessThan(900);
    }
    // Der Emissionsfaktor ist über die Reihe deutlich gefallen — wäre die
    // falsche Tabellenspalte erwischt (z. B. THG mit Vorketten), kippt das.
    expect(CO2_INTENSITY_VALUES[CO2_INTENSITY_VALUES.length - 1]).toBeLessThan(
      CO2_INTENSITY_VALUES[0] / 2,
    );
  });

  it("Quellenangabe zeigt auf die Ausgabe, aus der die Werte stammen", () => {
    expect(CO2_INTENSITY_META.source).toContain("16/2026");
    expect(CO2_INTENSITY_META.dataAsOf).toBe("2026-03");
  });

  it("CO₂-Reihe reicht mindestens so weit wie die Erzeugungsreihe", () => {
    // Beide liegen auf derselben Seite übereinander. Hinkt die CO₂-Reihe
    // hinterher, endet die eine Kurve sichtbar früher als die andere — genau
    // das war vor dem Wechsel auf 16/2026 der Fall (Mix bis 2025, CO₂ bis 2024).
    const letztesCo2 = CO2_INTENSITY_YEARS[CO2_INTENSITY_YEARS.length - 1];
    const letzterMix = STROMMIX_HISTORY_YEARS[STROMMIX_HISTORY_YEARS.length - 1];
    expect(letztesCo2).toBeGreaterThanOrEqual(letzterMix);
  });
});
