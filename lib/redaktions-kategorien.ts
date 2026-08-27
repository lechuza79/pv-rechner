// Die Kategorien der Redaktionsansicht — und was „Design je Kategorie" heißt.
//
// Eine Kategorie ist keine Ablagestruktur, sondern eine AUSSAGEFORM: Was
// behauptet ein Beitrag dieser Art, und woran erkennt man, dass die Behauptung
// trägt. Daran hängt das Design, deshalb steht der Vorgabe-Stil hier und nicht
// in der Ansicht.
//
// Was hier bewusst NICHT steht: welche Bildform (Balkenpaar oder Einzelzahl) die
// Kategorie benutzt. Die entscheidet sich an den Zahlen, nicht am Thema — 1,20
// gegen 1,45 Millionen sind zwei fast gleich lange Balken über ein Fünftel
// Wachstum, und derselbe Beitrag braucht dann die Einzelkennzahl, obwohl er
// eindeutig von Bewegung handelt. Eine Kategorie, die die Form vorschreibt,
// würde entweder gebrochen oder erzwänge ein Bild, das nichts zeigt.
//
// Ebenfalls nicht hier: die neunzehn Geschichten-FAMILIEN aus dem Katalog. Die
// sind Themen und schneiden quer — Balkonkraftwerke liefern sowohl einen
// Kontrast (Stadt gegen Land) als auch eine Bewegung (Wachstum). Eine Zuordnung
// Familie → Kategorie wäre in beiden Richtungen falsch; der Vorrat steht deshalb
// in der Planung (lib/redaktionsplan.ts).

import { KARTEN_STIL_STANDARD, type KartenStil } from "./social-karten-stil";

export type KategorieSchluessel = "kontrast" | "bewegung" | "aufteilung" | "groessenordnung";

export type Kategorie = {
  schluessel: KategorieSchluessel;
  /** Beschriftung in der Navigation. Kurz, damit die Leiste einzeilig bleibt. */
  kurz: string;
  /** Überschrift über den Stories. */
  name: string;
  /** Ein bis zwei Sätze: was diese Kategorie behauptet und woran sie scheitert. */
  beschreibung: string;
  /**
   * Der ausgearbeitete Stil dieser Kategorie — Vorgabe für ihre Stories.
   *
   * Eine Story darf abweichen; die Ansicht zeigt das dann an. Ohne sichtbare
   * Abweichung wäre die Vorgabe eine Behauptung: Man sähe nicht, ob eine Karte
   * dem Kategorie-Design folgt oder zufällig genauso aussieht.
   */
  stil: KartenStil;
};

export const KATEGORIEN: Kategorie[] = [
  {
    schluessel: "kontrast",
    kurz: "Kontrast",
    name: "Kontrast",
    beschreibung:
      "Zwei Gruppen, die sich unterscheiden sollten und es nicht tun — oder umgekehrt. Trägt nur, wenn beide Gruppen benannt sind statt aus einer Sortierung erraten, und wenn die Balkenlängen den Unterschied wirklich zeigen.",
    stil: KARTEN_STIL_STANDARD,
  },
  {
    schluessel: "bewegung",
    kurz: "Bewegung",
    name: "Bewegung",
    beschreibung:
      "Was sich verändert hat und wie schnell. Die Falle ist der Vergleich zweier Veränderungen: Zwei Prozentbalken nebeneinander vergleichen Raten, nicht Größen — dann steht die Aussage im Titel und im Bild der Bestand.",
    stil: "highlight",
  },
  {
    schluessel: "aufteilung",
    kurz: "Aufteilung",
    name: "Aufteilung",
    beschreibung:
      "Wie sich ein Ganzes verteilt. Jeder Anteil braucht seinen Nenner sichtbar — sonst ist der größte Balken eine Aussage über eine Grundmenge, die niemand kennt.",
    stil: KARTEN_STIL_STANDARD,
  },
  {
    schluessel: "groessenordnung",
    kurz: "Größenordnung",
    name: "Größenordnung",
    beschreibung:
      "Eine Zahl, die man sich nicht vorstellen kann, mit einem Maßstab daneben. Ohne den Maßstab ist es eine Zahlentafel; mit einer zu kleinen Grundmenge ein Superlativ, der vollständig im Nenner entsteht.",
    stil: "dunkel",
  },
];

export function kategorie(schluessel: KategorieSchluessel): Kategorie {
  const k = KATEGORIEN.find((x) => x.schluessel === schluessel);
  // Kein stiller Rückfall: Eine unbekannte Kategorie ist ein Tippfehler im Code,
  // und der soll auffallen, statt die Story unter „Kontrast" einzusortieren.
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
