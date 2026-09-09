/**
 * Der Arbeitsstand je Presse-Kontakt — die einzige Stelle, die ihn kennt.
 *
 * Bewusst klein gehalten, aus demselben Grund wie bei den Fachbetrieben: Es gibt
 * keinen Versandweg. Zustände wie „angeschrieben" oder „Antwort erhalten" würden
 * einen Apparat behaupten, den es nicht gibt — und wer sie einträgt, glaubt
 * später, es sei etwas hinausgegangen. Wer sie ergänzen will, baut vorher den
 * Versand (und klärt vorher, was in docs/presse-katalog.md offen steht).
 *
 * DER STAND HÄNGT AM KONTAKT, NICHT AM MEDIUM. Angeschrieben wird ein Mensch:
 * Bei einem Fachtitel mit acht Redakteurinnen ist „Medium angesehen" keine
 * Auskunft, mit der sich arbeiten lässt.
 */

export const STAENDE = [
  { wert: "offen", text: "offen", hinweis: "noch nicht angesehen" },
  { wert: "vorgemerkt", text: "vorgemerkt", hinweis: "kommt für eine Ansprache infrage" },
  { wert: "angesehen", text: "angesehen", hinweis: "geprüft, vorerst nichts weiter" },
  { wert: "ungeeignet", text: "ungeeignet", hinweis: "passt nicht — Grund in die Notiz" },
] as const;

export type Stand = (typeof STAENDE)[number]["wert"];

export function istStand(s: string): s is Stand {
  return STAENDE.some((x) => x.wert === s);
}

/**
 * Die Kontaktarten, nach denen sich filtern lässt.
 *
 * Die Reihenfolge ist die Rangfolge der Vorgabe: ein benannter Mensch schlägt
 * ein Redaktionspostfach, ein Redaktionspostfach ein allgemeines, und der
 * Werbekontakt steht ganz unten, weil er nur als Notnagel erfasst wird.
 */
export const KONTAKTARTEN = [
  { wert: "person", text: "persönliche Adresse" },
  { wert: "redaktion", text: "Redaktionspostfach" },
  { wert: "allgemein", text: "allgemeines Postfach" },
  { wert: "person-ohne-namen", text: "persönliche Adresse ohne Namen" },
  { wert: "formular", text: "Kontaktformular" },
  { wert: "werblich", text: "nur Werbekontakt" },
] as const;

/**
 * Die Geschichten, auf die der Katalog zuordnet.
 *
 * Sie stehen hier als FILTERLISTE für die Ansicht; erzeugt werden sie aus den
 * gemessenen Themen (`lib/presse-extrakt.ts`). Zwei Listen wären eine zu viel —
 * deshalb prüft ein Test, dass diese hier nichts enthält, was dort nicht
 * entstehen kann.
 */
export const GESCHICHTEN = [
  "Solarzubau und Rankings",
  "Balkonkraftwerke",
  "Speicher",
  "Kommunale Förderung",
  "Strommix und Energiepreise",
  "Regionale Daten",
  "Methoden-, Fehler- und Datenqualitätsgeschichten",
] as const;

export const PAKETE = [
  { wert: 1, text: "1 · bundesweite Fachmedien" },
  { wert: 2, text: "2 · Regionalmedien" },
  { wert: 3, text: "3 · Newsletter, Podcasts, Creator" },
  { wert: 4, text: "4 · Prüfliste aus der Suche" },
] as const;

/**
 * DIE RUBRIK BESTIMMT DEN AUFHÄNGER, NICHT DIE EIGNUNG (Betreiber, 05.09.2026).
 *
 * Es gibt kein Ausschlusskriterium mehr — auch nicht den eigenen Rechner
 * („evtl. bieten wir das bessere tool"). Ein Händler oder Hersteller ist eine
 * andere ANSPRACHE, Vertrieb statt Redaktion, keine Absage.
 */
export const RUBRIK_TEXT: Record<string, string> = {
  fachmedium: "Fachmedium",
  allgemein: "Allgemeines Medium",
  regional: "Regionalmedium",
  startup: "Startup, Vibe Coding, UX",
  creator: "Creator",
  portal: "Portal",
  haendler: "Händler",
  hersteller: "Hersteller",
  verband: "Verband",
  institut: "Institut",
  behoerde: "Behörde",
};
