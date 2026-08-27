// Die Kategorien der Redaktionsansicht — abgeleitet aus den Geschichten-Familien.
//
// Sie werden hier NICHT ein zweites Mal aufgezählt. Ein erster Anlauf tat das
// mit einer eigenen Ordnung nach Aussageform (Kontrast, Bewegung, Aufteilung …)
// und ließ die Familien daneben stehen: zwei Ordnungen für dieselbe Sache, und
// die erfundene stand in der Ansicht, während die beschlossene in der Planung
// lag. Wer eine Kategorie ändern wollte, hätte raten müssen, welche Liste gilt.
//
// Was hier bleibt, ist die Übersetzung von der Adresse zur Familie — und was
// eine Kategorie NICHT bestimmt: die Bildform (Ringpaar, Säule, Balken,
// Einzelzahl) und das Farbschema. Die Form entscheidet sich an den Zahlen, nicht
// am Thema — 1,20 gegen 1,45 Millionen sind zwei fast gleich lange Balken über
// ein Fünftel Wachstum, und derselbe Beitrag braucht dann die Einzelkennzahl,
// obwohl er eindeutig von Bewegung handelt. Das Farbschema ist eine Entscheidung
// je Post.

import { FAMILIEN, type Familie } from "./redaktionsplan";

export type Kategorie = Familie;
export type KategorieSchluessel = string;

export const KATEGORIEN: Kategorie[] = FAMILIEN;

export function kategorie(schluessel: KategorieSchluessel): Kategorie {
  const k = KATEGORIEN.find((x) => x.schluessel === schluessel);
  // Kein stiller Rückfall: Eine unbekannte Kategorie ist ein Tippfehler im Code,
  // und der soll auffallen, statt die Story unter der erstbesten einzusortieren.
  if (!k) throw new Error(`Unbekannte Kategorie: ${schluessel}`);
  return k;
}

/**
 * Die Kategorie aus der Adresse. Unbekanntes fällt auf die erste zurück —
 * anders als im Code ist ein falscher Adressteil kein Fehler, sondern ein alter
 * Link oder ein Vertipper, und eine Fehlerseite wäre dafür die falsche Antwort.
 */
export function kategorieAusAdresse(wert: string | undefined): Kategorie {
  return KATEGORIEN.find((k) => k.schluessel === wert) ?? KATEGORIEN[0];
}
