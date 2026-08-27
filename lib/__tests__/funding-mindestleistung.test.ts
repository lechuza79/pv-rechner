import { describe, expect, it } from "vitest";
import {
  FUNDING_PROGRAMS,
  bedingungText,
  fundingAmount,
  type FundingProgram,
} from "../funding-programs";

/**
 * Die Mindestleistung einer Dachanlage — die Bedingung, die im Text stand und in
 * der Rechnung fehlte.
 *
 * GEMESSEN AM 27.08.2026: Drei Programme mit Rechenwert setzen eine
 * Mindestleistung voraus (Nidda 4 kWp, Köln 2 kWp, Mühlhausen an der Sulz
 * 5 kWp). Bei Nidda stand sie sogar wörtlich in den Bedingungen — „Die Anlage
 * muss mindestens 4 kWp leisten — kleinere Dachanlagen werden nicht gefördert" —
 * und derselbe Eintrag zog für eine 3-kWp-Anlage 300 € ab. Von außen unsichtbar:
 * Die Karte sieht normal aus, der Betrag ist plausibel, und niemand vergleicht
 * ihn mit dem Bedingungstext zwei Zeilen darunter.
 *
 * Die zweite Richtung ist die wichtigere: Wer künftig eine Untergrenze in den
 * Bedingungstext schreibt, ohne `pvMin` zu setzen, baut denselben Fehler neu.
 */
describe("Mindestleistung der Dachanlage", () => {
  const pv = (kwp: number, speicherKwh = 0, kosten = 15000) =>
    ({ technik: "pv", kwp, speicherKwh, kosten }) as const;

  it("zahlt unterhalb der Mindestleistung nichts für die Anlage", () => {
    const nidda = FUNDING_PROGRAMS["nidda-solar"];
    expect(nidda.pvMin).toBe(4);
    // 3 kWp: unter der Grenze, obwohl der Satz je kWp 300 € ergäbe.
    expect(fundingAmount(nidda, pv(3)).total).toBe(0);
    // 4 kWp: die Grenze selbst ist eingeschlossen ("mindestens 4 kWp").
    expect(fundingAmount(nidda, pv(4)).total).toBe(400);
  });

  it("greift auch bei Staffel-Pauschalen", () => {
    const koeln = FUNDING_PROGRAMS["koeln-pv"];
    expect(fundingAmount(koeln, pv(1.5)).total).toBe(0);
    expect(fundingAmount(koeln, pv(2)).total).toBe(1500);

    const muehlhausen = FUNDING_PROGRAMS["muehlhausen-sulz-pv"];
    // Mühlhausen fördert die Dachanlage nur mit Speicher — deshalb hier einer.
    expect(fundingAmount(muehlhausen, pv(4, 5)).total).toBe(0);
    expect(fundingAmount(muehlhausen, pv(5, 5)).total).toBe(1000);
  });

  it("nennt den Betrag null, statt ihn für unbestimmbar zu erklären", () => {
    // "0 €" und "lässt sich nicht berechnen" sind zwei verschiedene Aussagen, und
    // die Karte zeigt sie verschieden an. Unter der Grenze ist der Betrag bekannt.
    const ergebnis = fundingAmount(FUNDING_PROGRAMS["nidda-solar"], pv(3));
    expect(ergebnis.computable).toBe(true);
    expect(ergebnis.total).toBe(0);
  });

  it("lässt den Speicherzuschuss unberührt", () => {
    // Bewusst so: Dass die Untergrenze der Anlage auch den Speicher ausschließt,
    // ist naheliegend und steht in keiner der drei Richtlinien (Gate-Regel 8).
    const nidda = FUNDING_PROGRAMS["nidda-solar"];
    expect(fundingAmount(nidda, pv(3, 6)).total).toBe(300); // 6 kWh × 50 €
  });

  it("hat für jede Untergrenze im Bedingungstext auch einen Rechenwert", () => {
    // Die Gegenrichtung — ohne sie wächst die Lücke beim nächsten Eintrag weiter.
    const muster = /(?:mindestens|ab|von)\s*([0-9]+(?:[.,][0-9]+)?)\s*kWp/i;
    const rechnet = (p: FundingProgram) =>
      !!(p.pvTiers || p.pvPerKwp || p.percentOfCost);

    const fehlend: string[] = [];
    for (const p of Object.values(FUNDING_PROGRAMS)) {
      if (!rechnet(p) || p.pvMin !== undefined) continue;
      const texte = [
        p.coveredCosts ?? "",
        ...(p.rates ?? []).map((r) => `${r.label} ${r.value}`),
        ...(p.conditions ?? []).map(bedingungText),
      ];
      // Eine Staffel nennt ihre Stufen ebenfalls mit "ab" — die ist keine
      // Untergrenze. Es zählt nur, was ausdrücklich eine Bedingung ist.
      const treffer = texte.filter(
        (t) => muster.test(t) && /mindest|nicht gefördert|nicht förderfähig|Voraussetzung/i.test(t),
      );
      if (treffer.length) fehlend.push(`${p.id}: ${treffer[0]}`);
    }
    expect(fehlend).toEqual([]);
  });
});
