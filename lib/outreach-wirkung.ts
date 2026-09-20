/**
 * Hat die Ansprache gewirkt? Eine Messung für ALLE Bestände.
 *
 * Bisher beantwortete das nur der Kommunen-Stand, und er zählte an einer
 * Stelle falsch: Nidda verlinkt uns mit einer eigenen Seite zum
 * Balkonsolar-Programm und galt trotzdem nur als „geantwortet", weil
 * Verweis-Prüfung und Stand zwei getrennte Dinge waren (gemessen 20.09.2026).
 * Diese Messung liest beides aus derselben Quelle.
 *
 * DER TAKT HÄNGT AM VERSAND, NICHT AM KALENDER. Ein Monatslauf misst bei einem
 * Schub vom 2. des Monats etwas anderes als bei einem vom 28. — und beantwortet
 * die eigentliche Frage nicht, nämlich wie lange eine Wirkung auf sich warten
 * lässt. Gemessen wird deshalb 3, 7, 14 und 28 Tage nach dem Versandtag.
 *
 * Was NICHT gezählt werden kann, steht als Satz dabei: Veröffentlichungen ohne
 * Verweis (Print, App-Plattformen, soziale Netze) sieht diese Messung nicht.
 */

/** Tage nach dem Versand, an denen gemessen wird. Danach passiert nichts mehr. */
export const MESSPUNKTE = [3, 7, 14, 28] as const;

export type Bestand = "kommunen" | "fachbetriebe" | "versorger" | "presse";

export type Messung = {
  bestand: Bestand;
  /** Tag des Versands, auf den sich diese Messung bezieht. */
  versand_am: string;
  /** Der Messpunkt: 3, 7, 14 oder 28 Tage danach. */
  tage: number;
  angeschrieben: number;
  geantwortet: number;
  /** Zielseiten, die uns nachweislich verlinken. */
  verlinkt: number;
  /** Eintragungen ins Abo aus angeschriebenen Orten (nur Kommunen). */
  angemeldet: number;
  gemessen_am: string;
};

export const WIRKUNG_DDL = `
CREATE TABLE IF NOT EXISTS outreach_wirkung (
  bestand text NOT NULL,
  versand_am date NOT NULL,
  tage integer NOT NULL,
  angeschrieben integer NOT NULL DEFAULT 0,
  geantwortet integer NOT NULL DEFAULT 0,
  verlinkt integer NOT NULL DEFAULT 0,
  angemeldet integer NOT NULL DEFAULT 0,
  gemessen_am date NOT NULL DEFAULT current_date,
  PRIMARY KEY (bestand, versand_am, tage)
);
ALTER TABLE outreach_wirkung ENABLE ROW LEVEL SECURITY;
`;

/**
 * Welche Messpunkte sind heute fällig? Ein verpasster Tag wird nachgeholt —
 * der Lauf kann ausfallen, die Messung soll dann nicht für immer fehlen. Was
 * schon gemessen ist, wird nie überschrieben: Der Wert an Tag 7 ist eine
 * Aussage über Tag 7, nicht über heute.
 */
export function faelligeMesspunkte(
  versandAm: string,
  heuteIso: string,
  schonGemessen: readonly number[] = [],
): number[] {
  const tageSeit = Math.floor((Date.parse(heuteIso) - Date.parse(versandAm)) / 86_400_000);
  if (!(tageSeit >= 0)) return [];
  return MESSPUNKTE.filter(t => t <= tageSeit && !schonGemessen.includes(t));
}

/**
 * Wurde dieser Punkt am Tag gemessen, den er behauptet? Nachgeholte und
 * rückwirkend aufgefüllte Punkte tragen den Stand von HEUTE — an Tag 3 stand
 * womöglich weniger da. Wer das nicht dazuschreibt, verkauft eine Nachmessung
 * als Verlaufskurve.
 */
export function nachtraeglich(versandAm: string, tage: number, gemessenAm: string): boolean {
  const soll = Date.parse(versandAm) + tage * 86_400_000;
  return Date.parse(gemessenAm) - soll > 86_400_000;
}

/** Kostet ein Lauf etwas? Nur der Verweis-Abruf, und nur wenn wirklich gemessen wird. */
export function kostenHinweis(messpunkte: number): string {
  return messpunkte === 0
    ? "kein Messpunkt fällig — kein Abruf, keine Kosten"
    : `${messpunkte} Messpunkt${messpunkte === 1 ? "" : "e"} · ein Verweis-Abruf (~0,03 $)`;
}

/** Der Satz zur Lücke — er gehört an jede Auswertung, nicht in eine Fußnote. */
export const WIRKUNG_UNSICHTBAR =
  "Nicht sichtbar: Veröffentlichungen ohne Verweis auf uns (Print, App-Plattformen, soziale Netze).";
