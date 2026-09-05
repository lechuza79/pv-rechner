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

  it("nimmt eine ausschließende Grenze wörtlich", () => {
    // Lohfelden fördert Anlagen „mit mehr als 2000 Wp Leistung" — genau 2,0 kWp
    // ist damit NICHT gefördert. `pvMin` kennt nur einschließende Grenzen, also
    // steht dort 2.001 und nicht 2. Beide Zeilen sind der Grund für die Zahl:
    // Wer sie auf 2 rundet, macht die erste rot.
    const lohfelden = FUNDING_PROGRAMS["lohfelden-100-daecher"];
    expect(fundingAmount(lohfelden, pv(2, 0, 8000)).total).toBe(0);
    expect(fundingAmount(lohfelden, pv(2.5, 0, 8000)).total).toBe(800);
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
    //
    // ERWEITERT AM 28.08.2026, nachdem genau das passiert war: Lohfelden setzt
    // „eine PV-Anlage mit mehr als 2000 Wp Leistung" voraus und hatte kein
    // `pvMin`. Die erste Fassung sah es aus zwei Gründen nicht — sie kannte nur
    // die Einheit kWp, und sie verlangte eines von vier Signalwörtern, von denen
    // die Gemeinde keines benutzt. Ein Wächter, der nichts sieht und trotzdem
    // grün meldet, ist schlimmer als keiner: Der Fehler stand vier Tage nach dem
    // Einbau der Grenze weiter im Katalog, mit grünem Test daneben.
    //
    // Beide Einheiten, und die Untergrenze wird an ihrem WORTLAUT erkannt, nicht
    // an einer Liste von Signalwörtern. „größer als" steht bewusst NICHT dabei:
    // Schiltach sagt „Die Anlage darf größer als 10 kWp sein; bezuschusst werden
    // nur die ersten 10 kWp" — das ist eine Obergrenze, und sie hier zu melden
    // würde den Test zum Rauschen machen.
    const muster =
      /(?:mindestens|ab|von|mehr als)\s*([0-9]+(?:[.,][0-9]+)?)\s*k?Wp/i;
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
        (t) =>
          muster.test(t) &&
          /mindest|mehr als|nicht gefördert|nicht förderfähig|Voraussetzung/i.test(t),
      );
      if (treffer.length) fehlend.push(`${p.id}: ${treffer[0]}`);
    }
    expect(fehlend).toEqual([]);
  });
});

// ─── Dachanlage nur mit Speicher (Council 05.09.2026) ────────────────────────
//
// Mühlhausen an der Sulz zahlt die Dach-Staffel nur zusammen mit einem Speicher.
// Im Code stand dafür `speicherMin: 1` mit dem Kommentar, ohne Speicher greife
// keine Stufe — das Feld wirkt aber nur im Speicher-Zweig, und dieses Programm
// hat keinen: 8 kWp ohne Speicher zogen 1.000 € ab, 25 kWp 1.500 €. Ein Test
// prüfte nur `pvMin`. Dieselbe Klasse wie die Mindestleistung darüber: Die
// Bedingung stand im Text und fehlte in der Rechnung.
describe("Dachanlage nur zusammen mit Speicher", () => {
  const pv = (kwp: number, speicherKwh = 0, kosten = 20000) =>
    ({ technik: "pv", kwp, speicherKwh, kosten }) as const;
  const muehlhausen = FUNDING_PROGRAMS["muehlhausen-sulz-pv"];

  it("zahlt ohne Speicher nichts für die Dachanlage — der Betrag ist bekannt, er ist null", () => {
    expect(muehlhausen.pvNurMitSpeicher).toBe(true);
    for (const kwp of [8, 15, 25]) {
      const r = fundingAmount(muehlhausen, pv(kwp, 0));
      expect(r.total).toBe(0);
      expect(r.computable).toBe(true);
    }
  });

  it("zahlt mit Speicher die Staffel", () => {
    expect(fundingAmount(muehlhausen, pv(8, 5)).total).toBe(1000);
    expect(fundingAmount(muehlhausen, pv(15, 5)).total).toBe(1250);
    expect(fundingAmount(muehlhausen, pv(25, 10)).total).toBe(1500);
  });

  it("wer die Speicherpflicht in den Bedingungstext schreibt, setzt sie auch in der Rechnung", () => {
    // Die Gegenrichtung — ein neues Programm mit demselben Satz im Text und ohne
    // das Feld baut den Fehler neu.
    for (const p of Object.values(FUNDING_PROGRAMS)) {
      if (!p.pvTiers && !p.pvPerKwp) continue;
      const text = (p.conditions ?? []).map(bedingungText).join(" ");
      if (/Dachanlage[^.]*nur (zusammen|gemeinsam) mit[^.]*Speicher/i.test(text)) {
        expect(p.pvNurMitSpeicher, p.id).toBe(true);
      }
    }
  });
});
