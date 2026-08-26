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
