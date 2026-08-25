/**
 * Historische EEG-Einspeisevergütung für kleine Dach-Solaranlagen, 2000–2026.
 *
 * Werte in ct/kWh, jeweils der Vergütungssatz BEI INBETRIEBNAHME im genannten
 * Jahr (nicht laufende Zahlungen an Altanlagen) für die kleinste Dach-Klasse.
 * Der Satz gilt danach 20 Jahre fest.
 *
 * Metrik über die Reihe (bewusst konsistent gehalten):
 *   • 2000–2008: Dachanlage ≤30 kW (die 10-kWp-Klasse existierte noch nicht)
 *   • 2009–2022: Dachanlage ≤10 kWp
 *   • ab 2023:   Teileinspeisung (Überschusseinspeisung) ≤10 kWp
 *   Referenzzeitpunkt: Wert zu Jahresbeginn. Ab April 2012 sank der Satz
 *   unterjährig (erst monatlich, ab 2021 halbjährlich) — der Jahreswert ist
 *   also ein Jahresanfangs-Repräsentant, kein Jahresmittel.
 *
 * BRUCH 2022→2023: Mit der EEG-2023-Reform (Sätze ab 30.07.2022) wurde die
 *   Vergütung erstmals wieder ANGEHOBEN und in Teil-/Volleinspeisung geteilt.
 *   Die Reihe springt daher 2022→2023 nach oben (6,83 → 8,20). Das ist real,
 *   kein Datenfehler — im Chart als Marker "EEG-2023-Reform" annotiert.
 *
 * Quellen:
 *   • Bundesnetzagentur, archivierte EEG-Vergütungssätze (amtlich, monatsgenau) —
 *     maßgeblich für 2012–heute.
 *   • Solarenergie-Förderverein Deutschland (SFV), EEG-Vergütungstabellen —
 *     Werte 2000–2012.
 *   Diese Sätze sind gesetzlich festgelegte EEG-Werte (§§ 48/49 EEG bzw.
 *   Vorgänger) — öffentliche Fakten. Die Januar-Werte 2013–2022 wurden zusätzlich
 *   gegen die Monatstabellen von solarbranche.de und solarcheck-deutschland.de
 *   (beide BNetzA-basiert) abgeglichen (u. a. 2017 = 12,30; 2019 = 11,47
 *   korrigiert). Am 04.08.2026 zusätzlich Zelle für Zelle gegen die
 *   BNetzA-ORIGINALDATEIEN geprüft (docs/quellen/bnetza-archiv/, Monatstabelle
 *   in lib/feedin-archiv.ts): dabei 2014 = 13,68 (vorher fälschlich 13,15) und
 *   2015 = 12,56 (vorher 12,41) korrigiert. Der Kohärenz-Test in
 *   lib/__tests__/feedin-archiv.test.ts hält diese Reihe seither zellgenau an
 *   den amtlichen Januar-Werten fest. 2022 = 6,83 ist bewusst der Januar-Wert vor der EEG-2023-Reform;
 *   die Anhebung auf 8,20 (Teileinspeisung) galt erst ab 30.07.2022 und steht
 *   daher in der Reihe bei 2023.
 *
 * WARTUNG: Der aktuelle Satz kommt separat aus lib/feedin-config.ts (Live-Wert
 *   für den Rechner). Diese Reihe ist ein historischer Stichtags-Datenstand und
 *   wächst nur nach unten (neues Jahr anhängen). Der Januar-Lauf des Wächters
 *   `eeg-verguetung-verify-halbjaehrlich` hängt den neuen Jahreswert automatisch
 *   an — Prozedur in scripts/zubau-story-verify.md (Teil A). Kein manuelles
 *   Nachpflegen nötig.
 */

export const FEEDIN_HISTORY_META = {
  unit: "ct/kWh",
  metric: "EEG-Einspeisevergütung kleine Dachanlage bei Inbetriebnahme",
  source: "Bundesnetzagentur (EEG-Vergütungssätze) & Solarenergie-Förderverein",
  sourceUrl:
    "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/EEG_Foerderung/start.html",
  license: null,
  dataAsOf: "2026-02",
} as const;

export const FEEDIN_HISTORY_YEARS: number[] = [
  2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012,
  2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
  2026,
];

/** ct/kWh, index-gleich zu FEEDIN_HISTORY_YEARS. */
export const FEEDIN_HISTORY_VALUES: number[] = [
  50.62, 50.62, 48.1, 45.7, 57.4, 54.53, 51.8, 49.21, 46.75, 43.01, 39.14,
  28.74, 24.43, 17.02, 13.68, 12.56, 12.31, 12.3, 12.2, 11.47, 9.87, 8.16, 6.83,
  // 2023–2026: Werte zum 1. JANUAR, wie die Metrik oben es sagt. Bis zum
  // 25.08.2026 standen hier die Februar-Werte (8,11 / 7,94 / 7,78) — die Reihe
  // hielt ihre eigene Metrik ab 2024 nicht mehr ein. Aufgefallen ist es erst in
  // der Inhalts-Inventur, weil der Kohärenztest nur bis 2022 reichte: genau dort
  // beginnt die Lücke. Dass 2023 und 2024 gleich sind, ist richtig — die
  // Degression setzte erst zum 01.02.2024 wieder ein.
  8.2, 8.2, 8.03, 7.86,
];
