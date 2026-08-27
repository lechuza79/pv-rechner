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
 * Highlight: blauer statt weißer Grund.
 *
 * Der Blauton ist NICHT `--color-accent` (#1365EA), obwohl das der naheliegende
 * wäre — auf ihm kommt gedämpftes Weiß nur auf 3,9:1 und die Beschriftung unter
 * den Balken wäre nicht mehr lesbar. Gerechnet nach WCAG 2.1 gegen den tieferen
 * Markenblauton: gedämpftes Weiß 6,0:1, volles Weiß 10,1:1.
 *
 * Die Rollen drehen sich dabei um: Auf blauem Grund sticht WEISS hervor, nicht
 * ein helleres Blau. Der hervorgehobene Wert (`--color-accent`) wird deshalb
 * weiß, der gewöhnliche Wert gedämpft — sonst steht die Betonung auf der
 * falschen Zahl, und das fällt an einer Karte niemandem auf.
 */
const HIGHLIGHT: Partial<Record<TokenName, string>> = {
  "--color-bg": "#073C93",
  "--color-bg-muted": "#0B4CB4",
  "--color-bg-accent": "#0B4CB4",
  "--color-text-primary": "rgba(255,255,255,0.78)",
  "--color-text-secondary": "rgba(255,255,255,0.88)",
  "--color-text-muted": "rgba(255,255,255,0.72)",
  "--color-text-faint": "rgba(255,255,255,0.62)",
  "--color-accent": "#FFFFFF",
  "--color-border": "rgba(255,255,255,0.30)",
  "--color-border-muted": "rgba(255,255,255,0.20)",
  // Das Logo führt seine beiden Blautöne als Token. Auf blauem Grund verschwände
  // die Marke sonst in der Fläche.
  "--color-brand": "#FFFFFF",
  "--color-brand-deep": "rgba(255,255,255,0.45)",
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
