// ─── Die eine Übersicht: was hineinging, was herauskam ───────────────────────
//
// Führt die drei bestehenden Messungen zusammen und rechnet NICHTS neu:
//   • Zeit, Tokens und Bestand      → `projekt-statistik.ts`
//   • bezahltes Geld                → `projekt-kosten.ts`
//   • geschätzter Herstellungsaufwand → `aufwand-schaetzung.ts`
//
// Der Sinn ist die Gegenüberstellung, nicht eine vierte Zahlenquelle. Wer hier
// eine Größe berechnet, die es woanders schon gibt, baut die zweite Fassung,
// gegen die dieses Projekt an zwanzig Stellen argumentiert.
//
// DREI DINGE, DIE HIER NEBENEINANDERSTEHEN UND NICHT DASSELBE SIND:
//
//   BEZAHLT     — ging vom Konto, steht in der Buchhaltung.  (Euro, gemessen)
//   LISTENWERT  — hätte die Rechenleistung über die Schnittstelle gekostet.
//                 Kein Geld, ein Vergleichsmaßstab.           (Dollar, gerechnet)
//   HERSTELLWERT— hätte ein Team für dasselbe Ergebnis verlangt.
//                 Weder Geld noch Messung, eine Schätzung.    (Euro, geschätzt)
//
// Wer sie in einer Spalte untereinanderschreibt, behauptet eine Vergleichbarkeit,
// die keine zwei von ihnen haben. Deshalb trägt jede ihre eigene Einheit und
// ihre eigene Herkunft — und deshalb gibt es in diesem Modul keine Gesamtsumme.

import { inPersonenjahren, type Aufwand } from "./aufwand-schaetzung";
import { KURS_USD_EUR } from "./modellpreise";
import type { Bestandstag, Summe } from "./projekt-statistik";
import type { Kostensumme } from "./projekt-kosten";

/**
 * Der Stundensatz, mit dem der Herstellungsaufwand in Geld umgerechnet wird.
 *
 * GEMESSEN, NICHT GEGRIFFEN: Es ist der Satz, den der Betreiber seinen eigenen
 * Kunden in Rechnung stellt (Ausgangsrechnungen 2026, UX/UI-Arbeit, 100 € je
 * Stunde netto). Ein Marktwert für Full-Stack-Entwicklung läge höher — übliche
 * Agentursätze liegen bei 800 bis 1.200 Euro am Tag —, aber ein fremder Satz
 * wäre eine Annahme, und dieser hier ist belegbar. Die Richtung der Ungenauigkeit
 * ist damit benannt: Die Zahl ist eher zu niedrig als zu hoch.
 */
export const STUNDENSATZ_EUR = 100;
export const STUNDENSATZ_BELEG =
  "eigener Satz aus den Ausgangsrechnungen 2026 (UX/UI, 100 € netto je Stunde)";

/** Stunden je Personentag — dieselbe Annahme wie in der Aufwandsschätzung. */
export const STUNDEN_JE_TAG = 8;

/**
 * Der Zeitraum, den eine Zahl abdeckt.
 *
 * ER GEHÖRT AN JEDE GRÖSSE, und zwar aus einem gemessenen Grund: Die Kosten
 * reichen über die ganze Projektlaufzeit, der Listenwert nur über die noch
 * vorhandenen Gesprächsprotokolle — rund die letzten vier Wochen. Beide
 * nebeneinanderzustellen und zu teilen ergibt ein Verhältnis, dessen Zähler und
 * Nenner verschiedene Zeiträume messen. Genau das stand in der ersten Fassung
 * dieses Moduls, sah plausibel aus und war um ein Vielfaches daneben.
 */
export interface Zeitraum {
  von: string;
  bis: string;
}

/** Was investiert wurde. */
export interface Investiert {
  /** Tatsächliche Arbeitszeit des Menschen, zusammengelegt über parallele Stände. */
  stunden: number;
  /** Tage, an denen überhaupt gearbeitet wurde. */
  arbeitstage: number;
  /**
   * Hochgerechnete Stunden der Zeit vor der Messung.
   *
   * Sie stehen GETRENNT, nicht addiert: Die Arbeitszeit-Reihe enthält nur
   * gemessene Tage, und das soll sie auch. Wer beide Zahlen zusammenzieht,
   * macht aus einer Hochrechnung eine Messung.
   */
  stundenHochgerechnet: number;
  /** Bezahlt, in Euro, brutto — nur der Anteil dieses Projekts. */
  bezahltEur: number;
  /** Alle Projekte zusammen, zur Einordnung des Anteils. */
  bezahltAlleProjekteEur: number;
  /** Verarbeitete Tokens, alle Werkzeuge. */
  tokens: number;
  /** Was diese Tokens über die Schnittstelle gekostet hätten, in US-Dollar. */
  listenwertUsd: number;
  /** Welchen Zeitraum welche Zahl abdeckt. */
  zeitraum: {
    zeit: Zeitraum | null;
    geld: Zeitraum | null;
    listenwert: Zeitraum | null;
  };
}

/** Was entstanden ist. */
export interface Entstanden {
  codezeilen: number;
  dokuzeilen: number;
  testfaelle: number;
  dateien: number;
  commits: number;
}

/** Was das Ergebnis wert ist, wenn man es hätte beauftragen müssen. */
export interface Herstellwert {
  /** Geschätzte Personentage aus der Gewerke-Rechnung. */
  personentage: number;
  personenjahre: number;
  /** Dieselbe Schätzung in Geld, zum eigenen Stundensatz. */
  eur: number;
  /** Die Spanne der Schätzung, in Geld. */
  vonEur: number;
  bisEur: number;
}

export interface Bilanz {
  investiert: Investiert;
  entstanden: Entstanden;
  wert: Herstellwert;
  /** Herstellwert je investiertem Euro. */
  hebelGeld: number | null;
  /**
   * Listenwert der Rechenleistung je bezahltem Euro — über den ÜBERLAPPENDEN
   * Zeitraum, nicht über beide Gesamtsummen.
   */
  hebelRechenleistung: number | null;
  /** Die Monate, über die dieses eine Verhältnis gebildet wurde. */
  hebelRechenleistungMonate: number;
  /** Geschätzte Personentage gegen tatsächlich gearbeitete. */
  hebelZeit: number | null;
}

export function bilanz(args: {
  statistik: Summe;
  codexStatistik?: Summe;
  arbeitsminuten: number;
  arbeitstage: number;
  /** Hochgerechnete Stunden für die Zeit ohne Protokolle. */
  stundenHochgerechnet?: number;
  kosten: Kostensumme;
  listenwertUsd: number;
  /**
   * Die Kosten und der Listenwert desselben Zeitraums — nur daraus darf ein
   * Verhältnis gebildet werden.
   */
  ueberlappung?: { bezahltEur: number; listenwertUsd: number; monate: number };
  bestand: Bestandstag;
  aufwand: Aufwand;
  zeitraum?: Investiert["zeitraum"];
}): Bilanz {
  const stunden = Math.round(args.arbeitsminuten / 60);
  const tokens = args.statistik.tokensGesamt + (args.codexStatistik?.tokensGesamt ?? 0);

  const eurJeTag = STUNDENSATZ_EUR * STUNDEN_JE_TAG;
  const wert: Herstellwert = {
    personentage: args.aufwand.tage,
    personenjahre: inPersonenjahren(args.aufwand.tage),
    eur: args.aufwand.tage * eurJeTag,
    vonEur: args.aufwand.von * eurJeTag,
    bisEur: args.aufwand.bis * eurJeTag,
  };

  const investiert: Investiert = {
    stunden,
    arbeitstage: args.arbeitstage,
    stundenHochgerechnet: args.stundenHochgerechnet ?? 0,
    bezahltEur: args.kosten.solarCheckEur,
    bezahltAlleProjekteEur: args.kosten.gesamtEur,
    tokens,
    listenwertUsd: args.listenwertUsd,
    zeitraum: args.zeitraum ?? { zeit: null, geld: null, listenwert: null },
  };

  const entstanden: Entstanden = {
    codezeilen: args.bestand.codezeilen,
    dokuzeilen: args.bestand.dokuzeilen,
    testfaelle: args.bestand.testfaelle,
    dateien: args.bestand.dateien,
    commits: args.bestand.commitsGesamt,
  };

  // Alle drei Verhältnisse werden auf GANZE Zahlen gerundet. Zähler und Nenner
  // sind in jedem Fall verschieden scharf — eine Schätzung gegen eine Messung,
  // ein Listenpreis gegen eine Abbuchung. „Faktor 190" trägt, „Faktor 192,4"
  // behauptet eine Genauigkeit, die keine der beteiligten Zahlen hat.
  const teile = (a: number, b: number): number | null => (b > 0 ? Math.round(a / b) : null);

  // Der Rechenleistungs-Hebel wird NUR aus der Überlappung gebildet. Ohne sie
  // bleibt er leer — eine Zahl aus zwei verschiedenen Zeiträumen wäre schlimmer
  // als keine, weil ihr niemand ansieht, dass sie das ist.
  const u = args.ueberlappung;

  return {
    investiert,
    entstanden,
    wert,
    hebelGeld: teile(wert.eur, investiert.bezahltEur),
    hebelRechenleistung: u ? teile(u.listenwertUsd * KURS_USD_EUR, u.bezahltEur) : null,
    hebelRechenleistungMonate: u?.monate ?? 0,
    hebelZeit: teile(wert.personentage, (stunden + investiert.stundenHochgerechnet) / STUNDEN_JE_TAG),
  };
}
