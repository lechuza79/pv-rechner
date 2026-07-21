import { describe, it, expect } from "vitest";
import { fmtPvLeistung, fmtSpeicherKwh, regionDisplayName } from "../atlas-format";

/**
 * Installierte Photovoltaik ist eine Peak-Leistung. Sechs Dateien hatten je eine
 * eigene Kopie dieses Formatters, fünf davon schrieben "kW" — die Gemeinde-Seite
 * meldete "177 kW installiert" neben einer Live-Simulation, die echte kW zeigt.
 */
describe("Einheit der installierten PV-Leistung", () => {
  it("schreibt Peak, nicht Momentanleistung", () => {
    expect(fmtPvLeistung(177)).toBe("177 kWp");
    expect(fmtPvLeistung(8_700)).toBe("8,7 MWp");
    expect(fmtPvLeistung(2_400_000)).toBe("2,4 GWp");
  });

  it("hält Speicher davon getrennt (Energie, nicht Leistung)", () => {
    expect(fmtSpeicherKwh(117)).toBe("117 kWh");
    expect(fmtSpeicherKwh(14_203)).toBe("14,2 MWh");
    expect(fmtSpeicherKwh(9_470_000)).toBe("9,5 GWh");
  });
});

/**
 * Das amtliche Verzeichnis stellt "Kreis"/"Landkreis" vor jeden Kreisnamen, auch
 * vor die 50, die die Gattung schon selbst tragen. Generisch gelöst, nicht als
 * Sonderregel für Ennepe-Ruhr: es gibt drei Bauarten von Kreisnamen.
 */
describe("Regionsname ohne doppelte Gattung", () => {
  it("entfernt die Doppelung in allen drei Bauarten", () => {
    // angehängt mit Bindestrich
    expect(regionDisplayName("Kreis Ennepe-Ruhr-Kreis")).toBe("Ennepe-Ruhr-Kreis");
    expect(regionDisplayName("Landkreis Main-Taunus-Kreis")).toBe("Main-Taunus-Kreis");
    // verschmolzen
    expect(regionDisplayName("Kreis Hochsauerlandkreis")).toBe("Hochsauerlandkreis");
    expect(regionDisplayName("Landkreis Wetteraukreis")).toBe("Wetteraukreis");
    // als eigenes Wort
    expect(regionDisplayName("Kreis Oberbergischer Kreis")).toBe("Oberbergischer Kreis");
    expect(regionDisplayName("Kreis Rhein-Kreis Neuss")).toBe("Rhein-Kreis Neuss");
    expect(regionDisplayName("Landkreis Eifelkreis Bitburg-Prüm")).toBe("Eifelkreis Bitburg-Prüm");
  });

  it("lässt Namen in Ruhe, die die Gattung nur im Präfix haben", () => {
    expect(regionDisplayName("Landkreis Rostock")).toBe("Landkreis Rostock");
    expect(regionDisplayName("Kreis Segeberg")).toBe("Kreis Segeberg");
    expect(regionDisplayName("Städteregion Aachen")).toBe("Städteregion Aachen");
    expect(regionDisplayName("Regionalverband Saarbrücken")).toBe("Regionalverband Saarbrücken");
    expect(regionDisplayName("Region Hannover")).toBe("Region Hannover");
  });

  it("fasst Gemeinden und Bundesländer nicht an", () => {
    expect(regionDisplayName("Herdecke")).toBe("Herdecke");
    expect(regionDisplayName("Wetter (Ruhr)")).toBe("Wetter (Ruhr)");
    expect(regionDisplayName("Nordrhein-Westfalen")).toBe("Nordrhein-Westfalen");
    // „Kreisfreie Stadt" ist keine vorangestellte Gattung in diesem Feld.
    expect(regionDisplayName("Goldisthal")).toBe("Goldisthal");
  });
});
