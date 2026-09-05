// Die ausgearbeiteten Bildformen — Vorlage und Regelwerk an einer Stelle.
//
// Vorher lagen beide Hälften getrennt: die Namen in einer Tabelle, die Regeln in
// einer Verzweigung, die Begründungen verteilt in Kommentaren und Tests. Wer eine
// Form ergänzt, musste an drei Orte — und die Regel, die niemand findet, wird
// beim vierten Mal nicht mehr befolgt.
//
// Was ein Eintrag beantwortet: Wie heißt die Form, wofür ist sie gedacht, und
// unter welcher Bedingung TRÄGT sie. Die Bedingung ist der Kern: Eine Form, die
// wählbar ist, wählt irgendwann jemand, und dann steht im Bild eine Aussage, die
// die Zahlen nicht hergeben.

import type { KartenStil } from "./social-karten-stil";
import type { PostBild } from "./social-posts";

export type Bildform = {
  art: PostBild["art"];
  name: string;
  /** Ein Satz: wofür die Form gedacht ist und woran sie scheitert. */
  wofuer: string;
  /** Trägt die Form für dieses Bild? */
  passt: (bild: PostBild) => boolean;
};

const zwei = (b: PostBild) => b.serien.length === 2;
const hatGanzes = (b: PostBild) => b.ganzes != null;
const alleMitUmriss = (b: PostBild) => b.serien.length > 0 && b.serien.every((s) => !!s.umriss);

export const BILDFORMEN: Bildform[] = [
  {
    art: "vergleich",
    name: "Balken",
    wofuer:
      "Zwei bis drei Werte als Längen nebeneinander. Trägt nur, wenn die Längen wirklich auseinandergehen — zwei fast gleich lange Balken zeigen nichts.",
    passt: () => true,
  },
  {
    art: "kennzahl",
    name: "Einzelkennzahl",
    wofuer:
      "Eine Zahl groß, mit einer Kontextzeile darunter. Für Fälle, in denen ein Vergleich nichts zeigt, weil die Werte zu nah beieinanderliegen.",
    passt: () => true,
  },
  {
    art: "donut",
    name: "Ringpaar",
    wofuer:
      "Zwei ANTEILE als konzentrische Ringe. Nur mit einem Ganzen: Ohne eines behauptet der leere Rest etwas, das es nicht gibt.",
    passt: (b) => zwei(b) && hatGanzes(b),
  },
  {
    art: "umriss",
    name: "Gefüllte Umrisse",
    wofuer:
      "Landesumrisse, anteilig von unten gefüllt. Braucht ein Ganzes und einen Umriss je Wert — die Form behauptet ein Gefäß, das sich füllt.",
    passt: (b) => hatGanzes(b) && alleMitUmriss(b),
  },
  {
    art: "saeule",
    name: "Säule",
    wofuer:
      "Zwei Werte als EINE Säule, der kleinere als Sockel darin. Für Verhältnisse OHNE Ganzes — der Unterschied ist die überragende Fläche selbst.",
    passt: (b) => zwei(b) && !hatGanzes(b),
  },
];

export const BILDFORM_NAME: Record<PostBild["art"], string> = Object.fromEntries(
  BILDFORMEN.map((f) => [f.art, f.name]),
) as Record<PostBild["art"], string>;

export function bildform(art: PostBild["art"]): Bildform {
  const f = BILDFORMEN.find((x) => x.art === art);
  if (!f) throw new Error(`Unbekannte Bildform: ${art}`);
  return f;
}

/** Welche Formen für dieses Bild tragen — in der Reihenfolge des Registers. */
export function moeglicheFormen(bild: PostBild): PostBild["art"][] {
  return BILDFORMEN.filter((f) => f.passt(bild)).map((f) => f.art);
}

/**
 * Die ABGENOMMENEN Templates: Bildform × Farbschema.
 *
 * Das ist die Design-Einheit, an der beliebig viele Beiträge hängen können — und
 * der Grund, warum „gestaltet" kein Häkchen am einzelnen Post ist. Wer ein
 * abgenommenes Template verwendet, hat ein abgenommenes Design; wer eine
 * Kombination benutzt, die noch niemand durchgesehen hat, eben nicht.
 *
 * Ein handgesetztes Flag am Post wäre hier die schlechtere Wahl: Es müsste
 * jemand pflegen, es steht irgendwann auf „fertig" an einer Story, die niemand
 * angesehen hat, und es sagt nichts darüber, WELCHES Design gemeint ist.
 */
export type Template = { art: PostBild["art"]; stil: KartenStil; name: string };

/**
 * OFFEN: das quadratische Story-Visual für die Ortsseiten (05.09.2026).
 *
 * Die Gemeindeseiten rechnen seit dem 05.09.2026 sieben Geschichten je Ort
 * (lib/orts-stories.ts) und geben sie in derselben Form heraus wie ein Fund:
 * Schlagzeile, benannte Werte mit Einheit, Grundlage. Was fehlt, ist das Bild —
 * und es gehört HIERHER, nicht auf die Ortsseite.
 *
 * DREI ANLÄUFE AUF DER SEITE SIND AM SELBEN PUNKT GESCHEITERT, und der Grund
 * ist kein Maßfehler, sondern eine Eigenschaft der Beitrags-Karte:
 *
 *  1. Sie ist FEST 1080 PIXEL breit (`BREITE` in components/social/SocialKarte).
 *     In einen 300 Pixel breiten Teaser skaliert lief sie über und schnitt die
 *     Überschrift ab; die kleine Stufe wiederum lässt Ring und Säule bewusst
 *     weg und fällt auf Balken zurück — womit die Formenwahl wirkungslos wird.
 *  2. Sie ÜBERSCHREIBT die Farb-Tokens mit ihrer eigenen Palette
 *     (`kartenTokens`). Das ist für ein Bild in einem fremden Feed genau
 *     richtig und auf einer Seite mit Tageslicht-Theme falsch: Auf dunklem
 *     Grund stand ein weißer Block.
 *
 * WAS GEBRAUCHT WIRD: eine quadratische Kachel, die (a) eine beliebige Breite
 * annimmt statt einer festen, und (b) ihre Farben aus den Seiten-Tokens nimmt,
 * statt sie zu ersetzen — mit denselben Formen und denselben Regeln. Dieselbe
 * Kachel trägt dann Teaser (klein) und Fenster (groß) auf der Ortsseite und
 * bleibt für den Beitrag das, was sie ist.
 *
 * WAS NICHT GEBRAUCHT WIRD: eine dritte Zeichnung. Auf der Ortsseite stand
 * kurzzeitig eine eigene, mit Seiten-Tokens gezeichnete Fassung — sie war die
 * zweite Wahrheit neben den Templates hier und ist deshalb wieder heraus. Die
 * Ortsseite ist bis dahin ausgeblendet.
 */
export const TEMPLATES: Template[] = [
  { art: "saeule", stil: "hell", name: "Säule hell" },
  { art: "donut", stil: "highlight", name: "Ringpaar Highlight" },
  { art: "donut", stil: "hell", name: "Ringpaar hell" },
  { art: "umriss", stil: "hell", name: "Gefüllte Umrisse hell" },
];

/** Das abgenommene Template dieses Bildes — oder nichts. */
export function templateVon(bild: PostBild): Template | undefined {
  return TEMPLATES.find((t) => t.art === bild.art && t.stil === bild.stil);
}
