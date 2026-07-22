import { describe, it, expect } from "vitest";
import {
  fmtPvLeistung,
  fmtSpeicherKwh,
  fmtWattProKopf,
  fmtBatterieMittel,
  fmtSpeicherJeKwp,
  fmtErtragProKwp,
  regionDisplayName,
} from "../atlas-format";

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

  it("schaltet die Größenordnung genau bei 1.000 um", () => {
    expect(fmtPvLeistung(999)).toBe("999 kWp");
    expect(fmtPvLeistung(1000)).toBe("1 MWp");
    expect(fmtPvLeistung(999_999)).toBe("1.000 MWp");
    expect(fmtPvLeistung(1_000_000)).toBe("1 GWp");
  });

  it("hält Speicher davon getrennt (Energie, nicht Leistung)", () => {
    expect(fmtSpeicherKwh(117)).toBe("117 kWh");
    expect(fmtSpeicherKwh(999)).toBe("999 kWh");
    expect(fmtSpeicherKwh(1000)).toBe("1 MWh");
    expect(fmtSpeicherKwh(14_203)).toBe("14,2 MWh");
    expect(fmtSpeicherKwh(1_000_000)).toBe("1 GWh");
    expect(fmtSpeicherKwh(9_470_000)).toBe("9,5 GWh");
  });

  it("schreibt auch die Pro-Kopf-Leistung als Peak", () => {
    // Installierte Leistung geteilt durch Einwohner bleibt Peak-Leistung.
    expect(fmtWattProKopf(526)).toBe("526 Wp");
    expect(fmtWattProKopf(1234)).toBe("1.234 Wp");
  });

  it("zeigt die mittlere Batteriegröße mit einer Nachkommastelle", () => {
    // 8,7 und 9,4 kWh sind verschiedene Speicher — gerundet wären beide "9".
    expect(fmtBatterieMittel(8.72)).toBe("8,7 kWh");
    expect(fmtBatterieMittel(583.05)).toBe("583,1 kWh");
  });

  it("benennt die zusammengesetzten Einheiten vollständig", () => {
    expect(fmtSpeicherJeKwp(1.639)).toBe("1,64 kWh je kWp Dach");
    expect(fmtErtragProKwp(1030.4)).toBe("1.030 kWh/kWp");
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
