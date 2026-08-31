// Der Redaktionsplan: welcher Post wann, und die Regeln, die davor stehen.
//
// Rein und ohne Datenbank, damit ein Test die Regeln prüfen kann. Der Plan
// selbst ist bewusst kurz — er hält fest, was entschieden ist, und benennt, was
// noch nicht entschieden ist, statt eine Vollständigkeit vorzutäuschen.

export type Wochentag = "Mo" | "Di" | "Mi" | "Do" | "Fr";

export type Slot = {
  tag: Wochentag;
  /** Wofür dieser Platz gedacht ist. */
  art: "substanz" | "operativ" | "leicht";
  beschreibung: string;
};

/**
 * Drei Posts pro Woche.
 *
 * Nicht mehr, weil eine Einzelperson ohne Redaktion bei täglicher Kadenz in
 * Woche vier abbricht — und ein Account, der sichtbar aufgehört hat, wirkt
 * schlechter als einer, der nie angefangen hat. Nicht weniger, weil unter drei
 * Beiträgen keine Erwartung entsteht.
 *
 * Dienstag und Donnerstag sind im deutschen Fach-Feed die stärksten Tage;
 * Montag geht in der Inbox-Abarbeitung unter.
 */
export const SLOTS: Slot[] = [
  {
    tag: "Di",
    art: "substanz",
    beschreibung: "Vergleich, Anomalie, Kohorte. Der Post, der Reichweite bauen soll.",
  },
  {
    tag: "Do",
    art: "operativ",
    beschreibung: "Förderbewegung, Vergütungstermin, auslaufende Jahrgänge. Hält die Fachgruppe.",
  },
  {
    tag: "Fr",
    art: "leicht",
    beschreibung: "Meinung, Methode, eigener Fehler. Darf ausfallen, wenn die Woche voll war.",
  },
];

/** Wie viele fertige Posts vorliegen sollten, bevor der erste rausgeht. */
export const PUFFER_VOR_START = 8;

/**
 * Die Geschichten-Familien aus dem Katalog, als lebende Übersicht.
 *
 * Bewusst nur Kurzform mit Zustand — die Langfassung mit Beispielen, Quellen und
 * Schranken steht in docs/datenstories-katalog.md und wird hier nicht ein
 * zweites Mal getippt. Diese Liste beantwortet beim Entwickeln genau eine Frage:
 * Was gibt es noch, und was ist davon schon gebaut?
 */
export type Familie = {
  kuerzel: string;
  name: string;
  zustand: "gebaut" | "daten-da" | "fehlt-daten" | "spaeter";
  hinweis?: string;
};

export const FAMILIEN: Familie[] = [
  { kuerzel: "G1", name: "Der Puls: was gerade passiert", zustand: "fehlt-daten", hinweis: "Regionaler Tageswert braucht Bestand × Wetter" },
  { kuerzel: "G2", name: "Der Zubau: was sich bewegt", zustand: "fehlt-daten", hinweis: "Braucht den Anschlussmonat statt nur das Jahr" },
  { kuerzel: "G3", name: "Der Vergleich: Rang und Kontrast", zustand: "gebaut", hinweis: "Stadt gegen Land ist Post 1" },
  { kuerzel: "G4", name: "Das Geld: was ein Ort eingespielt hat", zustand: "daten-da" },
  { kuerzel: "G5", name: "Die Förderung: Wochenbewegung", zustand: "daten-da" },
  { kuerzel: "G6", name: "Wendepunkte: Schwellen und Stichtage", zustand: "daten-da" },
  { kuerzel: "G7", name: "Mythos-Check", zustand: "daten-da" },
  { kuerzel: "G8", name: "Das Ausland", zustand: "daten-da" },
  { kuerzel: "G9", name: "Der Preis", zustand: "daten-da", hinweis: "Seit 08/2026 zusätzlich die Kostenstruktur echter Wärmepumpen-Angebote — siehe G20" },
  { kuerzel: "G10", name: "Die Anomalie als offene Frage", zustand: "daten-da", hinweis: "Stärkster Kommentar-Motor" },
  { kuerzel: "G11", name: "Der eigene Fehler", zustand: "daten-da" },
  { kuerzel: "G12", name: "Kommunen-Service ohne Ranking", zustand: "daten-da" },
  { kuerzel: "G13", name: "Balkonkraftwerke als eigenes Feld", zustand: "gebaut", hinweis: "Wachstum ist Post 2" },
  { kuerzel: "G14", name: "Die Flächenfrage", zustand: "daten-da", hinweis: "Hoher Ertrag, hohes Risiko" },
  { kuerzel: "G15", name: "Was nicht gebaut wurde", zustand: "fehlt-daten", hinweis: "Braucht den Gebäudebestand" },
  { kuerzel: "G16", name: "Die Kohorte", zustand: "daten-da" },
  { kuerzel: "G17", name: "Frag den Datensatz", zustand: "daten-da" },
  { kuerzel: "G18", name: "Der Bau selbst, aus UX-Sicht", zustand: "spaeter" },
  { kuerzel: "G19", name: "Wärmepumpen-Förderung je Landkreis", zustand: "fehlt-daten", hinweis: "Eigene Sitzung bringt es ins Produkt" },
  {
    kuerzel: "G20",
    name: "Was in Angeboten fehlt",
    zustand: "daten-da",
    // Die stärkste Familie für Fachpublikum, und die einzige, deren Zahlen nicht
    // aus einem Register stammen, sondern aus Dokumenten, die Verbraucher selbst
    // in der Hand hatten. Beispiele mit Belegkraft: Der Umbau des Zählerschranks
    // ist in 73 von 160 Angeboten ausdrücklich NICHT enthalten und kostet im
    // Mittel 2.966 € nach. Nur jedes zweite Angebot weist Montage und Lohn
    // überhaupt als eigenen Posten aus. Der reine Gerätepreis lässt sich in
    // keinem Angebot sauber herauslösen — die Verbraucherzentrale sagt das
    // selbst und fordert die Innungen auf, das zu ändern.
    //
    // DREI SCHRANKEN, jede schärfer als sonst.
    //
    // Kein Betriebsname, keine Region, kein Zitat aus einem Angebot — auch nicht
    // anonymisiert.
    //
    // Die Vergleichsgruppe gehört ins Bild, nicht nur in den Text.
    //
    // Und die dritte ist die, an der ein Beitrag scheitert: DIE STICHPROBE IST
    // NICHT DER MARKT, und zwar nicht wegen ihrer Größe. 160 Angebote tragen
    // einen Anteil auf rund vier Prozentpunkte genau. Das Problem ist die
    // Auswahl — diese Angebote haben Leute eingereicht, die schon Zweifel
    // hatten. Wer ein sauberes Angebot bekommt, schickt es nicht zur Prüfung.
    // Unsere Lücken-Zahlen zeichnen den Markt deshalb eher zu schlecht. Ein
    // Beitrag der Form „in X % der deutschen Angebote fehlt Y" ist damit falsch,
    // egal wie vorsichtig er formuliert ist; tragfähig ist nur die Aussage über
    // die geprüften Angebote selbst.
    hinweis: "Kostenstruktur echter Angebote. Nie über einen Betrieb, immer über die Gattung",
  },
];

export type Regel = { regel: string; grund: string };

/**
 * Was vor jedem Post geprüft wird. Steht hier und nicht nur im Konzept, weil
 * eine Regel, die man nachlesen muss, im Zweifel nicht nachgelesen wird.
 */
export const REGELN: Regel[] = [
  {
    regel: "Lob mit Namen, Kritik ohne Namen.",
    grund:
      "Kommunen reden untereinander. Eine vorgeführte Gemeinde beendet den Outreach in ihrer ganzen Region, ohne dass es jemand sagt.",
  },
  {
    regel: "Keine Gemeinde nennen, die im selben Zeitraum ein Anschreiben bekommt.",
    grund: "Sonst liest sich der Post als Druckmittel und der Brief als Drohung.",
  },
  {
    regel: "Genannte Gemeinden drei bis fünf Tage vorher informieren.",
    grund: "Wer vorgewarnt wurde, teilt. Wer überrascht wurde, dementiert.",
  },
  {
    regel: 'Sprachregel: "in [Ort] stehen \u2026", nie "[Ort] hat geschafft/vers\u00e4umt".',
    grund:
      "Private Dächer sind nicht die Leistung einer Verwaltung. Daran hängt sich ein Bürgermeister auch beim Lob auf.",
  },
  {
    regel: "Kein Superlativ auf kleiner Grundmenge.",
    grund:
      'Sechzehn Einwohner, ein Balkonkraftwerk, "Platz 1 von 150" — der Superlativ entsteht dann vollständig im Nenner.',
  },
  {
    regel: "Kein Link im Beitrag.",
    grund: "Ein Link drückt die Verbreitung. Jeder Post muss ohne Klick vollständig sein.",
  },
  {
    regel: "Quellenangabe im Bild, nicht nur im Text.",
    grund: "Beim Weiterteilen reist der Beitragstext nicht mit, das Bild schon.",
  },
  {
    regel: "Keine Ortsseite verlinken, die im Releaseplan noch nicht live ist.",
    grund: "Ein Post darf keine Seite ins Schaufenster stellen, die dafür nicht freigegeben ist.",
  },
];
