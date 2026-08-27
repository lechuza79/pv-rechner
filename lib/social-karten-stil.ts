// Das Farbschema einer Karte — eine Eigenschaft der KARTE, nicht der Ansicht.
//
// Das ist der Unterschied, an dem es sonst still auseinanderläuft: Ein Schalter,
// der nur die Vorschau umfärbt, zeigt beim Entwickeln etwas anderes, als später
// im Feed steht. Der Stil hängt deshalb am Bild, wird mit ihm gespeichert und
// geht mit ihm in den Fingerabdruck der Prüfung ein (lib/social-pruefung-kern).
// Wer nach der Freigabe auf „Highlight" schaltet, veröffentlicht eine andere
// Karte als die geprüfte — und genau das meldet die Sperre dann.
//
// Umgesetzt als Token-Werte auf einer Hülle, nicht über `data-theme` am
// Dokument: Dieselbe Bauform wie beim Bild-Export (`applyBrightestStage`), aus
// demselben Grund — die Stufen-Regeln greifen nur auf dem Wurzelelement, und
// das umzuschalten ließe die Seite beim Aufnehmen aufblitzen.

import { STAGE_COUNT, stageDefaults, type TokenName } from "./theme";

export type KartenStil = "hell" | "dunkel" | "highlight";

export const KARTEN_STILE: KartenStil[] = ["hell", "dunkel", "highlight"];

export const KARTEN_STIL_STANDARD: KartenStil = "hell";

export const KARTEN_STIL_NAME: Record<KartenStil, string> = {
  hell: "Hell",
  dunkel: "Dunkel",
  highlight: "Highlight",
};

/** Ist das ein Stil, den wir kennen? Alles andere fällt auf den Standard zurück. */
export function istKartenStil(wert: unknown): wert is KartenStil {
  return typeof wert === "string" && (KARTEN_STILE as string[]).includes(wert);
}

/**
 * Die hellste Tagesstufe ist die Grundlage JEDES Stils.
 *
 * Die Seite folgt der echten Sonne und steht abends auf einer dunklen Stufe. Ein
 * Bild, das dabei entsteht, trüge diese Stimmung für immer mit sich, obwohl sie
 * über die Daten nichts aussagt — dieselbe Karte sähe je nach Uhrzeit des Klicks
 * anders aus. Ein gewählter Stil ist etwas anderes: eine Entscheidung, die im
 * Bild bleiben soll.
 */
const GRUNDLAGE = stageDefaults(STAGE_COUNT - 1);

/**
 * Highlight: der Akzent-Blauton der Marke als Grund (Vorgabe des Betreibers,
 * 27.08.2026) — derselbe, den ein primärer Knopf trägt. Er wird deshalb NICHT
 * hier getippt, sondern aus der Grundlage gezogen: Wechselt die Marke ihren
 * Akzent, wechselt diese Karte mit.
 *
 * Der Preis, den man kennen muss: Auf diesem Blau gibt es fast keine
 * Farbabstufung mehr. Gerechnet nach WCAG 2.1 gegen #1365EA erreicht selbst
 * volles Weiß nur 5,2:1 — für lesbaren Kleintext bleiben nur Weißtöne ab etwa
 * 92 % Deckkraft. Die Hierarchie trägt deshalb über Größe und Gewicht, wie in
 * dieser Karte ohnehin (96 px Wert gegen 30 px Beschriftung).
 *
 * Die Rollen drehen sich um: Auf blauem Grund sticht WEISS hervor, nicht ein
 * helleres Blau. Der hervorgehobene Wert (`--color-accent`) wird deshalb weiß,
 * der gewöhnliche gedämpft — sonst steht die Betonung auf der falschen Zahl,
 * und das fällt an einer einzelnen Karte niemandem auf. Der gedämpfte Ton
 * erreicht 4,3:1 und gilt für Großtext ohnehin (WCAG verlangt dort 3:1); wer
 * ihn verkleinert, muss ihn anheben.
 */
const HIGHLIGHT: Partial<Record<TokenName, string>> = {
  "--color-bg": GRUNDLAGE["--color-accent"],
  "--color-bg-muted": GRUNDLAGE["--color-accent"],
  "--color-bg-accent": GRUNDLAGE["--color-accent"],
  // FLÄCHENFARBEN IM VOLLTON, nicht durchscheinend — das ist der Unterschied
  // zwischen sauber und schmutzig. Ein Bogen mit runder Kappe überlappt sich an
  // seinem Ende selbst; bei einer durchscheinenden Farbe addiert sich die
  // Deckkraft genau dort, und das Ende trägt einen hellen Klecks. Im Bild sieht
  // das nach einem Fehler aus und ist einer.
  //
  // Die Töne sind die ausgerechneten Mischungen auf dem blauen Grund, eine Spur
  // heller gesetzt: Der abgesetzte Ring soll sich vom Grund lösen, nicht mit ihm
  // verschwimmen.
  "--color-text-primary": "#DCE8FD",
  // Reiner TEXT darf durchscheinen — er überlappt sich nicht.
  "--color-text-secondary": "rgba(255,255,255,0.94)",
  "--color-text-muted": "rgba(255,255,255,0.92)",
  "--color-text-faint": "rgba(255,255,255,0.80)",
  "--color-accent": "#FFFFFF",
  "--color-border": "#659BF1",
  "--color-border-muted": "#4E8CEF",
  // Das Logo führt seine beiden Blautöne als Token. Auf blauem Grund verschwände
  // die Marke sonst in der Fläche.
  "--color-brand": "#FFFFFF",
  "--color-brand-deep": "rgba(255,255,255,0.50)",
};

/** Dunkel ist die Nachtstufe des Hauses, keine zweite dunkle Palette. */
const DUNKEL = stageDefaults(0);

/**
 * Die Token-Werte eines Stils, vollständig.
 *
 * Vollständig und nicht als Überlagerung, weil die Hülle in einer Seite steht,
 * die selbst gerade auf irgendeiner Tagesstufe steht: Was der Stil nicht selbst
 * setzt, erbte sonst von dort.
 */
export function kartenTokens(stil: KartenStil): Record<string, string> {
  if (stil === "dunkel") return { ...GRUNDLAGE, ...DUNKEL };
  if (stil === "highlight") return { ...GRUNDLAGE, ...HIGHLIGHT };
  return { ...GRUNDLAGE };
}
