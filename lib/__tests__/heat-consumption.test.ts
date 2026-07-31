import { describe, it, expect } from "vitest";
import { preboundAnteil, verbrauchAusBedarf, waermeAusEndenergie, endenergieAusWaerme, OEL_KWH_PRO_LITER } from "../heat-consumption";
import { calcHeatDemand, calcHeatLoad, verbrauchSpecKwh } from "../heatpump-core";
import { INSULATION_BESTAND, INSULATION_NEUBAU } from "../constants";
import { DEFAULT_HEATPUMP_CONFIG as CFG } from "../heatpump-config";

// ─── Warum es diese Datei gibt ──────────────────────────────────────────────
// Der Rechner unterstellte einem unsanierten Altbau rund 250 kWh/m²·a Gasverbrauch
// — real sind es 160–200. Zwei Monate lang fiel das niemandem auf, obwohl über 850
// Tests liefen: Sie prüften die Rechnung gegen sich selbst („Fläche × Kennwert"),
// nie gegen die Wirklichkeit. Gefunden hat es ein Nutzer auf Reddit, der seine
// eigene Gasrechnung danebengelegt hat (31.07.2026).
//
// Deshalb prüft diese Datei NICHT, ob wir richtig multiplizieren, sondern ob am
// Ende eine Zahl steht, die ein Hausbesitzer auf seiner Abrechnung wiedererkennt.
// Die Bänder unten kommen aus Verbrauchsstatistik, nicht aus unserem Modell — wer
// sie anpasst, muss eine Quelle nennen, nicht eine Rechnung.

describe("Prebound-Kurve: die publizierten Stützstellen", () => {
  // Sunikka-Blank/Galvin (2012), Building Research & Information 40(3), 260–273,
  // 3.400 deutsche Wohnungen. Werte nach der Darstellung der Universität Cambridge.
  it("trifft die veröffentlichten Punkte", () => {
    expect(preboundAnteil(150)).toBeCloseTo(0.17, 2);   // 17 % bei 150 kWh/m²a
    expect(preboundAnteil(300)).toBeCloseTo(0.40, 2);   // 40 % bei 300 kWh/m²a
  });

  it("reproduziert den Mittelwert der Studie: berechnet 225 → gemessen ~150", () => {
    expect(verbrauchAusBedarf(225)).toBeCloseTo(157.5, 0);
    expect(preboundAnteil(225)).toBeCloseTo(0.30, 2);
  });

  it("wächst monoton mit dem Kennwert und bleibt in [0,1)", () => {
    let vorher = -1;
    for (const b of [0, 50, 100, 150, 200, 250, 300, 400, 500, 800]) {
      const a = preboundAnteil(b);
      expect(a).toBeGreaterThanOrEqual(vorher);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(1);
      vorher = a;
    }
  });

  it("deckelt oberhalb der obersten Stützstelle statt zu extrapolieren", () => {
    // Sonst liefe der Anteil bei extremen Kennwerten über 100 % und der Verbrauch
    // würde negativ — eine Extrapolation, die die Studie nicht deckt.
    expect(preboundAnteil(5000)).toBe(preboundAnteil(500));
  });

  it("lässt einen bereits gemessenen Kennwert unangetastet", () => {
    expect(verbrauchAusBedarf(70, "verbrauch")).toBe(70);
    expect(verbrauchAusBedarf(70, "bedarf")).toBeLessThan(70);
  });
});

// ─── DER REALITÄTS-ANKER ────────────────────────────────────────────────────
describe("Realitäts-Anker: rechnet der Rechner einen Verbrauch, den es wirklich gibt?", () => {
  // Bänder für den END-ENERGIE-Verbrauch (das, was der Gaszähler zählt) in
  // kWh/m²·a, inklusive Warmwasser — also genau die Kennzahl, die ein Hausbesitzer
  // aus Jahresrechnung ÷ Wohnfläche selbst ausrechnen kann.
  // Quellen: Sunikka-Blank/Galvin 2012 (gemessener Bestandsschnitt ~150 kWh/m²a bei
  // 225 berechnet); Verbrauchsstatistik Einfamilienhaus: Bundesschnitt ~140–160
  // inkl. Warmwasser, ungedämmte Altbauten der 50er/60er 160–200, moderne gut
  // gedämmte Neubauten 60–100 kWh/m²·a.
  const BAENDER: Record<string, [number, number]> = {
    "Unsaniert":   [140, 200],
    "Teilsaniert": [110, 170],
    "Gut saniert": [ 70, 125],
    "Vollsaniert": [ 55, 105],
  };

  const WOHNFLAECHE = 140;   // typisches EFH
  const PERSONEN = 3;

  for (const [i, stufe] of INSULATION_BESTAND.entries()) {
    const band = BAENDER[stufe.label];
    if (!band) continue;
    it(`„${stufe.label}" landet bei ${band[0]}–${band[1]} kWh/m²·a Endenergie`, () => {
      const { qGes } = calcHeatDemand("bestand", WOHNFLAECHE, i, PERSONEN);
      const endenergie = endenergieAusWaerme(qGes, CFG.gasEfficiency);
      const proM2 = endenergie / WOHNFLAECHE;
      expect(proM2).toBeGreaterThanOrEqual(band[0]);
      expect(proM2).toBeLessThanOrEqual(band[1]);
    });
  }

  it("ein unsaniertes 130-m²-EFH verbraucht keine 30.000 kWh Gas im Jahr", () => {
    // Der konkrete Fall aus der Nutzerkritik: Vorher stand hier ein Wert über
    // 30.000 kWh — mehr als das Doppelte dessen, was ein solcher Haushalt zahlt.
    const { qGes } = calcHeatDemand("bestand", 130, 0, 3.5);
    const gasKwh = endenergieAusWaerme(qGes, CFG.gasEfficiency);
    expect(gasKwh).toBeLessThan(26000);
    expect(gasKwh).toBeGreaterThan(15000);  // und auch nicht unrealistisch niedrig
  });

  it("bleibt über alle Stufen monoton fallend", () => {
    let vorher = Infinity;
    for (let i = 0; i < INSULATION_BESTAND.length; i++) {
      const proM2 = calcHeatDemand("bestand", WOHNFLAECHE, i, PERSONEN).qGes / WOHNFLAECHE;
      expect(proM2).toBeLessThan(vorher);
      vorher = proM2;
    }
  });

  it("Neubau bleibt unter der besten Bestandsstufe", () => {
    const besterBestand = calcHeatDemand("bestand", WOHNFLAECHE, INSULATION_BESTAND.length - 1, PERSONEN).qGes;
    const neubau = calcHeatDemand("neubau", WOHNFLAECHE, INSULATION_NEUBAU.length - 1, PERSONEN).qGes;
    expect(neubau).toBeLessThan(besterBestand);
  });
});

describe("Was NICHT korrigiert werden darf", () => {
  it("die Heizlast bleibt die Norm-Größe (sonst wird die Anlage zu klein)", () => {
    // Die Wärmepumpe muss das Haus am kältesten Tag warm bekommen — auch wenn seine
    // Bewohner übers Jahr sparsam heizen. Würde die Prebound-Korrektur hier greifen,
    // käme eine unterdimensionierte und im Betrieb teurere Anlage heraus.
    for (let i = 0; i < INSULATION_BESTAND.length; i++) {
      const erwartet = Math.round((140 * INSULATION_BESTAND[i].heatLoadW) / 1000 * 10) / 10;
      expect(calcHeatLoad("bestand", 140, i, 1)).toBe(erwartet);
    }
  });

  it("Warmwasser hängt an den Personen, nicht am Gebäude", () => {
    for (let i = 0; i < INSULATION_BESTAND.length; i++) {
      expect(calcHeatDemand("bestand", 140, i, 4).qWw).toBe(4 * CFG.wwPerPerson);
    }
  });

  it("die Tabellenwerte selbst bleiben Norm-Bedarf (Quellenangabe bleibt wahr)", () => {
    // Die Korrektur ist eine Schicht darüber, kein Überschreiben. Wer die
    // Konstanten liest, bekommt weiter die belegten dena-/DIN-Werte.
    expect(INSULATION_BESTAND[0].specKwh).toBe(220);
    expect(verbrauchSpecKwh("bestand", 0)).toBeLessThan(220);
  });
});

describe("Abrechnung → Rechnung (die Verbrauchseingabe)", () => {
  it("rechnet abgelesene Endenergie in Heizwärme um und wieder zurück", () => {
    const gemessen = 20000;
    const waerme = waermeAusEndenergie(gemessen, 0.95);
    expect(waerme).toBeCloseTo(19000, 0);
    expect(endenergieAusWaerme(waerme, 0.95)).toBeCloseTo(gemessen, 0);
  });

  it("fängt einen unsinnigen Wirkungsgrad ab, statt durch null zu teilen", () => {
    expect(Number.isFinite(endenergieAusWaerme(10000, 0))).toBe(true);
    expect(waermeAusEndenergie(10000, 5)).toBe(10000);   // nie mehr Wärme als Brennstoff
  });

  it("rechnet Heizöl-Liter in Kilowattstunden", () => {
    expect(2000 * OEL_KWH_PRO_LITER).toBe(20000);
  });
});
