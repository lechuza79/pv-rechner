// ─── Historische feste Einspeisevergütung je MONAT, April 2012 – Juli 2022 ───
//
// Abgrenzung: lib/feedin-history.ts ist die JAHRES-Reihe für die Zubau-Story
// (Jahresanfangs-Repräsentant, gepflegt vom EEG-Wächter). Dieses Modul hier ist
// die MONATS-Tabelle für den Einspeisevergütungs-Rechner (Bestandsanlagen).
// Wo sich beide überlappen (Januar-Werte 2013–2022), nagelt
// lib/__tests__/feedin-archiv.test.ts sie aneinander fest — eine Größe darf
// nicht aus zwei driftenden Quellen kommen.
//
// DATENHERKUNFT: Archivtabellen der Bundesnetzagentur ("Degressions- und
// Vergütungssätze" / "Anzulegende Werte für Solaranlagen"), am 04.08.2026
// direkt von bundesnetzagentur.de geladen — die Originaldateien liegen unter
// docs/quellen/bnetza-archiv/. Extrahiert wurde je Inbetriebnahme-Monat die
// FESTE EINSPEISEVERGÜTUNG für Dachanlagen (Wohngebäude) in den Klassen
// bis 10 kWp und bis 40 kWp:
//   · 04/2012–07/2014 (EEG 2012): die veröffentlichte Vergütungstabelle selbst.
//   · 08/2014–12/2016 (EEG 2014): der Block "Feste Einspeisevergütung"
//     (= anzulegender Wert − 0,4 ct Managementaufwand, § 37 Abs. 3 EEG 2014).
//   · 2017–07/2022 (EEG 2017/2021): der Block "Feste Einspeisevergütung"
//     (= anzulegender Wert − 0,4 ct, § 53 EEG).
// Die Zeiträume der Amtsdateien überlappen stark; jeder Monat wurde aus bis zu
// zehn Dateien unabhängig gezogen und quer-validiert (null Abweichungen).
// Bis 2016 veröffentlicht die Behörde die Kette UNGERUNDET; gespeichert ist
// hier die kaufmännisch auf 2 Stellen gerundete Form (wie in allen amtlichen
// Übersichten; Abweichung ≤ 0,005 ct). Ab 2017 sind die Werte amtlich gerundet.
//
// BEWUSSTE GRENZEN DES MODELLS:
//   · Vor dem 01.04.2012 (EEG 2011 und älter, inkl. Eigenverbrauchsvergütung
//     2009–2012) gibt es KEINE automatischen Sätze — andere Vergütungslogik,
//     der Rechner bietet dort die manuelle Eingabe aus dem Bescheid an.
//   · Es gab in dieser Ära nur EINEN Satz je Klasse — die getrennte (höhere)
//     Volleinspeisungs-Vergütung existiert erst seit dem EEG 2023 (30.07.2022).
//     Deshalb sind teil- und voll-Felder identisch belegt; die Oberfläche
//     blendet den Umschalter für diese Jahrgänge aus.
//   · Marktintegrationsmodell (§ 33 EEG 2012, >10–40-kWp-Anlagen 04/2012–
//     07/2014, wirksam nur Jan–Jul 2014, zum 01.08.2014 auch für Bestand
//     abgeschafft): wird nicht abgebildet — betrifft eine historische
//     Teilmenge weniger Monate und keine heutige Zahlung.

import type { FeedInRates } from "./feedin-config";

export interface ArchivFeedInRow {
  /** Inbetriebnahme-Monat (YYYY-MM). */
  ym: string;
  /** Feste Einspeisevergütung ct/kWh, Dachanlage bis 10 kWp. */
  u10: number;
  /** Feste Einspeisevergütung ct/kWh, Anlagenteil über 10 bis 40 kWp. */
  u40: number;
}

/** Erster Monat, für den die Archivtabelle gilt. */
export const FEED_IN_ARCHIV_START = "2012-04";

export const FEED_IN_ARCHIV: ReadonlyArray<ArchivFeedInRow> = [
  { ym: "2012-04", u10: 19.5, u40: 18.5 },
  { ym: "2012-05", u10: 19.31, u40: 18.32 },
  { ym: "2012-06", u10: 19.11, u40: 18.13 },
  { ym: "2012-07", u10: 18.92, u40: 17.95 },
  { ym: "2012-08", u10: 18.73, u40: 17.77 },
  { ym: "2012-09", u10: 18.54, u40: 17.59 },
  { ym: "2012-10", u10: 18.36, u40: 17.42 },
  { ym: "2012-11", u10: 17.9, u40: 16.98 },
  { ym: "2012-12", u10: 17.45, u40: 16.56 },
  { ym: "2013-01", u10: 17.02, u40: 16.14 },
  { ym: "2013-02", u10: 16.64, u40: 15.79 },
  { ym: "2013-03", u10: 16.28, u40: 15.44 },
  { ym: "2013-04", u10: 15.92, u40: 15.1 },
  { ym: "2013-05", u10: 15.63, u40: 14.83 },
  { ym: "2013-06", u10: 15.35, u40: 14.56 },
  { ym: "2013-07", u10: 15.07, u40: 14.3 },
  { ym: "2013-08", u10: 14.8, u40: 14.04 },
  { ym: "2013-09", u10: 14.54, u40: 13.79 },
  { ym: "2013-10", u10: 14.27, u40: 13.54 },
  { ym: "2013-11", u10: 14.07, u40: 13.35 },
  { ym: "2013-12", u10: 13.88, u40: 13.17 },
  { ym: "2014-01", u10: 13.68, u40: 12.98 },
  { ym: "2014-02", u10: 13.55, u40: 12.85 },
  { ym: "2014-03", u10: 13.41, u40: 12.72 },
  { ym: "2014-04", u10: 13.28, u40: 12.6 },
  { ym: "2014-05", u10: 13.14, u40: 12.47 },
  { ym: "2014-06", u10: 13.01, u40: 12.34 },
  { ym: "2014-07", u10: 12.88, u40: 12.22 },
  { ym: "2014-08", u10: 12.75, u40: 12.4 },
  { ym: "2014-09", u10: 12.69, u40: 12.34 },
  { ym: "2014-10", u10: 12.65, u40: 12.31 },
  { ym: "2014-11", u10: 12.62, u40: 12.28 },
  { ym: "2014-12", u10: 12.59, u40: 12.25 },
  { ym: "2015-01", u10: 12.56, u40: 12.22 },
  { ym: "2015-02", u10: 12.53, u40: 12.18 },
  { ym: "2015-03", u10: 12.5, u40: 12.15 },
  { ym: "2015-04", u10: 12.47, u40: 12.12 },
  { ym: "2015-05", u10: 12.43, u40: 12.09 },
  { ym: "2015-06", u10: 12.4, u40: 12.06 },
  { ym: "2015-07", u10: 12.37, u40: 12.03 },
  { ym: "2015-08", u10: 12.34, u40: 12 },
  { ym: "2015-09", u10: 12.31, u40: 11.97 },
  { ym: "2015-10", u10: 12.31, u40: 11.97 },
  { ym: "2015-11", u10: 12.31, u40: 11.97 },
  { ym: "2015-12", u10: 12.31, u40: 11.97 },
  { ym: "2016-01", u10: 12.31, u40: 11.97 },
  { ym: "2016-02", u10: 12.31, u40: 11.97 },
  { ym: "2016-03", u10: 12.31, u40: 11.97 },
  { ym: "2016-04", u10: 12.31, u40: 11.97 },
  { ym: "2016-05", u10: 12.31, u40: 11.97 },
  { ym: "2016-06", u10: 12.31, u40: 11.97 },
  { ym: "2016-07", u10: 12.31, u40: 11.97 },
  { ym: "2016-08", u10: 12.31, u40: 11.97 },
  { ym: "2016-09", u10: 12.31, u40: 11.97 },
  { ym: "2016-10", u10: 12.31, u40: 11.97 },
  { ym: "2016-11", u10: 12.31, u40: 11.97 },
  { ym: "2016-12", u10: 12.31, u40: 11.97 },
  { ym: "2017-01", u10: 12.3, u40: 11.96 },
  { ym: "2017-02", u10: 12.3, u40: 11.96 },
  { ym: "2017-03", u10: 12.3, u40: 11.96 },
  { ym: "2017-04", u10: 12.3, u40: 11.96 },
  { ym: "2017-05", u10: 12.27, u40: 11.93 },
  { ym: "2017-06", u10: 12.24, u40: 11.9 },
  { ym: "2017-07", u10: 12.2, u40: 11.87 },
  { ym: "2017-08", u10: 12.2, u40: 11.87 },
  { ym: "2017-09", u10: 12.2, u40: 11.87 },
  { ym: "2017-10", u10: 12.2, u40: 11.87 },
  { ym: "2017-11", u10: 12.2, u40: 11.87 },
  { ym: "2017-12", u10: 12.2, u40: 11.87 },
  { ym: "2018-01", u10: 12.2, u40: 11.87 },
  { ym: "2018-02", u10: 12.2, u40: 11.87 },
  { ym: "2018-03", u10: 12.2, u40: 11.87 },
  { ym: "2018-04", u10: 12.2, u40: 11.87 },
  { ym: "2018-05", u10: 12.2, u40: 11.87 },
  { ym: "2018-06", u10: 12.2, u40: 11.87 },
  { ym: "2018-07", u10: 12.2, u40: 11.87 },
  { ym: "2018-08", u10: 12.08, u40: 11.74 },
  { ym: "2018-09", u10: 11.95, u40: 11.62 },
  { ym: "2018-10", u10: 11.83, u40: 11.5 },
  { ym: "2018-11", u10: 11.71, u40: 11.38 },
  { ym: "2018-12", u10: 11.59, u40: 11.27 },
  { ym: "2019-01", u10: 11.47, u40: 11.15 },
  { ym: "2019-02", u10: 11.35, u40: 11.03 },
  { ym: "2019-03", u10: 11.23, u40: 10.92 },
  { ym: "2019-04", u10: 11.11, u40: 10.81 },
  { ym: "2019-05", u10: 10.95, u40: 10.65 },
  { ym: "2019-06", u10: 10.79, u40: 10.5 },
  { ym: "2019-07", u10: 10.64, u40: 10.34 },
  { ym: "2019-08", u10: 10.48, u40: 10.19 },
  { ym: "2019-09", u10: 10.33, u40: 10.04 },
  { ym: "2019-10", u10: 10.18, u40: 9.9 },
  { ym: "2019-11", u10: 10.08, u40: 9.79 },
  { ym: "2019-12", u10: 9.97, u40: 9.69 },
  { ym: "2020-01", u10: 9.87, u40: 9.59 },
  { ym: "2020-02", u10: 9.72, u40: 9.45 },
  { ym: "2020-03", u10: 9.58, u40: 9.31 },
  { ym: "2020-04", u10: 9.44, u40: 9.18 },
  { ym: "2020-05", u10: 9.3, u40: 9.04 },
  { ym: "2020-06", u10: 9.17, u40: 8.91 },
  { ym: "2020-07", u10: 9.03, u40: 8.78 },
  { ym: "2020-08", u10: 8.9, u40: 8.65 },
  { ym: "2020-09", u10: 8.77, u40: 8.53 },
  { ym: "2020-10", u10: 8.64, u40: 8.4 },
  { ym: "2020-11", u10: 8.48, u40: 8.24 },
  { ym: "2020-12", u10: 8.32, u40: 8.09 },
  { ym: "2021-01", u10: 8.16, u40: 7.93 },
  { ym: "2021-02", u10: 8.04, u40: 7.81 },
  { ym: "2021-03", u10: 7.92, u40: 7.7 },
  { ym: "2021-04", u10: 7.81, u40: 7.59 },
  { ym: "2021-05", u10: 7.69, u40: 7.47 },
  { ym: "2021-06", u10: 7.58, u40: 7.36 },
  { ym: "2021-07", u10: 7.47, u40: 7.25 },
  { ym: "2021-08", u10: 7.36, u40: 7.15 },
  { ym: "2021-09", u10: 7.25, u40: 7.04 },
  { ym: "2021-10", u10: 7.14, u40: 6.94 },
  { ym: "2021-11", u10: 7.03, u40: 6.83 },
  { ym: "2021-12", u10: 6.93, u40: 6.73 },
  { ym: "2022-01", u10: 6.83, u40: 6.63 },
  { ym: "2022-02", u10: 6.73, u40: 6.53 },
  { ym: "2022-03", u10: 6.63, u40: 6.44 },
  { ym: "2022-04", u10: 6.53, u40: 6.34 },
  { ym: "2022-05", u10: 6.43, u40: 6.25 },
  { ym: "2022-06", u10: 6.34, u40: 6.15 },
  { ym: "2022-07", u10: 6.24, u40: 6.06 },];

const byYm = new Map(FEED_IN_ARCHIV.map((r) => [r.ym, r]));

/**
 * Feste Einspeisevergütung für eine Bestandsanlage nach Inbetriebnahme-Datum
 * (04/2012 bis 29.07.2022) — oder null außerhalb dieses Fensters. Ab dem
 * 30.07.2022 übernimmt die EEG-2023-Kette in feedin-config; davor die manuelle
 * Eingabe. teil- und voll-Felder sind identisch (einheitlicher Satz, s. oben).
 */
export function feedInArchivRates(dateIso: string): FeedInRates | null {
  if (dateIso >= "2022-07-30") return null;
  const row = byYm.get(dateIso.slice(0, 7));
  if (!row) return null;
  return {
    teilUnder10: row.u10,
    teilOver10: row.u40,
    vollUnder10: row.u10,
    vollOver10: row.u40,
    thresholdKwp: 10,
    validFrom: `${row.ym}-01`,
    source: "Bundesnetzagentur, Archiv der Degressions- und Vergütungssätze (Dachanlagen, feste Einspeisevergütung)",
  };
}
