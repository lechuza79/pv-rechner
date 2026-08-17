import { describe, it, expect } from "vitest";
import {
  fmtPvLeistung,
  fmtSpeicherKwh,
  fmtWattProKopf,
  fmtBatterieMittel,
  fmtSpeicherJeKwp,
  fmtErtragProKwp,
  fmtCo2Tonnen,
  fmtEuro,
  fmtAnteilProzent,
  anteilProzentTeile,
  fmtAnteilProzentFein,
  fmtTopProzent,
  prozentGerundet,
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

  it("schreibt Anteile als Prozent — aus dem Anteil, nicht aus der Prozentzahl", () => {
    // Die Verwechslung ist der Grund für die Funktion: Mit 0,27 gerufen käme aus
    // einer naiven Formatierung „0 %", mit 27 ein „2.700 %".
    expect(fmtAnteilProzent(0.27)).toBe("27 %");
    expect(fmtAnteilProzent(0.135)).toBe("14 %");
    expect(fmtAnteilProzent(1)).toBe("100 %");
    // Zahl und Einheit bleiben getrennt abrufbar (Kachel/Tabellenzelle).
    expect(anteilProzentTeile(0.13)).toEqual({ value: "13", unit: "%" });
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
 * Prozent ist eine Einheit wie kWp und stand trotzdem an einem Dutzend Stellen
 * von Hand neben der Zahl — jede mit ihrer eigenen Rundung. Hier steht, welche
 * Rundung wo gilt und warum sie sich unterscheiden dürfen.
 */
describe("Anteile in Prozent", () => {
  it("nimmt den Anteil, nicht die schon multiplizierte Zahl", () => {
    expect(fmtAnteilProzent(0.42)).toBe("42 %");
    expect(fmtAnteilProzent(1)).toBe("100 %");
    // Ein Solarpark in einem winzigen Ort: vierstellige Prozentwerte gibt es
    // wirklich, und auch sie bekommen den Tausenderpunkt.
    expect(fmtAnteilProzent(49.35)).toBe("4.935 %");
  });

  it("koppelt die ±0-Entscheidung an die angezeigte Stufe", () => {
    // Der Tendenz-Badge zeigt „±0 %", sobald die Anzeige 0 ist — die Prüfung
    // darf deshalb nicht auf dem Rohwert sitzen, sonst steht „+0 %" da.
    expect(prozentGerundet(0.002)).toBe(0);
    expect(fmtAnteilProzent(0.002)).toBe("0 %");
    expect(prozentGerundet(0.006)).toBe(1);
  });

  it("zeigt kleine Anteile in den Donut-Legenden mit einer Nachkommastelle", () => {
    // Unter 10 % würden 0,4 und 1,4 sonst zur selben Zahl.
    expect(fmtAnteilProzentFein(0.004)).toBe("0,4 %");
    expect(fmtAnteilProzentFein(0.05)).toBe("5,0 %");
    // Schwelle: ab 9,95 % rundet die Anzeige auf ganze Prozent (sonst stünde
    // „10,0 %" neben „10 %").
    expect(fmtAnteilProzentFein(0.0994)).toBe("9,9 %");
    expect(fmtAnteilProzentFein(0.0995)).toBe("10 %");
    expect(fmtAnteilProzentFein(0.637)).toBe("64 %");
  });

  it("rundet die Rangstufe auf — sie darf die Platzierung nicht schönen", () => {
    // Platz 3 von 200 ist 1,5 %: kaufmännisch gerundet stünde „Top 2 %" ebenso
    // da, bei Platz 2 von 200 (1 %) aber „Top 1 %" statt der erreichten Stufe.
    expect(fmtTopProzent(3 / 200)).toBe("2 %");
    expect(fmtTopProzent(2.4 / 200)).toBe("2 %");
    expect(fmtTopProzent(11 / 100)).toBe("11 %");
    // Nie „Top 0 %".
    expect(fmtTopProzent(1 / 5000)).toBe("1 %");
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

/**
 * Die Wirkungs-Spalten der Ranking-Tabelle decken vier Größenordnungen ab: eine
 * kleine Gemeinde liegt bei Hunderten Tonnen, ein Bundesland bei Millionen.
 * Ohne Staffelung wäre eine der beiden Zahlen unlesbar — und die Schwellen
 * müssen festgenagelt sein, sonst rutscht die Zuordnung still.
 */
describe("Staffelung der Wirkungs-Formatter (CO₂ und Euro)", () => {
  it("staffelt Tonnen bei 1.000 und 1 Million", () => {
    expect(fmtCo2Tonnen(812)).toBe("812 t");
    expect(fmtCo2Tonnen(999)).toBe("999 t");
    expect(fmtCo2Tonnen(1000)).toBe("1 Tsd. t");
    expect(fmtCo2Tonnen(1_000_000)).toBe("1 Mio. t");
    expect(fmtCo2Tonnen(9_800_000)).toBe("9,8 Mio. t");
  });

  it("staffelt Euro bis in die Milliarden", () => {
    expect(fmtEuro(950)).toBe("950 €");
    expect(fmtEuro(1000)).toBe("1 Tsd. €");
    expect(fmtEuro(315_000)).toBe("315 Tsd. €");
    expect(fmtEuro(3_900_000_000)).toBe("3,9 Mrd. €");
  });

  it("zeigt Nachkommastellen nur, wo sie tragen (Modellwerte, keine Scheingenauigkeit)", () => {
    // Unter 10 trägt die Stelle die Größenordnung (9,8 vs. 10) — darüber ist
    // „404,2 Tsd. t" bei einem Modellwert Scheingenauigkeit und frisst Platz.
    expect(fmtCo2Tonnen(43_100)).toBe("43 Tsd. t");
    expect(fmtCo2Tonnen(404_200)).toBe("404 Tsd. t");
    expect(fmtEuro(12_500_000)).toBe("13 Mio. €");
    expect(fmtEuro(1_200_000_000)).toBe("1,2 Mrd. €");
  });
});
