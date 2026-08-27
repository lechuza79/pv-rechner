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
// Die Reihenfolge folgt den drei Wochenplätzen des Redaktionsplans: erst die
// Formen, die den Substanz-Platz tragen (Kontrast bis Mythos), dann der
// operative (Frist), dann die leichten (Funktion, Methode). Vier von acht waren
// zuerst nur Substanz — die Kadenz von drei Beiträgen pro Woche ließ sich damit
// gar nicht füllen.
//
// Ebenso wenig steht hier die Bildform (Ringpaar, Säule, Balken, Einzelzahl).
// Die entscheidet sich an den Zahlen, nicht am Thema — 1,20
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

export type KategorieSchluessel =
  | "kontrast"
  | "bewegung"
  | "aufteilung"
  | "groessenordnung"
  | "mythos"
  | "frist"
  | "funktion"
  | "methode";

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
    schluessel: "mythos",
    kurz: "Mythos",
    name: "Mythos gegen Messung",
    beschreibung:
      "Eine verbreitete Annahme, neben die gemessene Zahl gestellt. Formal ein Kontrast, inhaltlich etwas anderes: Verglichen werden nicht zwei Gruppen, sondern eine Erwartung und ein Befund — und die Erwartung muss wirklich verbreitet sein, sonst widerlegt der Beitrag einen Popanz.",
  },
  {
    schluessel: "frist",
    kurz: "Frist",
    name: "Stichtag und Frist",
    beschreibung:
      "Was sich zu einem Datum ändert und was man davor tun muss. Der operative Platz der Woche. Trägt nur mit einer Fundstelle und einem Verfahrensstand — ein Entwurf, der als geltendes Recht gelesen wird, ist die teuerste Auskunft, die wir geben können.",
  },
  {
    schluessel: "funktion",
    kurz: "Funktion",
    name: "Funktion erklärt",
    beschreibung:
      "Was eines unserer Werkzeuge kann, an einem echten Fall gezeigt. Trägt nur, wenn der Beitrag eine Frage beantwortet, die jemand ohnehin hat — eine Funktion vorzuführen, nach der niemand gefragt hat, ist Werbung und wird auch so gelesen.",
  },
  {
    schluessel: "groessenordnung",
    kurz: "Größenordnung",
    name: "Größenordnung",
    beschreibung:
      "Eine Zahl, die man sich nicht vorstellen kann, mit einem Maßstab daneben. Ohne den Maßstab ist es eine Zahlentafel; mit einer zu kleinen Grundmenge ein Superlativ, der vollständig im Nenner entsteht.",
  },
  {
    schluessel: "methode",
    kurz: "Methode",
    name: "Wie wir rechnen",
    beschreibung:
      "Womit wir rechnen, wo unsere Zahlen enden und was wir falsch hatten. Der leichte Platz der Woche, und der einzige, der ohne Diagramm auskommt. Ein eingestandener eigener Fehler wirkt hier stärker als jede Kennzahl — aber nur, wenn danebensteht, was wir daraufhin geändert haben.",
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
