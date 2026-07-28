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
// 16/2026 (geprüft 27.07.2026, Volltext docs/quellen/) haben sich 14 Altwerte
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

  // REALITÄTS-ANKER für die Selbstheilung (Wächter-Gate Regel 7). Bewusst OHNE
  // Werte aus einer bestimmten Ausgabe: Der Wächter darf die Reihen ersetzen, also
  // wäre ein Test, der die aktuellen Zahlen wiederholt, zirkulär — er würde
  // mitwandern und nichts mehr halten. Dieser hier gilt ausgabenunabhängig.
  //
  // Physik statt Zahlenvergleich: Beide Reihen stammen aus derselben Tabellenzeile
  // und hängen über den Stromverbrauch zusammen.
  //     absolute [Mio t] = Intensität [g/kWh] × Verbrauch [TWh] / 1000
  // Der implizite Verbrauch muss also im realen deutschen Korridor liegen. Greift
  // der Automat bei EINER der beiden Reihen grob daneben, verlässt er ihn.
  //
  // EHRLICHE GRENZE — hier nicht aufweichen, sondern kennen: Der Test fängt nur den
  // groben Fehlgriff. Gemessen an den 1990er-Werten der Tabelle ergibt
  //   Emissionsfaktor Strommix (richtig) 479,7 TWh
  //   Inlandsverbrauch                   480,4 TWh   ← rutscht durch
  //   THG ohne Vorketten                 476,0 TWh   ← rutscht durch
  //   THG mit Vorketten                  425,8 TWh   ← wird erkannt
  // Die beiden Nachbarspalten sind mechanisch NICHT unterscheidbar. Sie abzufangen
  // ist ausdrücklich Aufgabe des Councils, der die Spaltenüberschrift im PDF liest
  // (scripts/strommix-reihen-verify.md, Teil C).
  it("Anker: impliziter Stromverbrauch bleibt im realen Korridor", () => {
    CO2_INTENSITY_YEARS.forEach((jahr, i) => {
      const twh = (CO2_ABSOLUTE_VALUES[i] * 1000) / CO2_INTENSITY_VALUES[i];
      expect(twh, `${jahr}: impliziter Stromverbrauch ${twh.toFixed(0)} TWh`).toBeGreaterThan(400);
      expect(twh, `${jahr}: impliziter Stromverbrauch ${twh.toFixed(0)} TWh`).toBeLessThan(650);
    });
  });

  it("Anker: beide Reihen fallen gemeinsam (gleiche Tabellenzeile, gleiche Richtung)", () => {
    // Steigt die eine Reihe über die Zeit, während die andere fällt, wurden zwei
    // Spalten aus verschiedenen Zusammenhängen gepaart.
    const erstesDrittel = (a: number[]) => a.slice(0, 8).reduce((x, y) => x + y, 0) / 8;
    const letztesDrittel = (a: number[]) => a.slice(-8).reduce((x, y) => x + y, 0) / 8;
    expect(letztesDrittel(CO2_INTENSITY_VALUES)).toBeLessThan(erstesDrittel(CO2_INTENSITY_VALUES));
    expect(letztesDrittel(CO2_ABSOLUTE_VALUES)).toBeLessThan(erstesDrittel(CO2_ABSOLUTE_VALUES));
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
