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
 * The three schemes follow the approved story cards on the homepage (same
 * surfaces, ink and neon as the design package's story foundation), so a card
 * in the feed looks like the story it came from.
 *
 * Highlight is the neon scheme: the lime card surface with dark ink. On lime
 * the brand's own lime mark would vanish, so the logo takes the ink.
 *
 * Surfaces are solid, never translucent: a round-capped arc overlaps itself
 * at its end, and a translucent colour leaves a bright blot exactly there.
 */
const HIGHLIGHT: Partial<Record<TokenName, string>> = {
  "--color-bg": "#E2FF78",
  "--color-bg-muted": "#E2FF78",
  "--color-bg-accent": "#E2FF78",
  "--color-text-primary": "#132527",
  "--color-text-secondary": "#3E5032",
  "--color-text-muted": "#3E5032",
  "--color-text-faint": "#3E5032",
  "--color-accent": "#132527",
  "--color-border": "#AEC864",
  "--color-border-muted": "#C3DE6C",
  "--color-brand": "#132527",
  "--color-brand-deep": "#3E5032",
};

/** Dark: the homepage story card on its night surface, neon as the accent. */
const DUNKEL_KARTE: Partial<Record<TokenName, string>> = {
  "--color-bg": "#163338",
  "--color-bg-muted": "#163338",
  "--color-bg-accent": "#163338",
  "--color-text-primary": "#E8EEE9",
  "--color-text-secondary": "#A7BCBB",
  "--color-text-muted": "#A7BCBB",
  "--color-text-faint": "#A7BCBB",
  "--color-accent": "#D4FF24",
  "--color-border": "#2D494D",
  "--color-border-muted": "#2D494D",
};

/**
 * Die beiden Serienfarben eines Stils — hervorgehoben und gedämpft.
 *
 * Getrennt von den Textfarben, weil die beiden verschiedene Anforderungen haben:
 * Ein Wert soll lesbar sein, eine Fläche soll sich von der Nachbarfläche
 * abheben. Solange die gedämpfte Serie an `--color-text-primary` hing, zog jede
 * Änderung an der einen die andere mit — und man konnte immer nur eines von
 * beidem richtig haben.
 */
/**
 * Woher eine Karte ihre Farben nimmt.
 *
 * „eigene" — sie bringt ihr Farbschema mit. Richtig überall dort, wo sie als
 * Bild endet: im fremden Feed, im heruntergeladenen PNG, in der Vorschau des
 * Redaktionstischs. Was die Seite gerade für eine Tagesstufe hat, geht das Bild
 * nichts an.
 *
 * „seite" — sie erbt die Tokens ihrer Umgebung. Der Fall Ortsseite: Dort steht
 * die Karte MITTEN im Seiteninhalt, und eine mitgebrachte Palette machte aus
 * ihr abends einen weißen Block auf dunklem Grund. Genau daran sind drei
 * Anläufe auf der Gemeindeseite gescheitert (05.09.2026).
 */
export type KartenPalette = "eigene" | "seite";

export function serienFarben(
  stil: KartenStil,
  palette: KartenPalette = "eigene",
): { hervorgehoben: string; gedaempft: string } {
  // Die Seiten-Palette hat kein Highlight-Blau und keine feste Grundstufe: Sie
  // IST die Umgebung. Deshalb Tokens statt Hexwerte — sonst stünde die Karte
  // abends mit Tagesfarben da, also mit demselben Fehler, nur andersherum.
  if (palette === "seite") {
    return { hervorgehoben: "var(--color-accent)", gedaempft: "var(--color-text-primary)" };
  }
  // The muted series is the accent at 45 % on the card surface, the same mix
  // the homepage stories use — precomputed as a solid colour (see above).
  if (stil === "highlight") return { hervorgehoben: "#132527", gedaempft: "#859D54" };
  if (stil === "dunkel") return { hervorgehoben: "#D4FF24", gedaempft: "#6C8F2F" };
  return { hervorgehoben: kartenTokens(stil)["--color-accent"], gedaempft: "#92A3A2" };
}

/** The house night stage as the base, with the story card's surfaces on top. */
const DUNKEL = { ...stageDefaults(0), ...DUNKEL_KARTE };

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
