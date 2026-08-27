// Die Kategorien der Redaktionsansicht.
//
// Eine Kategorie ist keine Ablagestruktur, sondern eine AUSSAGEFORM: Was
// behauptet ein Beitrag dieser Art, und woran erkennt man, dass die Behauptung
// trägt.
//
// Was hier NICHT steht: das Farbschema. Es ist eine Entscheidung je Post
// (Betreiber, 27.08.2026) — zwei Beiträge derselben Kategorie dürfen in einer
// Woche verschieden aussehen, und ein Vorgabewert an dieser Stelle hätte
// verlangt, jede Abweichung als solche auszuweisen.
//
// Ebenso wenig die Bildform (Ringpaar, Balken oder Einzelzahl). Die entscheidet
// sich an den Zahlen, nicht am Thema — 1,20
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

export type KategorieSchluessel = "kontrast" | "bewegung" | "aufteilung" | "groessenordnung";

export type Kategorie = {
  schluessel: KategorieSchluessel;
  /** Beschriftung in der Navigation. Kurz, damit die Leiste einzeilig bleibt. */
  kurz: string;
  /** Überschrift über den Stories. */
  name: string;
  /** Ein bis zwei Sätze: was diese Kategorie behauptet und woran sie scheitert. */
  beschreibung: string;
};

export const KATEGORIEN: Kategorie[] = [
  {
    schluessel: "kontrast",
    kurz: "Kontrast",
    name: "Kontrast",
    beschreibung:
      "Zwei Gruppen, die sich unterscheiden sollten und es nicht tun — oder umgekehrt. Trägt nur, wenn beide Gruppen benannt sind statt aus einer Sortierung erraten, und wenn der Unterschied im Bild wirklich zu sehen ist.",
  },
  {
    schluessel: "bewegung",
    kurz: "Bewegung",
    name: "Bewegung",
    beschreibung:
      "Was sich verändert hat und wie schnell. Die Falle ist der Vergleich zweier Veränderungen: Zwei Prozentbalken nebeneinander vergleichen Raten, nicht Größen — dann steht die Aussage im Titel und im Bild der Bestand.",
  },
  {
    schluessel: "aufteilung",
    kurz: "Aufteilung",
    name: "Aufteilung",
    beschreibung:
      "Wie sich ein Ganzes verteilt. Jeder Anteil braucht seinen Nenner sichtbar — sonst ist der größte Balken eine Aussage über eine Grundmenge, die niemand kennt.",
  },
  {
    schluessel: "groessenordnung",
    kurz: "Größenordnung",
    name: "Größenordnung",
    beschreibung:
      "Eine Zahl, die man sich nicht vorstellen kann, mit einem Maßstab daneben. Ohne den Maßstab ist es eine Zahlentafel; mit einer zu kleinen Grundmenge ein Superlativ, der vollständig im Nenner entsteht.",
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
