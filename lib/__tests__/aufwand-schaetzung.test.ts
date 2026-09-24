/**
 * EINE SCHÄTZUNG DARF NICHT AUSSEHEN WIE EINE MESSUNG.
 *
 * Die Zahlen aus diesem Modul sollen öffentlich stehen. Damit sind sie
 * Werbeaussagen nach § 5 UWG und tragen dieselbe Last wie jede andere Zahl auf
 * der Seite. Was die Tests hier festhalten, ist nicht die Höhe der Schätzung —
 * die ist Urteil und darf sich ändern —, sondern dass die TRENNLINIE bestehen
 * bleibt: Menge gezählt, Tage geurteilt, Ergebnis als Spanne.
 *
 * Der Anlass ist ein verworfener erster Anlauf: Das übliche Verfahren aus
 * Codezeilen (COCOMO) lieferte 62 Personenjahre gegen tatsächlich rund ein
 * Drittel Personenjahr — Faktor 200. Kein Verfahren ist so genau, dass so ein
 * Ergebnis etwas belegt; auf einer Seite, die für Ehrlichkeit bürgt, wäre es
 * eine Behauptung, die der erste Fachmann in zwei Sätzen zerlegt.
 */

import { describe, it, expect } from "vitest";
import {
  GEWERKE,
  schaetzeAufwand,
  inPersonenjahren,
  faktorGegen,
  ARBEITSTAGE_JE_JAHR,
  type Zaehlstand,
} from "../aufwand-schaetzung";
import type { Bestandstag } from "../projekt-statistik";

const BESTAND: Bestandstag = {
  tag: "2026-09-09", dateien: 1676, codezeilen: 188419, dokuzeilen: 25256,
  testdateien: 278, testfaelle: 3499, commitsGesamt: 2122,
};
const ZAEHLSTAND: Zaehlstand = {
  rechner: 5, seiten: 68, widgets: 21, routen: 70, komponenten: 152,
  foerderprogramme: 110,
};

describe("Aufwand nach Gewerken", () => {
  it("wächst mit dem Projekt, statt eine getippte Summe zu wiederholen", () => {
    const klein = schaetzeAufwand(BESTAND, { ...ZAEHLSTAND, seiten: 10 });
    const gross = schaetzeAufwand(BESTAND, { ...ZAEHLSTAND, seiten: 200 });
    expect(gross.tage).toBeGreaterThan(klein.tage);
  });

  it("trennt gezählte Menge von geurteilten Tagen", () => {
    const a = schaetzeAufwand(BESTAND, ZAEHLSTAND);
    const mitMenge = a.positionen.filter((p) => p.menge !== null);
    const pauschal = a.positionen.filter((p) => p.menge === null);
    // Beide Sorten müssen vorkommen: Gäbe es nur pauschale Posten, wäre die
    // ganze Summe Urteil und würde nie mitwachsen; gäbe es nur Mengen, täuschte
    // sie eine Herleitung vor, die es für Betrieb und Recherche nicht gibt.
    expect(mitMenge.length).toBeGreaterThan(0);
    expect(pauschal.length).toBeGreaterThan(0);
    for (const p of mitMenge) expect(p.einheit).toBeTruthy();
  });

  it("nennt eine Spanne, nicht nur einen Punktwert", () => {
    const a = schaetzeAufwand(BESTAND, ZAEHLSTAND);
    expect(a.von).toBeLessThan(a.tage);
    expect(a.bis).toBeGreaterThan(a.tage);
  });

  it("liegt in einer Größenordnung, die ein Team leisten könnte", () => {
    // Grober Plausibilitätsrahmen, kein Zielwert: Unter einem halben und über
    // fünf Personenjahren wäre etwas an der Gewerkeliste kaputt.
    const a = schaetzeAufwand(BESTAND, ZAEHLSTAND);
    expect(inPersonenjahren(a.tage)).toBeGreaterThan(0.5);
    expect(inPersonenjahren(a.tage)).toBeLessThan(5);
  });

  it("gibt jedem Gewerk einen Tagessatz über null", () => {
    for (const g of GEWERKE) expect(g.tage).toBeGreaterThan(0);
  });
});

describe("Umrechnung und Vergleich", () => {
  it("rechnet Personentage in Personenjahre mit Arbeitstagen, nicht Kalendertagen", () => {
    expect(inPersonenjahren(ARBEITSTAGE_JE_JAHR)).toBe(1);
  });

  it("rundet den Faktor auf eine ganze Zahl", () => {
    // Zähler und Nenner sind beide unscharf. „Faktor 9" trägt, „Faktor 9,4"
    // behauptet eine Genauigkeit, die keine der beiden Zahlen hat.
    const f = faktorGegen(600, 520);
    expect(f).toBe(Math.round(f!));
  });

  it("liefert ohne gemessene Zeit keinen Faktor statt einer Division durch null", () => {
    expect(faktorGegen(600, 0)).toBeNull();
  });
});
