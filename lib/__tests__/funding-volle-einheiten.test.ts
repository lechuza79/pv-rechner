import { describe, it, expect } from "vitest";
import { fundingAmount, getFundingProgram } from "../funding-programs";

/**
 * „Volle Einheiten" — der Satz gilt je VOLL erreichter kWp beziehungsweise kWh.
 *
 * Röttenbach (Erlangen-Höchstadt) schreibt die Regel in seine Richtlinie und
 * rechnet sie vor: „jeweils voll erreichte kWp bzw. kWh mit je 50 €", Beispiel
 * „PV-Anlage, geplante und berechnete Leistung 9,84 kWp → davon voll erreichte
 * kWp: 9 → 9 kWp x 50 €/kWp = 450 € Förderung".
 *
 * Ohne Abrundung rechnete das Modell 492 € und wiese damit einen Zuschuss aus,
 * den die Gemeinde nicht zahlt — die teure Richtung. Der Test hält deshalb das
 * Beispiel der Richtlinie fest, nicht irgendeine Zahl.
 *
 * Die Gegenrichtung steht mit dabei: Ein Programm OHNE das Kennzeichen darf
 * nicht plötzlich abrunden — sonst zahlte jedes andere kommunale Programm des
 * Katalogs stillschweigend weniger.
 */
const anlage = (kwp: number, speicherKwh = 0) => ({
  technik: "pv" as const,
  kwp,
  speicherKwh,
  kosten: 20_000,
  wattPeak: 0,
});

describe("Zuschuss je voll erreichter Einheit", () => {
  const roettenbach = getFundingProgram("roettenbach-erh-pv-speicher")!;

  it("rechnet das Beispiel der Richtlinie nach: 9,84 kWp ergeben 450 €", () => {
    expect(fundingAmount(roettenbach, anlage(9.84)).total).toBe(450);
  });

  it("rundet auch die Speicherkapazität ab", () => {
    // 9 kWp = 450 €, 7 volle kWh von 7,5 = 350 €.
    expect(fundingAmount(roettenbach, anlage(9.84, 7.5)).total).toBe(800);
  });

  it("trifft das zweite Rechenbeispiel der Richtlinie", () => {
    // Nr. VI: 12 kWp geplant → 600 €.
    expect(fundingAmount(roettenbach, anlage(12)).total).toBe(600);
  });

  it("zahlt unterhalb einer vollen Einheit nichts", () => {
    expect(fundingAmount(roettenbach, anlage(0.8)).total).toBe(0);
  });

  it("über der Bemessungsgrenze wird GEDECKELT, nicht ausgeschlossen", () => {
    // DIESER TEST SCHRIEB DEN FEHLER FEST (gefunden vom Council am 20.09.2026).
    // Seine erste Fassung erwartete 0 € über 25 kWp — die Aussage, die die
    // Richtlinie ausdrücklich verneint: gefördert wird „unabhängig der geplanten
    // Anlagengesamtgröße", die Förderhöhe ist bei 25 kWp „gedeckelt". Er war grün
    // und hat den Fehler mit sich selbst verglichen.
    expect(fundingAmount(roettenbach, anlage(25)).total).toBe(1250);
    expect(fundingAmount(roettenbach, anlage(30)).total).toBe(1250);
    expect(fundingAmount(roettenbach, anlage(30, 30)).total).toBe(2500);
  });

  it("ohne das Kennzeichen wird NICHT abgerundet", () => {
    // Uttenreuth zahlt 50 €/kWp ohne Abrundungsregel: 4,5 kWp sind 225 €.
    const uttenreuth = getFundingProgram("uttenreuth-klimaschutz")!;
    expect(fundingAmount(uttenreuth, anlage(4.5)).total).toBe(225);
  });
});

describe("Die neuen Gemeindeprogramme im Landkreis Erlangen-Höchstadt", () => {
  it("Uttenreuth deckelt Photovoltaik bei 250 € und den Speicher bei 250 €", () => {
    const p = getFundingProgram("uttenreuth-klimaschutz")!;
    expect(fundingAmount(p, anlage(10)).total).toBe(250);
    expect(fundingAmount(p, anlage(10, 10)).total).toBe(500);
  });

  it("Buckenhof zahlt dem Balkonkraftwerk 50 € pauschal", () => {
    const p = getFundingProgram("buckenhof-klimaschutz")!;
    const balkon = { technik: "balkon" as const, kwp: 0.8, speicherKwh: 0, kosten: 600, wattPeak: 800 };
    expect(fundingAmount(p, balkon).total).toBe(50);
  });

  it("Uttenreuth hat bewusst KEINEN Balkon-Satz", () => {
    const p = getFundingProgram("uttenreuth-klimaschutz")!;
    const balkon = { technik: "balkon" as const, kwp: 0.8, speicherKwh: 0, kosten: 600, wattPeak: 800 };
    expect(fundingAmount(p, balkon).computable).toBe(false);
  });

  it("Spardorf informiert, rechnet aber nicht — die Notstromfähigkeit kennt der Rechner nicht", () => {
    const p = getFundingProgram("spardorf-solar")!;
    expect(fundingAmount(p, anlage(8, 8)).computable).toBe(false);
  });

  it("Röttenbach schließt das Balkonkraftwerk aus", () => {
    const p = getFundingProgram("roettenbach-erh-pv-speicher")!;
    const balkon = { technik: "balkon" as const, kwp: 0.8, speicherKwh: 0, kosten: 600, wattPeak: 800 };
    expect(fundingAmount(p, balkon).computable).toBe(false);
  });
});
