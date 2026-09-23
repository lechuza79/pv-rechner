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
import type { Rolle } from "./rollensaetze";
import { KURS_USD_EUR } from "./modellpreise";
import type { Bestandstag, Summe } from "./projekt-statistik";
import type { Kostensumme } from "./projekt-kosten";

/**
 * Der eigene Stundensatz des Betreibers.
 *
 * ER RECHNET NICHT MEHR DEN HERSTELLWERT, sondern nur noch die eigene Zeit: Was
 * ein Team gekostet hätte, entsteht aus den Rollensätzen in `rollensaetze.ts`,
 * und die sind eine andere Frage als „was ist meine Stunde wert". Beides in
 * einer Zahl zu vermischen war die erste Fassung, und sie unterschätzte den
 * Herstellwert, weil ein Projekt dieser Art kein Einzelsatz-Projekt ist.
 *
 * Angabe des Betreibers (23.09.2026). Seine Ausgangsrechnungen aus 2026 weisen
 * 100 € je Stunde aus; der höhere Wert ist sein aktueller Ansatz, nicht der
 * historische Rechnungsbetrag — deshalb steht er als Angabe da und nicht als
 * Messung.
 */
export const STUNDENSATZ_EUR = 140;
export const STUNDENSATZ_BELEG =
  "eigener Ansatz des Betreibers (140 € je Stunde, Angabe vom 23.09.2026; " +
  "die Ausgangsrechnungen 2026 weisen 100 € aus)";

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
   * Davon Stunden, in denen gleichzeitig an einem anderen Projekt gearbeitet
   * wurde — gemessen, nicht geschätzt.
   */
  stundenParallel: number;
  /**
   * Die Stunden, mit denen gerechnet wird: die parallelen zur Hälfte.
   *
   * Halbieren ist die neutrale Annahme bei zwei gleichzeitig offenen Projekten
   * — wie sich eine solche Stunde wirklich aufteilt, weiß niemand. Sie ganz zu
   * zählen überschätzt den Einsatz um fast ein Drittel, sie ganz wegzulassen
   * unterschätzt ihn genauso.
   */
  stundenBereinigt: number;
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
  /**
   * Die eigene Arbeitszeit in Geld, zum eigenen Satz.
   *
   * SIE IST DER GRÖSSTE POSTEN und fehlte in der ersten Fassung ganz — dort
   * stand „Herstellwert je bezahltem Euro", als hätte die eigene Zeit nichts
   * gekostet. Ein Verhältnis, das den größten Einsatz weglässt, fällt
   * zwangsläufig zu gut aus.
   */
  eigeneZeitEur: number;
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
  /** Dieselbe Schätzung in Geld, mit der Rollenmischung zu Agentursätzen. */
  eur: number;
  /** Die Spanne der Schätzung, in Geld. */
  vonEur: number;
  bisEur: number;
  /** Stunden je Rolle — zeigt, woher die Summe kommt. */
  stundenJeRolle: Record<Rolle, number>;
  /** Der Mischsatz, mit dem sich das Ergebnis nachrechnen lässt. */
  mischsatzEurProStunde: number;
}

export interface Bilanz {
  investiert: Investiert;
  entstanden: Entstanden;
  wert: Herstellwert;
  /**
   * Herstellwert je investiertem Euro — GEGEN GELD UND ZEIT ZUSAMMEN.
   *
   * Die eigene Arbeitszeit zählt mit, zum eigenen Satz: Wer nur die
   * Rechnungsbeträge in den Nenner setzt, rechnet die Hauptleistung heraus.
   */
  hebelGeld: number | null;
  /** Nur gegen die Rechnungsbeträge — die Zahl, die ohne die eigene Zeit entsteht. */
  hebelNurGeld: number | null;
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
  /** Minuten, die gleichzeitig einem anderen Projekt gehörten. */
  minutenParallel?: number;
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
  const stundenParallel = Math.round((args.minutenParallel ?? 0) / 60);
  const stundenBereinigt = stunden - Math.round(stundenParallel / 2);
  const tokens = args.statistik.tokensGesamt + (args.codexStatistik?.tokensGesamt ?? 0);

  const wert: Herstellwert = {
    personentage: args.aufwand.tage,
    personenjahre: inPersonenjahren(args.aufwand.tage),
    eur: args.aufwand.eur,
    vonEur: args.aufwand.eurVon,
    bisEur: args.aufwand.eurBis,
    stundenJeRolle: args.aufwand.stundenJeRolle,
    mischsatzEurProStunde: args.aufwand.mischsatzEurProStunde,
  };

  const investiert: Investiert = {
    stunden,
    arbeitstage: args.arbeitstage,
    stundenParallel,
    stundenBereinigt,
    stundenHochgerechnet: args.stundenHochgerechnet ?? 0,
    bezahltEur: args.kosten.solarCheckEur,
    bezahltAlleProjekteEur: args.kosten.gesamtEur,
    eigeneZeitEur: (stundenBereinigt + (args.stundenHochgerechnet ?? 0)) * STUNDENSATZ_EUR,
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
    hebelGeld: teile(wert.eur, investiert.bezahltEur + investiert.eigeneZeitEur),
    hebelNurGeld: teile(wert.eur, investiert.bezahltEur),
    hebelRechenleistung: u ? teile(u.listenwertUsd * KURS_USD_EUR, u.bezahltEur) : null,
    hebelRechenleistungMonate: u?.monate ?? 0,
    hebelZeit: teile(
      wert.personentage,
      (stundenBereinigt + investiert.stundenHochgerechnet) / STUNDEN_JE_TAG,
    ),
  };
}
