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
