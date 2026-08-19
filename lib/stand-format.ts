// ─── Form der Stand-Zeile: Typen und Datums-Wortlaut, ohne jede Config ───────
//
// Getrennt von `lib/stand.ts`, weil das eine Bündelfrage ist (Befund des
// Prüfagenten, 17.08.2026): `stand.ts` importiert sieben Config-Module, damit
// kein Datum handgetippt wird — richtig für die Tabelle, aber tödlich, sobald
// eine CLIENT-Komponente die Stand-Zeile rendert. Dann liegen Wärmepumpen-,
// Grüngas-, CO₂-, EEG-Reform-, Einspeise- und Balkon-Config im Browser-Bundle
// einer Seite, die von keiner davon ein Wort braucht.
//
// Also: Die Auflösung `pfad → Datensatz` passiert auf dem Server (`stand.ts`),
// das Rendern kann überall passieren (`components/StandNoteView.tsx`) — und
// dieses Modul hier ist alles, was beide Seiten teilen müssen.

/** `tag` = YYYY-MM-DD (eine Prüfung an einem Tag), `monat` = YYYY-MM (ein
 *  Datenstand, den taggenau anzugeben Genauigkeit vortäuschen würde). */
export type StandPraezision = "tag" | "monat";

export interface StandEintrag {
  /** Was geprüft wurde — in der Sprache der Seite, nicht der des Codes. */
  was: string;
  /** ISO-Datum aus der Config, die den Wert trägt. Nie hier getippt. */
  iso: string;
  praezision: StandPraezision;
  /**
   * Stand der Werte selbst (`validFrom`). Die Stand-Zeile zeigt ihn IMMER neben
   * dem Prüfdatum — beide Zahlen beantworten verschiedene Fragen, und wer die
   * zweite nur bei Abweichung sieht, lernt nie, dass es sie gibt.
   *
   * Fehlt hier, wo es keinen Wertstand GIBT: Eine Rechtsaussage ist geltendes
   * Recht oder nicht; ein Datum dafür müsste man erfinden.
   *
   * Dies — nicht das Prüfdatum — ist die Grundlage des `lastmod` der Sitemap
   * (siehe `standLastModIso`).
   */
  wertIso?: string;
}

export interface StandSeite {
  /** Geprüfte Stände. Leer, wenn die Seite ausschließlich live rechnet. */
  eintraege: StandEintrag[];
  /** Werte, die bei jedem Aufruf frisch geholt werden — ohne Stichtag. */
  live: string[];
}

/** „Juli 2026" aus „2026-07". */
export const monatJahr = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("de-DE", { month: "long", year: "numeric" });

/** „16. August 2026" aus „2026-08-16". */
export const tagMonatJahr = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
