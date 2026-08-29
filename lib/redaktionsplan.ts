// Der Redaktionsplan: welcher Post wann, und die Regeln, die davor stehen.
//
// Rein und ohne Datenbank, damit ein Test die Regeln prüfen kann. Der Plan
// selbst ist bewusst kurz — er hält fest, was entschieden ist, und benennt, was
// noch nicht entschieden ist, statt eine Vollständigkeit vorzutäuschen.

import type { PruefArt } from "./social-pruefung-kern";

export type Wochentag = "Mo" | "Di" | "Mi" | "Do" | "Fr";

export type Slot = {
  tag: Wochentag;
  /** Wofür dieser Platz gedacht ist. */
  art: "substanz" | "operativ" | "leicht";
  beschreibung: string;
};

/**
 * Drei Posts pro Woche, dienstags, donnerstags und freitags.
 *
 * ALLES DARAN IST EINE ANNAHME, und das steht hier, weil es vorher wie eine
 * Erkenntnis dastand. Die frühere Fassung behauptete, eine Einzelperson breche
 * bei täglicher Kadenz in Woche vier ab, unter drei Beiträgen entstehe keine
 * Erwartung, und Dienstag und Donnerstag seien im deutschen Fach-Feed die
 * stärksten Tage. Keine dieser Aussagen trug eine Quelle — und nach der Regel
 * dieses Projekts gilt eine Angabe im Code als unbelegt, bis jemand sie geprüft
 * hat.
 *
 * WARUM SIE TROTZDEM STEHENBLEIBT: Sie ist plausibel, sie kostet im Irrtum
 * wenig (ein Platz wird verschoben), und sie ist derzeit gar nicht prüfbar.
 * Veröffentlicht wurde noch nichts, also gibt es keine eigenen Daten. Und die
 * Reichweitenzahlen liegen bei LinkedIn hinter einer Berechtigung, die wir nicht
 * haben — messbar wird für uns nur, was danach auf unseren eigenen Seiten
 * passiert.
 *
 * WOMIT SIE PRÜFBAR WIRD: Das Versandprotokoll hält Tag und Fassung fest. Sobald
 * genug Beiträge draußen sind, lässt sich der Sendetag gegen die Zugriffe auf
 * die verlinkten Seiten halten. Vorher ist jede Diskussion darüber eine über
 * fremde Faustregeln, und die widersprechen einander je nach Branche.
 *
 * Ein Prüflauf würde daran nichts ändern: Er kann eine Annahme als Annahme
 * benennen — das steht jetzt hier —, aber nicht messen, was niemand gemessen hat.
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
/**
 * Die vier Überkategorien der Redaktionsansicht.
 *
 * Sie ordnen nicht nach Thema, sondern danach, WORAUS ein Beitrag entsteht —
 * daran hängt, wer ihn bauen kann und was ihn blockiert: „daten" braucht eine
 * Abfrage, „ratgeber" einen Text mit Fundstellen, „ux" einen Vorgang aus der
 * eigenen Werkstatt, „feature" ein Werkzeug, das fertig ist.
 *
 * Der Katalog ist ein Datenkatalog, deshalb ist die Verteilung sehr ungleich.
 * Das als Fehler zu glätten hieße, Familien in Bereiche zu schieben, in die sie
 * nicht gehören, damit die Leiste hübscher aussieht.
 */
export type Bereich = "daten" | "ratgeber" | "ux" | "feature";

export const BEREICHE: { schluessel: Bereich; name: string }[] = [
  { schluessel: "daten", name: "Daten" },
  { schluessel: "ratgeber", name: "Ratgeber" },
  { schluessel: "ux", name: "UX" },
  { schluessel: "feature", name: "Feature" },
];

export type Familie = {
  /** Adressteil der Ansicht. Klein, stabil, nicht der Anzeigename. */
  schluessel: string;
  bereich: Bereich;
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
    bereich: "daten",
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
    bereich: "daten",
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
    bereich: "daten",
    kuerzel: "G3",
    kurz: "Vergleich",
    name: "Der Vergleich: Rang und Kontrast",
    beschreibung:
      "Zwei Orte, zwei Größen, eine Rangliste. Trägt nur, wenn beide Seiten benannt sind statt aus einer Sortierung erraten — und nie mit einem Superlativ auf kleiner Grundmenge, der vollständig im Nenner entsteht.",
    zustand: "gebaut",
  },
  {
    schluessel: "g4",
    bereich: "daten",
    kuerzel: "G4",
    kurz: "Geld",
    name: "Das Geld: was ein Ort eingespielt hat",
    beschreibung:
      "Was an Vergütung in einen Ort geflossen ist und welcher Jahrgang gerade ausläuft. Der stärkste Vorsprung im Katalog, weil kaum jemand sonst beide Seiten hat — Bestand und Vergütungsrecht.",
    zustand: "daten-da",
  },
  {
    schluessel: "g5",
    bereich: "daten",
    kuerzel: "G5",
    kurz: "Förderung",
    name: "Die Förderung: Wochenbewegung",
    beschreibung:
      "Was sich diese Woche in den kommunalen Programmen bewegt hat, und wo eine Lücke klafft. Täglich gepflegt und damit exklusiv; die Schranke ist die Namensnennung — geholfen wird, nicht bewertet.",
    zustand: "gebaut",
  },
  {
    schluessel: "g6",
    bereich: "daten",
    kuerzel: "G6",
    kurz: "Stichtag",
    name: "Wendepunkte: Schwellen und Stichtage",
    beschreibung:
      "Was sich zu einem Datum ändert und was man davor tun muss. Der planbare Teil des Redaktionsplans — und der gefährlichste: Ein Entwurf, der als geltendes Recht gelesen wird, ist die teuerste Auskunft, die wir geben können.",
    zustand: "gebaut",
  },
  {
    schluessel: "g7",
    bereich: "ratgeber",
    kuerzel: "G7",
    kurz: "Mythos",
    name: "Mythos-Check",
    beschreibung:
      "Eine verbreitete Annahme, neben die gemessene Zahl gestellt. Der Zug auf unsere Ratgeber — und die Bedingung ist, dass die Annahme wirklich verbreitet ist, sonst widerlegt der Beitrag einen Popanz.",
    zustand: "gebaut",
  },
  {
    schluessel: "g8",
    bereich: "daten",
    kuerzel: "G8",
    kurz: "Ausland",
    name: "Das Ausland",
    beschreibung:
      "Deutschland neben andere Länder gestellt, pro Kopf statt absolut. Die Reihen stammen aus einer fremden Quelle mit eigener Jahresachse — was sie nicht mehr hergibt, wächst nicht mit.",
    zustand: "gebaut",
  },
  {
    schluessel: "g9",
    bereich: "daten",
    kuerzel: "G9",
    kurz: "Preis",
    name: "Der Preis",
    beschreibung:
      "Was eine Anlage kostet, gegen das, was sie einbringt. Die Anschaffungsseite ist gescrapt und altert monatlich; wer hier eine Zahl nennt, nennt ihren Stand dazu.",
    zustand: "daten-da",
  },
  {
    schluessel: "g10",
    bereich: "daten",
    kuerzel: "G10",
    kurz: "Anomalie",
    name: "Die Anomalie als offene Frage",
    beschreibung:
      "Ein Ort, der aus der Reihe fällt, ohne dass wir die Ursache kennen — und genau so gefragt. Stärkster Kommentar-Motor des Katalogs, aber nur bei positivem Ausschlag: Ein negativer wäre eine Bloßstellung.",
    zustand: "gebaut",
    hinweis: "Stärkster Kommentar-Motor",
  },
  {
    schluessel: "g11",
    bereich: "ux",
    kuerzel: "G11",
    kurz: "Fehler",
    name: "Der eigene Fehler",
    beschreibung:
      "Was wir falsch hatten, wie wir es gefunden haben und was wir daraufhin geändert haben. Wirkt stärker als jede Kennzahl — aber nur mit dem dritten Teil, sonst ist es Koketterie.",
    zustand: "daten-da",
  },
  {
    schluessel: "g12",
    bereich: "ratgeber",
    kuerzel: "G12",
    kurz: "Service",
    name: "Kommunen-Service ohne Ranking",
    beschreibung:
      "Was in kommunalen Förderprogrammen typischerweise fehlt und sie für Bürger unbrauchbar macht. Ohne einen einzigen Ortsnamen — diese Familie hilft, sie bewertet nicht.",
    zustand: "gebaut",
  },
  {
    schluessel: "g13",
    bereich: "daten",
    kuerzel: "G13",
    kurz: "Balkon",
    name: "Balkonkraftwerke als eigenes Feld",
    beschreibung:
      "Steckersolar als eigene Welt: wo die Geräte wirklich stehen, wie schnell sie wachsen, welche Kommunen nur noch sie fördern. Die breiteste Alltagsanschlussfähigkeit im Katalog und ohne Kränkungsrisiko, weil aggregiert.",
    zustand: "gebaut",
  },
  {
    schluessel: "g14",
    bereich: "daten",
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
    bereich: "daten",
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
    bereich: "daten",
    kuerzel: "G16",
    kurz: "Kohorte",
    name: "Die Kohorte",
    beschreibung:
      "Wie sich die typische Anlage über die Jahrgänge verändert hat — Größe, Speicher, Ausrichtung. Ohne Ortsbezug und damit ohne Kränkungsrisiko, eine der wenigen Familien ganz ohne Schranke.",
    zustand: "gebaut",
  },
  {
    schluessel: "g17",
    bereich: "daten",
    kuerzel: "G17",
    kurz: "Zuruf",
    name: "Frag den Datensatz",
    beschreibung:
      "Fragen aus den Kommentaren, eine pro Woche mit einer Grafik beantwortet. Eine Antwort auf Zuruf ist kein Freibrief für eine ungeprüfte Zahl — es gelten dieselben Prüfschwellen wie sonst.",
    zustand: "daten-da",
  },
  {
    schluessel: "g18",
    bereich: "ux",
    kuerzel: "G18",
    kurz: "Werkstatt",
    name: "Der Bau selbst, aus UX-Sicht",
    beschreibung:
      "Wie dieses Produkt entsteht: Entscheidungen, Verworfenes, Messungen. Zurückgestellt, bis das Posten steht — es ist die Familie, die am wenigsten mit unseren Daten zu tun hat.",
    zustand: "spaeter",
  },
  {
    schluessel: "g19",
    bereich: "daten",
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
    bereich: "feature",
    kuerzel: "G20",
    kurz: "Funktion",
    name: "Featurevorstellung",
    beschreibung:
      "Was eines unserer Werkzeuge kann, an einem echten Fall gezeigt. Trägt nur, wenn der Beitrag eine Frage beantwortet, die jemand ohnehin hat — eine Funktion vorzuführen, nach der niemand gefragt hat, ist Werbung und wird auch so gelesen.",
    zustand: "daten-da",
  },
];

export type Regel = {
  regel: string;
  grund: string;
  /**
   * Welche der beiden Prüfungen diese Regel abdeckt.
   *
   * Ohne die Zuordnung wäre die Liste beim Erteilen einer Freigabe eine
   * Sammelaufforderung: Wer die Zahlen nachrechnet, bekäme die Namensnennung
   * mit vorgelegt und hakte sie nebenbei ab. Die Regel gegen den Superlativ
   * gehört deshalb bewusst zur ZAHLENprüfung — er entsteht im Nenner, nicht im
   * Wortlaut, und wird nur beim Nachrechnen der Grundmenge gefunden.
   */
  gilt: PruefArt;
};

/**
 * Was vor jedem Post geprüft wird. Steht hier und nicht nur im Konzept, weil
 * eine Regel, die man nachlesen muss, im Zweifel nicht nachgelesen wird — und
 * seit dem Freigabe-Umbau steht sie deshalb auch dort, wo unterschrieben wird,
 * statt nur auf der Planungsseite.
 */
export const REGELN: Regel[] = [
  {
    regel: "Lob mit Namen, Kritik ohne Namen.",
    grund:
      "Kommunen reden untereinander. Eine vorgeführte Gemeinde beendet den Outreach in ihrer ganzen Region, ohne dass es jemand sagt.",
    gilt: "recht",
  },
  {
    regel: "Keine Gemeinde nennen, die im selben Zeitraum ein Anschreiben bekommt.",
    grund: "Sonst liest sich der Post als Druckmittel und der Brief als Drohung.",
    gilt: "recht",
  },
  {
    regel: "Genannte Gemeinden drei bis fünf Tage vorher informieren.",
    grund: "Wer vorgewarnt wurde, teilt. Wer überrascht wurde, dementiert.",
    gilt: "recht",
  },
  {
    regel: 'Sprachregel: "in [Ort] stehen \u2026", nie "[Ort] hat geschafft/vers\u00e4umt".',
    grund:
      "Private Dächer sind nicht die Leistung einer Verwaltung. Daran hängt sich ein Bürgermeister auch beim Lob auf.",
    gilt: "recht",
  },
  {
    regel: "Kein Superlativ auf kleiner Grundmenge.",
    grund:
      'Sechzehn Einwohner, ein Balkonkraftwerk, "Platz 1 von 150" — der Superlativ entsteht dann vollständig im Nenner.',
    gilt: "zahlen",
  },
  {
    regel: "Text und Bild nennen dieselbe Zahl, in derselben Rundung.",
    grund:
      'Schon einmal so gebaut: Der Text sagte "8 Prozent", das Bild zeigte "8,1" — aus derselben Zahl. Sichtbar wurde es erst am gerenderten Bild, kein Test hat es gefunden.',
    gilt: "zahlen",
  },
  {
    regel: "Jede Zahl trägt ihre Einheit und ihren Nenner.",
    grund:
      "Eine Registerspalte zählte Speichergeräte, nicht Anlagen mit Speicher — als Anteil beschriftet kam ein Bundesland auf 98 Prozent und der Bund auf 67. Beides las sich plausibel und war falsch.",
    gilt: "zahlen",
  },
  {
    regel: "Kein Link im Beitrag.",
    grund: "Ein Link drückt die Verbreitung. Jeder Post muss ohne Klick vollständig sein.",
    gilt: "recht",
  },
  {
    regel: "Quellenangabe im Bild, nicht nur im Text.",
    grund: "Beim Weiterteilen reist der Beitragstext nicht mit, das Bild schon.",
    gilt: "recht",
  },
  {
    regel: "Keine Ortsseite verlinken, die im Releaseplan noch nicht live ist.",
    grund: "Ein Post darf keine Seite ins Schaufenster stellen, die dafür nicht freigegeben ist.",
    gilt: "recht",
  },
];

/**
 * Die Regeln, die zu einer Prüfung gehören.
 *
 * Wird beim Erteilen der Freigabe als Prüfliste gezeigt. Eine Prüfart ohne eine
 * einzige Regel wäre ein leeres Formular — dagegen steht ein Test.
 */
export function regelnFuer(art: PruefArt): Regel[] {
  return REGELN.filter((r) => r.gilt === art);
}
