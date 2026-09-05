import { describe, it, expect } from "vitest";
import { FUNDING_PROGRAMS, bedingungText } from "../funding-programs";

/**
 * Ein Ding, ein Wort.
 *
 * Gemessen am 26.08.2026 trug der Katalog NEUNUNDDREISSIG verschiedene
 * Bezeichnungen für dieselbe Sache: „Balkonkraftwerk" (18×), daneben
 * „Steckersolargerät", „Mini-PV-Anlage", „Balkonmodul", „Stecker-PV-Gerät",
 * „Balkonsolarkraftwerk" und weitere. Jede stammt von der Amtsseite, auf der
 * sie stand — und genau das ist der Fehler: Was das Amt schreibt, ist die
 * Quelle für ZAHLEN, nicht für unsere Beschriftungen.
 *
 * Warum „Balkonkraftwerk" gewinnt: Es ist das Wort, das Menschen benutzen und
 * in die Suche tippen. „Mini-PV" ist Verwaltungsdeutsch, und wer danach sucht,
 * sucht nicht bei uns.
 *
 * Was ERHALTEN bleibt, sind die Zusätze: „Balkonkraftwerk 340–680 Wp",
 * „Balkonkraftwerk (Mieter)". Sie tragen Information, keine Namensvariante.
 */

/** Wörter, die dasselbe meinen und deshalb nicht mehr auftauchen dürfen. */
const VARIANTEN =
  /Mini-?PV|Mini-?Photovoltaik|Mini-Balkon|Stecker-?Solar|Steckersolar|Stecker-?PV|Steckerfertig|Balkonsolar|Balkon-Solar|Balkon-PV|Balkonmodul/i;

/**
 * Die Beschriftungen, die WIR formulieren — `name` gehört ausdrücklich nicht dazu.
 *
 * Der Programmname ist ein Eigenname: „Klimaförderprogramm Steckersolar" heißt
 * so, weil die Gemeinde es so nennt. Ihn zu vereinheitlichen hieße, den Namen zu
 * erfinden, unter dem niemand das Programm auf der Amtsseite wiederfindet — und
 * er steht in unserer Karte direkt neben dem Verweis dorthin.
 *
 * Alles andere ist unsere Sprache und wird vereinheitlicht.
 */
function beschriftungen(p: (typeof FUNDING_PROGRAMS)[string]): string[] {
  return [
    p.coveredCosts,
    p.maxFoerderung,
    ...p.rates.map((r) => r.label),
  ].filter((x): x is string => typeof x === "string");
}

describe("Balkonkraftwerk heißt überall Balkonkraftwerk", () => {
  it("keine Beschriftung trägt eine andere Bezeichnung", () => {
    const treffer: string[] = [];
    for (const p of Object.values(FUNDING_PROGRAMS)) {
      for (const t of beschriftungen(p)) {
        if (VARIANTEN.test(t)) treffer.push(`${p.id}: „${t}"`);
      }
    }
    expect(treffer, `${treffer.length} abweichende Bezeichnungen:\n${treffer.join("\n")}`).toEqual([]);
  });

  it("die Leistungsstufen sind dabei nicht verloren gegangen", () => {
    // Die Gegenrichtung: Eine Vereinheitlichung, die „Balkonkraftwerk 340–680 Wp"
    // zu „Balkonkraftwerk" macht, wirft die Staffelung weg — und aus drei
    // Sätzen würden drei gleich beschriftete Zeilen, von denen niemand mehr
    // weiß, welche für ihn gilt.
    const stufen = Object.values(FUNDING_PROGRAMS)
      .flatMap((p) => p.rates.map((r) => r.label))
      .filter((l) => /Balkonkraftwerk .*(W|Wp|\()/.test(l));
    expect(stufen.length).toBeGreaterThan(5);
  });

  it("gilt auch für die Bedingungen", () => {
    // Dort steht der Begriff im Fließtext und fällt genauso auf.
    const treffer: string[] = [];
    for (const p of Object.values(FUNDING_PROGRAMS)) {
      for (const c of p.conditions.map(bedingungText)) {
        // „Steckersolar" in einer Rechtsaussage ist der Gesetzesbegriff und
        // bleibt; geprüft wird nur, was wie eine zweite Produktbezeichnung
        // aussieht.
        if (/Mini-?PV|Balkonmodul|Balkonsolar/i.test(c)) treffer.push(`${p.id}: „${c}"`);
      }
    }
    expect(treffer, treffer.join("\n")).toEqual([]);
  });
});
