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
 * Die Geschichten-Familien aus dem Katalog — und zugleich die KATEGORIEN der
 * Redaktionsansicht.
 *
 * Eine Liste, nicht zwei. Ein erster Anlauf schnitt die Kategorien nach
 * Aussageform (Kontrast, Bewegung, Aufteilung …) und ließ die Familien hier
 * stehen; das waren zwei Ordnungen für dieselbe Sache, und die eine war
 * erfunden, während die andere längst beschlossen war. Der Einwand, der dazu
 * geführt hatte, stimmt trotzdem: Familien sind THEMEN und schneiden quer zu den
 * Formen — dieselbe Familie liefert einen Kontrast und eine Bewegung. Genau
 * deshalb steht die Bildform nirgends an der Kategorie, sondern entscheidet sich
 * an den Zahlen.
 *
 * Die Langfassung mit Beispielen, Quellen und Schranken steht in
 * docs/datenstories-katalog.md und wird hier nicht ein zweites Mal getippt. Was
 * hier steht, ist das, was beim Entwickeln in der Ansicht gebraucht wird: wie die
 * Familie heißt, was sie behauptet, woran sie scheitert, und was ihr fehlt.
 */
export type Familie = {
  /** Adressteil der Ansicht. Klein, stabil, nicht der Anzeigename. */
  schluessel: string;
  kuerzel: string;
  /** Beschriftung in der Navigationsleiste. Ein Wort, sonst bricht die Leiste. */
  kurz: string;
  name: string;
  /** Ein bis zwei Sätze: was die Familie behauptet und woran sie scheitert. */
  beschreibung: string;
  zustand: "gebaut" | "daten-da" | "fehlt-daten" | "spaeter";
  hinweis?: string;
};

export const FAMILIEN: Familie[] = [
  {
    schluessel: "g1",
    kuerzel: "G1",
    kurz: "Puls",
    name: "Der Puls: was gerade passiert",
    beschreibung:
      "Was der Bestand in diesem Moment leistet, bis hinunter auf die Region. Unser Alleinstellungsmerkmal und zugleich die Familie mit der härtesten Voraussetzung: Ohne die Verbindung von Bestand und Wetter ist jede Tageszahl geraten.",
    zustand: "fehlt-daten",
    hinweis: "Regionaler Tageswert braucht Bestand × Wetter",
  },
  {
    schluessel: "g2",
    kuerzel: "G2",
    kurz: "Zubau",
    name: "Der Zubau: was sich bewegt",
    beschreibung:
      "Was in einem Monat dazugekommen ist, nach Größenklasse und Geografie. Braucht den Monat des Netzanschlusses — mit dem Jahr allein ist ein Monatswert eine Behauptung über einen Zeitraum, den die Quelle nicht hergibt.",
    zustand: "fehlt-daten",
    hinweis: "Braucht den Anschlussmonat statt nur das Jahr",
  },
  {
    schluessel: "g3",
    kuerzel: "G3",
    kurz: "Vergleich",
    name: "Der Vergleich: Rang und Kontrast",
    beschreibung:
      "Zwei Orte, zwei Größen, eine Rangliste. Trägt nur, wenn beide Seiten benannt sind statt aus einer Sortierung erraten — und nie mit einem Superlativ auf kleiner Grundmenge, der vollständig im Nenner entsteht.",
    zustand: "gebaut",
  },
  {
    schluessel: "g4",
    kuerzel: "G4",
    kurz: "Geld",
    name: "Das Geld: was ein Ort eingespielt hat",
    beschreibung:
      "Was an Vergütung in einen Ort geflossen ist und welcher Jahrgang gerade ausläuft. Der stärkste Vorsprung im Katalog, weil kaum jemand sonst beide Seiten hat — Bestand und Vergütungsrecht.",
    zustand: "daten-da",
  },
  {
    schluessel: "g5",
    kuerzel: "G5",
    kurz: "Förderung",
    name: "Die Förderung: Wochenbewegung",
    beschreibung:
      "Was sich diese Woche in den kommunalen Programmen bewegt hat, und wo eine Lücke klafft. Täglich gepflegt und damit exklusiv; die Schranke ist die Namensnennung — geholfen wird, nicht bewertet.",
    zustand: "daten-da",
  },
  {
    schluessel: "g6",
    kuerzel: "G6",
    kurz: "Stichtag",
    name: "Wendepunkte: Schwellen und Stichtage",
    beschreibung:
      "Was sich zu einem Datum ändert und was man davor tun muss. Der planbare Teil des Redaktionsplans — und der gefährlichste: Ein Entwurf, der als geltendes Recht gelesen wird, ist die teuerste Auskunft, die wir geben können.",
    zustand: "daten-da",
  },
  {
    schluessel: "g7",
    kuerzel: "G7",
    kurz: "Mythos",
    name: "Mythos-Check",
    beschreibung:
      "Eine verbreitete Annahme, neben die gemessene Zahl gestellt. Der Zug auf unsere Ratgeber — und die Bedingung ist, dass die Annahme wirklich verbreitet ist, sonst widerlegt der Beitrag einen Popanz.",
    zustand: "gebaut",
  },
  {
    schluessel: "g8",
    kuerzel: "G8",
    kurz: "Ausland",
    name: "Das Ausland",
    beschreibung:
      "Deutschland neben andere Länder gestellt, pro Kopf statt absolut. Die Reihen stammen aus einer fremden Quelle mit eigener Jahresachse — was sie nicht mehr hergibt, wächst nicht mit.",
    zustand: "daten-da",
  },
  {
    schluessel: "g9",
    kuerzel: "G9",
    kurz: "Preis",
    name: "Der Preis",
    beschreibung:
      "Was eine Anlage kostet, gegen das, was sie einbringt. Die Anschaffungsseite ist gescrapt und altert monatlich; wer hier eine Zahl nennt, nennt ihren Stand dazu.",
    zustand: "daten-da",
  },
  {
    schluessel: "g10",
    kuerzel: "G10",
    kurz: "Anomalie",
    name: "Die Anomalie als offene Frage",
    beschreibung:
      "Ein Ort, der aus der Reihe fällt, ohne dass wir die Ursache kennen — und genau so gefragt. Stärkster Kommentar-Motor des Katalogs, aber nur bei positivem Ausschlag: Ein negativer wäre eine Bloßstellung.",
    zustand: "daten-da",
    hinweis: "Stärkster Kommentar-Motor",
  },
  {
    schluessel: "g11",
    kuerzel: "G11",
    kurz: "Fehler",
    name: "Der eigene Fehler",
    beschreibung:
      "Was wir falsch hatten, wie wir es gefunden haben und was wir daraufhin geändert haben. Wirkt stärker als jede Kennzahl — aber nur mit dem dritten Teil, sonst ist es Koketterie.",
    zustand: "daten-da",
  },
  {
    schluessel: "g12",
    kuerzel: "G12",
    kurz: "Service",
    name: "Kommunen-Service ohne Ranking",
    beschreibung:
      "Was in kommunalen Förderprogrammen typischerweise fehlt und sie für Bürger unbrauchbar macht. Ohne einen einzigen Ortsnamen — diese Familie hilft, sie bewertet nicht.",
    zustand: "daten-da",
  },
  {
    schluessel: "g13",
    kuerzel: "G13",
    kurz: "Balkon",
    name: "Balkonkraftwerke als eigenes Feld",
    beschreibung:
      "Steckersolar als eigene Welt: wo die Geräte wirklich stehen, wie schnell sie wachsen, welche Kommunen nur noch sie fördern. Die breiteste Alltagsanschlussfähigkeit im Katalog und ohne Kränkungsrisiko, weil aggregiert.",
    zustand: "gebaut",
  },
  {
    schluessel: "g14",
    kuerzel: "G14",
    kurz: "Fläche",
    name: "Die Flächenfrage",
    beschreibung:
      "Wie sich die Solarleistung auf Freifläche, Gewerbe- und Privatdach verteilt. Höchster Ertrag und höchstes Risiko: kommunalpolitisch heiß, deshalb streng neutral, keine Wertung, keine Empfehlung.",
    zustand: "gebaut",
    hinweis: "Hoher Ertrag, hohes Risiko",
  },
  {
    schluessel: "g15",
    kuerzel: "G15",
    kurz: "Ungebaut",
    name: "Was nicht gebaut wurde",
    beschreibung:
      "Die Dächer, auf denen praktisch nichts steht — Mehrfamilienhäuser vor allem. Braucht eine Quelle für den Gebäudebestand, die wir nicht haben; ohne sie ist der Nenner geraten.",
    zustand: "fehlt-daten",
    hinweis: "Braucht den Gebäudebestand",
  },
  {
    schluessel: "g16",
    kuerzel: "G16",
    kurz: "Kohorte",
    name: "Die Kohorte",
    beschreibung:
      "Wie sich die typische Anlage über die Jahrgänge verändert hat — Größe, Speicher, Ausrichtung. Ohne Ortsbezug und damit ohne Kränkungsrisiko, eine der wenigen Familien ganz ohne Schranke.",
    zustand: "daten-da",
  },
  {
    schluessel: "g17",
    kuerzel: "G17",
    kurz: "Zuruf",
    name: "Frag den Datensatz",
    beschreibung:
      "Fragen aus den Kommentaren, eine pro Woche mit einer Grafik beantwortet. Eine Antwort auf Zuruf ist kein Freibrief für eine ungeprüfte Zahl — es gelten dieselben Prüfschwellen wie sonst.",
    zustand: "daten-da",
  },
  {
    schluessel: "g18",
    kuerzel: "G18",
    kurz: "Werkstatt",
    name: "Der Bau selbst, aus UX-Sicht",
    beschreibung:
      "Wie dieses Produkt entsteht: Entscheidungen, Verworfenes, Messungen. Zurückgestellt, bis das Posten steht — es ist die Familie, die am wenigsten mit unseren Daten zu tun hat.",
    zustand: "spaeter",
  },
  {
    schluessel: "g19",
    kuerzel: "G19",
    kurz: "Wärmepumpe",
    name: "Wärmepumpen-Förderung je Landkreis",
    beschreibung:
      "Zusagen der Bundesförderung je Kreis — die erste Zahl im Haus, die etwas über Wärmepumpen sagt statt über Photovoltaik. Vier Schranken, darunter die wichtigste: Eine zugesagte Heizungsförderung ist keine Wärmepumpe — auf Kreisebene ist nicht nach Technik aufgeschlüsselt.",
    zustand: "fehlt-daten",
    hinweis: "Eigene Sitzung bringt es ins Produkt",
  },
  {
    schluessel: "g20",
    kuerzel: "G20",
    kurz: "Funktion",
    name: "Featurevorstellung",
    beschreibung:
      "Was eines unserer Werkzeuge kann, an einem echten Fall gezeigt. Trägt nur, wenn der Beitrag eine Frage beantwortet, die jemand ohnehin hat — eine Funktion vorzuführen, nach der niemand gefragt hat, ist Werbung und wird auch so gelesen.",
    zustand: "daten-da",
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
