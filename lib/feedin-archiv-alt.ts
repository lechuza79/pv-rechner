// ─── Feste Einspeisevergütung für Photovoltaik, Inbetriebnahme 2006 – 03/2012 ───
//
// Ergänzt lib/feedin-archiv.ts nach hinten: dort beginnt die Monatstabelle erst
// am 01.04.2012 (EEG 2012), weil davor eine andere Vergütungslogik galt. Dieses
// Modul bildet die Jahres- bzw. Stichtags-Sätze der Ära davor ab.
//
// DATENHERKUNFT (jede Zeile am 15.08.2026 im Primärdokument nachgesehen):
//   · 2006 bis 2008 — Degressionskette des EEG 2004, am 17.08.2026 im
//     GESETZESTEXT selbst nachgelesen (Bundesgesetzblatt Jahrgang 2004 Teil I
//     Nr. 40, ausgegeben am 31.07.2004, S. 1918 ff.; § 11 auf S. 1922 f. —
//     Volltext liegt als docs/quellen/EEG-2004_BGBl-I-2004-Nr40-S1918.pdf im
//     Repo). Die Kette steht als EEG2004_BASIS/EEG2004_DEGRESSION unten im
//     Code, damit der Test sie unabhängig nachrechnen kann:
//       § 11 Abs. 1: 45,70 ct Freifläche.
//       § 11 Abs. 2 Satz 1: 57,40 ct bis 30 kW · 54,60 ct ab 30 kW ·
//         54,00 ct ab 100 kW (die 100-kW-Klasse bildet dieses Modul NICHT ab).
//       § 11 Abs. 5: ab 01.01.2005 jährlich −5 % "des für die im Vorjahr neu in
//         Betrieb genommenen Anlagen maßgeblichen Wertes … und auf zwei Stellen
//         hinter dem Komma gerundet" — es wird also JEDES JAHR gerundet und der
//         gerundete Wert fortgeschrieben. Ab 01.01.2006 gilt für Anlagen nach
//         Absatz 1 (Freifläche) stattdessen −6,5 %; das Dach bleibt bei −5 %.
//     Die 2007er und 2008er Zeilen waren zuvor aus der amtlichen BMU-Übersicht
//     "Vergütungssätze nach dem EEG 2004" (Abschnitt 7) abgelesen. Beide Wege
//     liefern zellgleich dieselben vier Werte — das ist die Quer-Validierung,
//     mit der die 2006er Zeile hier steht.
//   · Warum die Kette bei 2006 ANFÄNGT und nicht bei 2004: Dieses Modul dient
//     der Bestandsbewertung im Solar-Atlas, und dort zählt ein Jahrgang nur,
//     solange seine 20 Jahre laufen (§ 25 EEG). Jahrgang 2005 ist Ende 2025
//     ausgelaufen, 2006 läuft noch bis Ende 2026. Eine 2005er Zeile wäre also
//     Datenpflege für einen Fall, den es nicht mehr gibt.
//   · 2009 — EEG 2009 (BGBl. I 2008 S. 2074) im Wortlaut: § 33 Abs. 1 Nr. 1
//     (43,01 ct), Nr. 2 (40,91 ct), § 32 Abs. 1 (31,94 ct).
//   · 01.01.2010 — Bundesnetzagentur, "Degressions- und Vergütungssätze für
//     solare Strahlungsenergie nach den §§ 32 und 33 EEG für das Jahr 2010"
//     (§ 32: 28,43 · § 33 Abs. 1 Nr. 1: 39,14 · Nr. 2: 37,23).
//   · 01.07.2010 und 01.10.2010 — KEINE Behördentabelle, sondern die Kürzung
//     unmittelbar aus dem Gesetz: Gesetz zur Änderung des EEG vom 11.08.2010
//     (BGBl. I S. 1170), neuer § 20 Abs. 4 EEG 2009 — Dachanlagen (§ 33 Abs. 1)
//     einmalig −13 %, bei Inbetriebnahme nach dem 30.09.2010 weitere −3 %;
//     Freiflächen (§ 32 außer Abs. 3 Nr. 1 und 2) −12 % bzw. weitere −3 %.
//     Gerundet wird nach § 20 Abs. 5 EEG 2009 erst am Ende der Rechnung auf
//     zwei Nachkommastellen. Die Werte unten sind genau diese Rechnung
//     (Faktoren 0,87 · 0,97 bzw. 0,88 · 0,97 auf den Satz vom 01.01.2010).
//   · 2011 — Bundesnetzagentur, "Degressions- und Vergütungssätze … ab dem
//     01.01.2011" (§ 33 Abs. 1 Nr. 1: 28,74 · Nr. 2: 27,33 · § 32: 21,11).
//     Unterjährig gab es 2011 KEINE Kürzung: das Blatt "… ab dem 1. Juli 2011
//     bzw. 1. September 2011" weist einen Degressionssatz von Null Prozent aus
//     und wiederholt dieselben drei Sätze.
//   · 01.01.2012 — Bundesnetzagentur, "Degressions- und Vergütungssätze …
//     ab dem 1. Januar 2012" (§ 33 Abs. 1 Nr. 1: 24,43 · Nr. 2: 23,23 ·
//     § 32 außer Abs. 3 Satz 1 Nr. 1 und 2: 17,94). Diese Sätze gelten bis
//     31.03.2012; ab 01.04.2012 übernimmt lib/feedin-archiv.ts.
//
// BEWUSSTE GRENZEN DES MODELLS:
//   · Die Leistungsstaffel wirkt ANTEILIG, nicht als Sprungtarif — EEG 2004
//     § 12 Abs. 2 Satz 1 (Wortlaut am 17.08.2026 im BGBl-Volltext geprüft) und
//     EEG 2009 § 18 Abs. 1: die Vergütung bestimmt sich "jeweils anteilig nach
//     der Leistung der Anlage im Verhältnis zu dem jeweils anzuwendenden
//     Schwellenwert". Eine 40-kW-Dachanlage bekommt also NICHT den 100-kW-Satz,
//     sondern eine Mischung aus beiden Sätzen. Wer einen Satz für eine Anlage
//     über 30 kW will, muss deshalb `blendRoofRate` benutzen — die Klassensätze
//     roh zu nehmen rechnet jede Anlage über 30 kW zu niedrig.
//   · Die Klassengrenzen sind ANDERE als ab 04/2012: hier ≤ 30 kW und ≤ 100 kW,
//     dort ≤ 10 kW und ≤ 40 kW. Die beiden Tabellen sind deshalb nicht
//     spaltenweise vergleichbar.
//   · Die EIGENVERBRAUCHSVERGÜTUNG nach § 33 Abs. 2 EEG 2009 (ab 01.01.2009
//     bis 31.03.2012, z. B. 25,01 ct 2009, 22,76 ct 2010) ist NICHT enthalten.
//     Wer für diese Jahrgänge nur den Einspeisesatz ansetzt, untererfasst sie —
//     selbst verbrauchter Strom wurde damals zusätzlich vergütet.
//   · Ebenfalls nicht enthalten: der Fassaden-/Gebäudeintegrations-Bonus von
//     +5,0 ct (EEG 2004 § 11 Abs. 2 Satz 2, entfallen mit dem EEG 2009), die
//     Klassen über 100 kW bzw. über 1 MW, und der höhere Freiflächensatz für
//     versiegelte Flächen und Konversionsflächen (§ 32 Abs. 3 Satz 1 Nr. 1
//     und 2 — 2011: 22,07 statt 21,11 ct; 2012: 18,76 statt 17,94 ct).
//     Gespeichert ist immer die ALLGEMEINE, also niedrigere Freiflächenklasse.
//   · Diese Sätze sind für die BESTANDSBEWERTUNG im Solar-Atlas gedacht —
//     "was verdient der Anlagenbestand einer Gemeinde ungefähr". Der
//     Einspeisevergütungs-RECHNER bietet für diese Jahrgänge weiterhin bewusst
//     die manuelle Eingabe aus dem Bescheid an (Begründung im Kopf von
//     lib/feedin-archiv.ts); diese Entscheidung bleibt bestehen und wird von
//     diesem Modul NICHT aufgehoben.

/** Ein Stichtag der alten Ära mit den drei Sätzen, die wir abbilden. */
export interface AltFeedInRow {
  /** Erster Inbetriebnahme-Tag (ISO, einschließlich), ab dem diese Sätze gelten. */
  from: string;
  /** Dachanlage, Anlagenteil bis einschließlich 30 kW — ct/kWh. */
  roofUpTo30: number;
  /** Dachanlage, Anlagenteil über 30 bis einschließlich 100 kW — ct/kWh. */
  roofUpTo100: number;
  /** Freifläche, allgemeine Klasse (ohne Konversions-/versiegelte Flächen) — ct/kWh. */
  groundMounted: number;
  /** Kurze Herkunft/Besonderheit dieses Stichtags. */
  source: string;
}

/** Erster Inbetriebnahme-Tag, für den dieses Modul Sätze kennt. */
export const FEED_IN_ALT_START = "2006-01-01";

/**
 * Ausgangswerte der Degressionskette — § 11 Abs. 1 und Abs. 2 Satz 1 EEG 2004
 * (BGBl. I 2004 Nr. 40 S. 1922 f.), maßgeblich für Inbetriebnahmen 2004.
 * Stehen hier NICHT, um die Tabelle zu erzeugen, sondern damit der Test die
 * Tabelle gegen das Gesetz nachrechnen kann statt gegen sich selbst.
 */
export const EEG2004_BASIS = { roofUpTo30: 57.4, roofUpTo100: 54.6, groundMounted: 45.7 } as const;

/**
 * § 11 Abs. 5 EEG 2004: ab 2005 jährlich −5 %, ab 2006 für Freiflächen −6,5 %.
 * Gerundet wird in JEDEM Jahr auf zwei Stellen, und der gerundete Wert ist die
 * Grundlage des Folgejahres ("des für die im Vorjahr … maßgeblichen Wertes").
 */
export const EEG2004_DEGRESSION = { dach: 0.05, freiflaecheAb2005: 0.05, freiflaecheAb2006: 0.065 } as const;

/**
 * Erster Tag, der NICHT mehr hierher gehört — ab da gilt lib/feedin-archiv.ts
 * (FEED_IN_ARCHIV_START = "2012-04").
 */
export const FEED_IN_ALT_END = "2012-04-01";

export const FEED_IN_ARCHIV_ALT: ReadonlyArray<AltFeedInRow> = [
  {
    // Zwei Degressionsschritte auf die Basiswerte von 2004, je Jahr gerundet:
    // Dach 57,40 → 54,53 → 51,80 bzw. 54,60 → 51,87 → 49,28 (−5 %/Jahr);
    // Freifläche 45,70 → 43,42 (−5 % für 2005) → 40,60 (−6,5 % ab 2006).
    from: "2006-01-01",
    roofUpTo30: 51.8,
    roofUpTo100: 49.28,
    groundMounted: 40.6,
    source: "EEG 2004 § 11 Abs. 1, 2 und 5 (BGBl. I 2004 Nr. 40 S. 1922 f.), Degressionskette ab 2005",
  },
  {
    from: "2007-01-01",
    roofUpTo30: 49.21,
    roofUpTo100: 46.82,
    groundMounted: 37.96,
    source: "EEG 2004 § 11 (Degressionskette), BMU-Übersicht Abschnitt 7",
  },
  {
    from: "2008-01-01",
    roofUpTo30: 46.75,
    roofUpTo100: 44.48,
    groundMounted: 35.49,
    source: "EEG 2004 § 11 (Degressionskette), BMU-Übersicht Abschnitt 7",
  },
  {
    from: "2009-01-01",
    roofUpTo30: 43.01,
    roofUpTo100: 40.91,
    groundMounted: 31.94,
    source: "EEG 2009 § 33 Abs. 1 Nr. 1 und 2, § 32 Abs. 1 (BGBl. I 2008 S. 2074)",
  },
  {
    from: "2010-01-01",
    roofUpTo30: 39.14,
    roofUpTo100: 37.23,
    groundMounted: 28.43,
    source: "BNetzA, Degressions- und Vergütungssätze für das Jahr 2010",
  },
  {
    // 39,14 × 0,87 · 37,23 × 0,87 · 28,43 × 0,88, gerundet nach § 20 Abs. 5.
    from: "2010-07-01",
    roofUpTo30: 34.05,
    roofUpTo100: 32.39,
    groundMounted: 25.02,
    source: "EEG 2009 § 20 Abs. 4 i. d. F. v. 11.08.2010 (BGBl. I S. 1170): Dach −13 %, Freifläche −12 %",
  },
  {
    // 39,14 × 0,87 × 0,97 = 33,0302… · 37,23 × 0,87 × 0,97 = 31,4184…
    // 28,43 × 0,88 × 0,97 = 24,2678… → 24,27 (nicht 24,26; kaufmännisch gerundet).
    from: "2010-10-01",
    roofUpTo30: 33.03,
    roofUpTo100: 31.42,
    groundMounted: 24.27,
    source: "EEG 2009 § 20 Abs. 4 i. d. F. v. 11.08.2010: zusätzlich −3 %",
  },
  {
    // 2011 ohne unterjährige Kürzung — BNetzA-Blatt Juli/September 2011: 0 %.
    from: "2011-01-01",
    roofUpTo30: 28.74,
    roofUpTo100: 27.33,
    groundMounted: 21.11,
    source: "BNetzA, Degressions- und Vergütungssätze ab dem 01.01.2011",
  },
  {
    from: "2012-01-01",
    roofUpTo30: 24.43,
    roofUpTo100: 23.23,
    groundMounted: 17.94,
    source: "BNetzA, Degressions- und Vergütungssätze ab dem 1. Januar 2012",
  },
];

/**
 * Sätze für ein Inbetriebnahme-Datum (ISO "YYYY-MM-DD" oder "YYYY-MM").
 * Liefert null außerhalb des Bereichs 01.01.2006 – 31.03.2012 — für spätere
 * Inbetriebnahmen ist lib/feedin-archiv.ts zuständig, für frühere gibt es
 * bewusst keinen automatischen Satz (siehe Kopfkommentar: ihre 20 Jahre sind
 * vorbei).
 */
export function altFeedInRatesFor(iso: string): AltFeedInRow | null {
  const day = iso.length === 7 ? `${iso}-01` : iso;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  if (day < FEED_IN_ALT_START || day >= FEED_IN_ALT_END) return null;

  let hit: AltFeedInRow | null = null;
  for (const row of FEED_IN_ARCHIV_ALT) {
    if (row.from <= day) hit = row;
  }
  return hit;
}

/**
 * Anteilig gemischter Dachsatz für eine Anlagengröße (EEG 2004 § 12 Abs. 2
 * Satz 1 / EEG 2009 § 18 Abs. 1). Bis 30 kW ist das schlicht der 30-kW-Satz;
 * darüber wird gemischt. Über 100 kW gibt dieses Modul die Sätze nicht her —
 * dann null, statt still den 100-kW-Satz weiterzuschreiben.
 */
export function blendRoofRate(row: AltFeedInRow, kwp: number): number | null {
  if (!(kwp > 0)) return null;
  if (kwp <= 30) return row.roofUpTo30;
  if (kwp > 100) return null;
  return (30 * row.roofUpTo30 + (kwp - 30) * row.roofUpTo100) / kwp;
}
