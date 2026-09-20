import { describe, expect, it } from "vitest";
import { FUNDING_PROGRAMS, fundingAmount } from "../funding-programs";

/**
 * Eine Ausschlussgrenze ist kein Deckel. Neustadt (Wied) fördert bis 15 kWp und
 * 15 kWh und schließt Anlagen über 30 kWp bzw. Speicher über 30 kWh GANZ aus
 * (Richtlinie 2026, Nr. 2.3/2.4, gelesen 18.09.2026). Der Rechner erlaubt bis
 * 50 kWp — ohne `pvMax` hätte er einer 35-kWp-Anlage den vollen Höchstbetrag
 * abgezogen.
 */
describe("Ausschlussgrenze der Anlage", () => {
  const p = FUNDING_PROGRAMS["neustadt-wied-pv-speicher"];
  const pv = (kwp: number, speicherKwh: number) => ({ technik: "pv", kwp, speicherKwh, kosten: 30000 }) as const;

  it("rechnet bis zur Grenze nach Satz und Deckel", () => {
    expect(fundingAmount(p, pv(10, 10)).total).toBe(1000 + 1300);
    expect(fundingAmount(p, pv(20, 20)).total).toBe(1500 + 1950);
    // Genau an der Grenze wird noch gefördert — ausgeschlossen ist „größer als 30".
    expect(fundingAmount(p, pv(30, 30)).total).toBe(1500 + 1950);
  });

  it("zahlt über der Grenze für diesen Teil nichts", () => {
    expect(fundingAmount(p, pv(35, 10)).total).toBe(1300);

  });

  it("fördert die Dachanlage nur mit Speicher, den Speicher auch allein", () => {
    expect(fundingAmount(p, pv(10, 0)).total).toBe(0);
    // Ein ausgeschlossener Speicher (über 30 kWh) trägt die Bedingung
    // „nur mit Speicher" nicht — sichere Richtung: auch die Anlage zahlt nichts.
    expect(fundingAmount(p, pv(10, 35)).total).toBe(0);
  });
});
