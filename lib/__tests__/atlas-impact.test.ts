import { describe, it, expect } from "vitest";
import {
  ATLAS_GRID_CO2,
  PRAXIS_FAKTOR,
  co2Tonnen,
  defaultStromwertCt,
  ertragForRegionId,
  erzeugungKwh,
  stromwertEuro,
} from "../atlas-impact";
import { BL_ERTRAG } from "../bundesland-ertrag";
import { NATIONAL_AVG_YIELD } from "../constants";
import { DEFAULT_PRICES } from "../prices-config";
import { DEFAULT_FEED_IN } from "../feedin-config";

/**
 * Die Wirkungs-Werte des Atlas (CO₂-Ersparnis, Stromwert) sind Modellwerte aus
 * der geteilten Rechen-Basis. Diese Tests sind Realitäts-Anker, keine Spiegel
 * der Implementierung: sie prüfen gegen unabhängig bekannte Bänder.
 */
describe("Bundesland-Ertrag je Region", () => {
  it("ordnet den amtlichen Gemeindeschlüssel dem richtigen Bundesland zu", () => {
    // München (09…) liegt in Bayern, Kiel (01…) in Schleswig-Holstein — der
    // Nord-Süd-Gradient ist der Grund, warum die Spalten überhaupt regional
    // rechnen statt mit einem Bundesschnitt.
    expect(ertragForRegionId("09162000")).toBe(BL_ERTRAG.BY);
    expect(ertragForRegionId("01002000")).toBe(BL_ERTRAG.SH);
    // Bundesland-Zeilen der Deutschland-Seite tragen zweistellige Schlüssel.
    expect(ertragForRegionId("08")).toBe(BL_ERTRAG.BW);
  });

  it("fällt bei unbekanntem Schlüssel auf den Bundesschnitt zurück", () => {
    expect(ertragForRegionId("")).toBe(NATIONAL_AVG_YIELD);
    expect(ertragForRegionId("99999999")).toBe(NATIONAL_AVG_YIELD);
  });

  it("liegt überall im plausiblen deutschen Ertragsband", () => {
    // PVGIS-Bundesland-Schnitte: kein deutsches Bundesland liegt unter ~950
    // oder über ~1.150 kWh je kWp und Jahr (optimale Ausrichtung).
    for (const ertrag of Object.values(BL_ERTRAG)) {
      expect(ertrag).toBeGreaterThan(950);
      expect(ertrag).toBeLessThan(1150);
    }
  });
});

describe("Flotten-Kalibrierung (Realitäts-Anker)", () => {
  it("trifft die gemessene Erzeugung des deutschen Bestands 2025", () => {
    // Fraunhofer ISE, Jahresbilanz 2025: im Jahresmittel ~108,7 GW installierte
    // Leistung erzeugten ~87 TWh (Netz + Eigenverbrauch). Ein Modell, das den
    // Bestand mit Optimal-Erträgen rechnet, läge bei ~137 TWh — der Test
    // schlägt an, wenn diese Fehlerklasse zurückkommt.
    const twh = erzeugungKwh(108_700_000, "") / 1_000_000_000;
    expect(twh).toBeGreaterThan(82);
    expect(twh).toBeLessThan(92);
  });

  it("hält den Praxis-Faktor im plausiblen Band realer Anlagenflotten", () => {
    // Reale Dächer (gemischte Ausrichtung, Verschattung, Degradation) liegen
    // bekanntermaßen 20–30 % unter dem Optimal-Ertrag.
    expect(PRAXIS_FAKTOR).toBeGreaterThan(0.68);
    expect(PRAXIS_FAKTOR).toBeLessThan(0.85);
  });
});

describe("CO₂-Ersparnis (Realitäts-Anker)", () => {
  it("rechnet eine typische 10-kWp-Anlage in Bayern auf 2,5 bis 4,5 Tonnen im Jahr", () => {
    // Bekanntes Band: ~8.000–9.500 kWh Praxis-Erzeugung × ~0,4 kg/kWh ≈ 3–4 t.
    const t = co2Tonnen(erzeugungKwh(10, "09162000"));
    expect(t).toBeGreaterThan(2.5);
    expect(t).toBeLessThan(4.5);
  });

  it("nutzt denselben CO₂-Faktor wie die übrigen Rechner", () => {
    // Geteilte Rechen-Basis: weicht der Atlas ab, widersprechen sich zwei
    // Seiten desselben Projekts. 0,3–0,5 kg/kWh ist das UBA-Band der letzten Jahre.
    expect(ATLAS_GRID_CO2).toBeGreaterThan(0.3);
    expect(ATLAS_GRID_CO2).toBeLessThan(0.5);
  });
});

describe("Stromwert (Realitäts-Anker)", () => {
  it("liegt mit dem Default zwischen Einspeisevergütung und Haushaltsstrompreis", () => {
    // Der Mischwert kann logisch nur zwischen seinen beiden Bestandteilen
    // liegen — sonst ist die Gewichtung kaputt.
    const ct = defaultStromwertCt();
    expect(ct).toBeGreaterThan(DEFAULT_FEED_IN.teilUnder10);
    expect(ct).toBeLessThan(DEFAULT_PRICES.electricityPrice * 100);
  });

  it("bewertet 1.000 kWh zu 15 ct mit 150 €", () => {
    expect(stromwertEuro(1000, 15)).toBe(150);
  });
});
