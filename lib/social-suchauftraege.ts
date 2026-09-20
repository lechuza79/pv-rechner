// Wonach in welcher Kategorie gesucht wird.
//
// AN DER KATEGORIE, NICHT DANEBEN. „Die Anomalie als offene Frage" sagt bereits,
// dass dort Ausreißer gesucht werden; „Der Vergleich: Rang und Kontrast" sagt es
// für Kontraste. Diese Liste schreibt das nur aus — sie erfindet keine zweite
// Ordnung, sondern nennt je Kategorie, welche gemessene Größe das Muster füttert
// und in welchem Raum verglichen wird.
//
// DER ERTRAG HÄNGT AN DREI ACHSEN, nicht an der Zahl der Aufträge: Metrik ×
// Gruppierung × Vergleichsraum. Der erste Anlauf hatte sechs Aufträge über eine
// Gruppierung auf Bundesebene und fand fünf Sätze — nicht weil in den Daten
// nichts steckt, sondern weil er fast nichts angesehen hat.
//
// WARUM NICHT IM KATALOG SELBST: Die Kategorien beschreiben, was eine Familie
// BEHAUPTET; hier steht, aus welcher Größe der Fund entsteht. Beides in einen
// Eintrag zu ziehen hieße, dass jede Kategorie eine Metrik haben MUSS — und die
// redaktionellen Familien („Der eigene Fehler", „Frag den Datensatz") haben
// keine.

import type { GemeindeStats } from "./awards";
import type { MusterArt } from "./social-funde";

export type Gruppierung = "groessenklasse" | "bundesland" | "ost-west";

export type Suchauftrag = {
  /** Die Redaktions-Kategorie, in die der Fund gehört. */
  kategorie: string;
  muster: MusterArt;
  /** Schlüssel der Award-Kategorie, die die Zahlen liefert. */
  metrik: string;
  /** Beim Kontrast: wonach gruppiert wird. */
  gruppierung?: Gruppierung;
  /** Beim Ausreißer: in welchem Raum „typisch" gilt. */
  raum?: "bund" | "bundesland" | "groessenklasse";
};

/**
 * Die Metriken, aus denen sich Geschichten bauen lassen.
 *
 * NICHT ALLE achtzehn: Die Standort-Metriken für Wind, Biomasse und Wasser
 * gehören nicht zu diesem Produkt, und die absoluten Größen messen vor allem
 * Einwohnerzahl. Was bleibt, sind die Pro-Kopf- und Tempo-Größen — die, bei
 * denen ein Unterschied etwas über Verhalten sagt statt über Größe.
 */
const METRIKEN = [
  "balkon-pk",
  "dach-privat-pk",
  "batterie-privat-pk",
  "speicherquote",
  "tempo-1j",
  "tempo-3j",
  "tempo-5j",
] as const;
// AUSDRÜCKLICH DRAUSSEN: die Standort-Größen für Solar und Freifläche. Sie sind
// absolut, und der erste Lauf zeigte sofort, was das heißt — „Nordrhein-Westfalen
// liegt 57,5-mal so hoch wie Rheinland-Pfalz" stand als stärkster Fund ganz oben
// und misst nichts als die Größe der Gemeinden in beiden Ländern. Dasselbe bei
// den Ausreißern: Ein Dorf mit einem Solarpark lag beim 775-fachen des Medians,
// und „ohne dass wir wüssten, warum" ist dort schlicht falsch — wir wissen es.
// Der Kommentar über dieser Liste hatte das schon gesagt; die beiden standen
// trotzdem drin.

/**
 * Ost und West, aus dem Gemeindeschlüssel.
 *
 * Die erste Ziffernpaarung ist das Bundesland. Berlin (11) bleibt ABSICHTLICH
 * draußen: Die Stadt war geteilt, und sie einer Seite zuzuschlagen wäre eine
 * Aussage, die die Daten nicht hergeben.
 */
const OST = new Set(["12", "13", "14", "15", "16"]);

export function bundeslandSchluessel(g: GemeindeStats): string | null {
  const s = g.regionId?.slice(0, 2);
  return s && s.length === 2 ? s : null;
}

export function ostWest(g: GemeindeStats): string | null {
  const land = bundeslandSchluessel(g);
  if (!land || land === "11") return null;
  return OST.has(land) ? "Orte im Osten" : "Orte im Westen";
}

/**
 * Alle Aufträge, aus den Achsen aufgespannt.
 *
 * Ausgeschrieben wären das über achtzig Zeilen, die sich in drei Werten
 * unterscheiden — eine Liste, die niemand pflegt und in der ein fehlender
 * Eintrag nicht auffällt. Die Achsen dagegen sind lesbar: Was gesucht wird,
 * steht in ihren Namen.
 */
export const SUCHAUFTRAEGE: Suchauftrag[] = [
  // „Der Vergleich: Rang und Kontrast" — zwei Seiten, beide benannt.
  ...METRIKEN.flatMap((metrik) =>
    (["groessenklasse", "bundesland", "ost-west"] as const).map((gruppierung) => ({
      kategorie: "g3",
      muster: "kontrast" as const,
      metrik,
      gruppierung,
    })),
  ),

  // „Die Anomalie als offene Frage" — ein Ort, der aus der Reihe fällt. Der
  // Vergleichsraum entscheidet, was „aus der Reihe" heißt: Gegen ganz
  // Deutschland gewinnen immer dieselben drei; innerhalb des eigenen Landes
  // oder der eigenen Größenklasse wird daraus eine andere Aussage.
  ...METRIKEN.flatMap((metrik) =>
    (["bund", "bundesland", "groessenklasse"] as const).map((raum) => ({
      kategorie: "g10",
      muster: "ausreisser" as const,
      metrik,
      raum,
    })),
  ),
];
