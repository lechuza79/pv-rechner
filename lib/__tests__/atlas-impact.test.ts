import { describe, it, expect } from "vitest";
import {
  ATLAS_GRID_CO2,
  EIGENVERBRAUCH_ANTEIL_ANNAHME,
  PRAXIS_FAKTOR,
  balkonEigenverbrauchAnteil,
  co2Tonnen,
  ertragForRegionId,
  erzeugungKwh,
  segmentWertEuro,
  stromwertEuro,
  stromwertSaetze,
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
    // Bestand mit Optimal-Erträgen rechnet (108,7 GW × ~1.050 kWh/kWp
    // Bundesschnitt), läge bei ~114 TWh statt 87 — rund ein Drittel zu hoch.
    // Eine frühere Fassung dieses Kommentars behauptete hier 137 TWh; die Zahl
    // war falsch und wäre beim nächsten Nachrechnen als Beleg weitergereicht
    // worden. Der Test
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

describe("Stromwert je Anlagenart (Realitäts-Anker)", () => {
  it("bewertet ein privates Dach zwischen Einspeisevergütung und Haushaltsstrompreis", () => {
    // Der Mischwert kann logisch nur zwischen seinen beiden Bestandteilen
    // liegen — sonst ist die Gewichtung kaputt.
    const ct = stromwertSaetze().privat_dach.ct;
    expect(ct).toBeGreaterThan(DEFAULT_FEED_IN.teilUnder10);
    expect(ct).toBeLessThan(DEFAULT_PRICES.electricityPrice * 100);
  });

  it("hält die Rangfolge der Anlagenarten ein", () => {
    // Der Grund für die ganze Aufteilung: Eine selbst genutzte Kilowattstunde
    // ersetzt teuren Netzbezug, eine verkaufte bringt nur den Börsenwert.
    // Kippt diese Reihenfolge, rechnet die Tabelle etwas anderes, als sie sagt.
    //
    // Das Balkongerät steht bewusst GANZ OBEN, auch wenn es keinen Cent
    // Vergütung bekommt: Es ist so klein, dass der Haushalt fast zwei Drittel
    // seines Ertrags direkt verbraucht, und jede dieser Kilowattstunden ist den
    // vollen Haushaltsstrompreis wert. Die Dachanlage speist dagegen zwei
    // Drittel für rund ein Viertel dieses Preises ein. Eine frühere Fassung
    // hatte die beiden andersherum erwartet, weil sie dem Balkon den
    // Eigenverbrauchsanteil einer Dachanlage unterschob.
    const s = stromwertSaetze();
    expect(s.steckersolar.ct).toBeGreaterThan(s.privat_dach.ct);
    expect(s.privat_dach.ct).toBeGreaterThan(s.gewerbe_dach.ct);
    expect(s.gewerbe_dach.ct).toBeGreaterThan(s.freiflaeche.ct);
  });

  it("leitet den Balkon-Eigenverbrauch aus der Simulation ab, nicht vom Dach", () => {
    // Ein Steckersolargerät gegen die Grundlast eines Haushalts deckt einen
    // weit größeren Teil selbst als eine Dachanlage — bekanntes Band grob
    // 50–80 %. Läge der Wert beim Dach-Anteil, wäre die Simulation umgangen.
    const anteil = balkonEigenverbrauchAnteil();
    expect(anteil).toBeGreaterThan(0.5);
    expect(anteil).toBeLessThan(0.8);
    expect(anteil).toBeGreaterThan(EIGENVERBRAUCH_ANTEIL_ANNAHME * 1.5);
  });

  it("bleibt für jede Anlagenart im plausiblen Erlösband", () => {
    // Keine Anlagenart erlöst mehr als den Haushaltsstrompreis (mehr als den
    // teuersten vermiedenen Bezug kann eine kWh nicht wert sein) und keine
    // weniger als null.
    for (const satz of Object.values(stromwertSaetze())) {
      expect(satz.ct).toBeGreaterThan(0);
      expect(satz.ct).toBeLessThanOrEqual(DEFAULT_PRICES.electricityPrice * 100);
      expect(satz.herkunft.length).toBeGreaterThan(10);
    }
  });

  it("bewertet 1.000 kWh zu 15 ct mit 150 €", () => {
    expect(stromwertEuro(1000, 15)).toBe(150);
  });

  it("bewertet dieselbe Leistung je nach Anlagenart verschieden", () => {
    // Genau das konnte der frühere Einheitssatz nicht: Ein Freiflächen-Park
    // und ein privates Dach gleicher Größe standen mit demselben Betrag da.
    const dach = segmentWertEuro(1000, "09162000", "privat_dach");
    const frei = segmentWertEuro(1000, "09162000", "freiflaeche");
    expect(dach).toBeGreaterThan(frei * 2);
  });
});
