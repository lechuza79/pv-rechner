// Das VERGLEICHSFELD einer Rangliste: gegen wen ein Ort gemessen wird.
//
// WARUM EIN FELD UND NICHT ZWEI ACHSEN: Größenklasse und Rolle (Landeshauptstadt,
// kreisfrei) schließen sich als Vergleichsfeld gegenseitig aus — man vergleicht
// entweder unter Gleichgroßen oder unter Gleichartigen, nicht in einer Matrix aus
// beidem. Fünf Größenklassen × drei Rollen wären fünfzehn Listen je Kategorie,
// von denen die meisten zwei Zeilen hätten (kreisfreie Kleingemeinden gibt es
// nicht). Deshalb: eine Auswahl, sieben Felder, jedes für sich sinnvoll.
//
// WARUM DIESE ROLLEN UND KEINE ANDEREN (gemessen am 30.07.2026):
//  - Regierungssitze der Länder (16): schneiden quer zur Größe — 15 sind
//    Großstädte, Schwerin liegt mit 98.308 Einwohnern darunter. Jeder Name ist
//    bekannt.
//  - Kreisfreie Städte (106): echte Verwaltungsklasse, die ihre Energieplanung
//    selbst verantwortet. Verteilt auf Mittel- und Großstädte.
//  - Große Kreisstädte (125): BEWUSST NICHT. Das ist Landesrecht und existiert
//    praktisch nur in Baden-Württemberg, Bayern und Sachsen. Die gemessene
//    Spitze war Oberkirch, Leutkirch, Horb, Ehingen, Laupheim — fünf von fünf
//    aus Baden-Württemberg. Eine „bundesweite" Liste wäre eine BW-Liste mit
//    falschem Titel.
//  - Bundesländer: BEWUSST NICHT. Die Rangliste der 16 Länder steht schon auf
//    der Atlas-Deutschlandseite; ein zweites Mal wäre dieselbe Tabelle.
//  - Kreisstädte: nicht möglich — welcher Ort Kreissitz ist, steht nicht in
//    unseren Daten.

import type { GemeindeStats } from "./awards";
import { GROESSENKLASSEN, klasseLangform, klasseVon } from "./gemeindegroesse";

/**
 * Die 16 Regierungssitze der Länder über ihren Gemeindeschlüssel, NICHT über
 * den Namen.
 *
 * Der Name reicht nicht: Neben Schwerin (13004000, 98.308 Einwohner) gibt es
 * eine Gemeinde Schwerin in Brandenburg (12061448, 965 Einwohner). Eine
 * Namensliste fing die mit — sichtbar wurde das erst, als die
 * 965-Einwohner-Gemeinde mit 587 Wp je Kopf die Rangliste anführte. Der
 * Schlüssel ist eindeutig, der Name ist es nicht.
 */
export const LANDESHAUPTSTAEDTE: Record<string, string> = {
  "01002000": "Kiel",
  "02000000": "Hamburg",
  "03241001": "Hannover",
  "04011000": "Bremen",
  "05111000": "Düsseldorf",
  "06414000": "Wiesbaden",
  "07315000": "Mainz",
  "08111000": "Stuttgart",
  "09162000": "München",
  "10041100": "Saarbrücken",
  "11000000": "Berlin",
  "12054000": "Potsdam",
  "13004000": "Schwerin",
  "14612000": "Dresden",
  "15003000": "Magdeburg",
  "16051000": "Erfurt",
};

/**
 * DREI DER SECHZEHN SIND KEINE LANDESHAUPTSTADT.
 *
 * „Landeshauptstadt" ist keine Beschreibung, sondern eine kommunalrechtliche
 * Bezeichnung, die einer STADT verliehen wird. Berlin, Hamburg und Bremen sind
 * Stadtstaaten: Dort ist das Land die Stadt, es gibt also keine Stadt im Land,
 * der man den Titel verleihen könnte. Dreizehn Städte führen ihn (Dresden,
 * Düsseldorf, Erfurt, Hannover, Kiel, Magdeburg, Mainz, München, Potsdam,
 * Saarbrücken, Schwerin, Stuttgart, Wiesbaden), diese drei nicht.
 *
 * Geprüft am 01.08.2026: Die Landesverfassung der Freien Hansestadt Bremen
 * (Fassung vom 12.08.2019, Transparenzportal Bremen) kennt die Wörter
 * „Hauptstadt" und „Landeshauptstadt" überhaupt nicht; Art. 143 macht Bremen
 * und Bremerhaven zu zwei Gemeinden des Landes, ohne eine davon zur Hauptstadt
 * zu erklären.
 *
 * WARUM DAS HIER STEHT UND NICHT NUR IM TEXT: Die Überschrift behauptete „die
 * 16 Landeshauptstädte" — eine handgetippte Zahl neben einer handgetippten
 * Bezeichnung, beide falsch. Die Zahlen unten werden aus dieser Liste
 * gerechnet; wer einen Eintrag ändert, ändert die Beschriftung mit.
 *
 * Die AUSWAHL bleibt bei allen sechzehn: Verglichen werden soll, wo die
 * Landesregierung sitzt — das trifft auf die Stadtstaaten genauso zu.
 */
export const STADTSTAATEN = new Set(["02000000", "04011000", "11000000"]);

const ANZAHL_STADTSTAATEN = Object.keys(LANDESHAUPTSTAEDTE).filter((ags) => STADTSTAATEN.has(ags)).length;
const ANZAHL_LANDESHAUPTSTAEDTE = Object.keys(LANDESHAUPTSTAEDTE).length - ANZAHL_STADTSTAATEN;

/** Amtliche Bezeichnungen, die eine kreisfreie Stadt ausmachen. „Stadtkreis" ist
 *  dasselbe in Baden-Württemberg. */
const KREISFREI = new Set(["Kreisfreie Stadt", "Stadtkreis"]);

export type FeldArt = "groesse" | "rolle";

export type RankingFeld = {
  slug: string;
  /** Sammelbegriff im Plural — trägt Umschalter und Fließtext. */
  label: string;
  /** Einzahl, für den Spaltenkopf. */
  einzahl: string;
  /** Dativ Plural für "unter den …" — von Hand gepflegt, siehe gemeindegroesse.ts. */
  labelDativ: string;
  /** Ausgeschrieben für die Überschrift, mit Einwohnerspanne wo es eine gibt. */
  langform: string;
  art: FeldArt;
  gilt: (g: GemeindeStats) => boolean;
};

const groessenFelder: RankingFeld[] = GROESSENKLASSEN.map((k) => ({
  slug: k.slug,
  label: k.label,
  einzahl: k.einzahl,
  labelDativ: k.labelDativ,
  langform: klasseLangform(k),
  art: "groesse" as const,
  gilt: (g: GemeindeStats) => klasseVon(g.population)?.slug === k.slug,
}));

const rollenFelder: RankingFeld[] = [
  {
    // Das Kürzel steht in der Adresse und bleibt, damit geteilte Links halten.
    slug: "landeshauptstaedte",
    label: "Landeshauptstädte und Stadtstaaten",
    einzahl: "Landeshauptstadt oder Stadtstaat",
    labelDativ: "Landeshauptstädten und Stadtstaaten",
    langform: `die ${ANZAHL_LANDESHAUPTSTAEDTE} Landeshauptstädte und ${ANZAHL_STADTSTAATEN} Stadtstaaten`,
    art: "rolle",
    gilt: (g) => g.regionId in LANDESHAUPTSTAEDTE,
  },
  {
    slug: "kreisfreie-staedte",
    label: "Kreisfreie Städte",
    einzahl: "Kreisfreie Stadt",
    labelDativ: "kreisfreien Städten",
    langform: "kreisfreie Städte und Stadtkreise",
    art: "rolle",
    gilt: (g) => KREISFREI.has(g.bezeichnung),
  },
];

export const RANKING_FELDER: RankingFeld[] = [...groessenFelder, ...rollenFelder];

export const FELD_BY_SLUG: Record<string, RankingFeld> = Object.fromEntries(
  RANKING_FELDER.map((f) => [f.slug, f]),
);

export function felderNachArt(art: FeldArt): RankingFeld[] {
  return RANKING_FELDER.filter((f) => f.art === art);
}
