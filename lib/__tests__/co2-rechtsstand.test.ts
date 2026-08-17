import { describe, it, expect } from "vitest";
import { CO2_PRICE } from "../co2-config";

/**
 * Der Rechtsstand des CO2-Preises für 2027 — festgenagelt, weil er wandert.
 *
 * Die Kette: Koalitionsausschuss 12.05.2026 → Referentenentwurf 03.07.2026 →
 * Kabinettsbeschluss 12.08.2026 → Bundesrat (erster Durchgang, BR-Drs. 462/26,
 * zugeleitet 14.08.2026) → Bundestag → Verkündung → in Kraft. Jeder Schritt macht
 * den Satz daneben falsch, und der Satz steht sichtbar auf /datenstand.
 *
 * Am 14.08.2026 stand dort noch "Referentenentwurf 07/2026, noch nicht
 * beschlossen" — seit dem Kabinettsbeschluss zwei Tage vorher falsch. Dieser Test
 * hält den Zustand fest UND die zwei Formulierungsfehler, die in diesem Projekt
 * beim GModG und beim EEG schon je einmal passiert sind:
 *   · aus einem Einspruchsgesetz ein zustimmungsbedürftiges machen,
 *   · aus der Korridor-DECKE "den CO2-Preis" machen.
 *
 * Wer den nächsten Verfahrensschritt einträgt, ändert hier mit — das ist der Sinn.
 */
describe("CO2-Preis 2027: Rechtsstand des Dritten BEHG-Änderungsgesetzes", () => {
  it("nennt den Zustand Regierungsentwurf mit Kabinettsdatum, nicht Referentenentwurf", () => {
    expect(CO2_PRICE.source).toMatch(/Regierungsentwurf/);
    expect(CO2_PRICE.source).toMatch(/12\.08\.2026/);
    expect(CO2_PRICE.source).not.toMatch(/Referentenentwurf/);
  });

  it("sagt sichtbar, dass Bundestag und Verkündung noch ausstehen", () => {
    expect(CO2_PRICE.source).toMatch(/Bundestag/);
    expect(CO2_PRICE.source).toMatch(/steh(en|t) aus/);
  });

  it("verschärft nicht zum Zustimmungsgesetz — das BEHG-ÄndG ist ein Einspruchsgesetz", () => {
    expect(CO2_PRICE.source).not.toMatch(/zustimm/i);
  });

  it("weist die 65 €/t als Korridor-Decke aus, nicht als den CO2-Preis", () => {
    expect(CO2_PRICE.source).toMatch(/Korridor-Decke/);
    expect(CO2_PRICE.source).toMatch(/55–65/);
    // Der Wert selbst ist vom Kabinettsbeschluss unberührt geblieben.
    expect(CO2_PRICE.anchors[2026]).toBe(55);
    expect(CO2_PRICE.anchors[2027]).toBe(65);
  });

  it("prüft vor dem erwarteten Bundestagsbeschluss nach, nicht erst danach", () => {
    // Ein Satz, der "Bundestag steht aus" sagt, wird am Tag des Beschlusses
    // falsch. Der Prüftermin muss deshalb im Herbst 2026 liegen, nicht 2027.
    expect(new Date(CO2_PRICE.reviewBy).getTime()).toBeLessThan(new Date("2027-01-01").getTime());
    expect(new Date(CO2_PRICE.reviewBy).getTime()).toBeGreaterThan(new Date(CO2_PRICE.validFrom).getTime());
  });
});
