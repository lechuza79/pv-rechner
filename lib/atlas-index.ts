import type { Metadata } from "next";

// Gestufte Index-Freischaltung des Solar-Atlas (Plan: docs/atlas-index-wellen.md).
// Solange eine Ebene hier nicht freigeschaltet ist, bleibt sie noindex (Pilot) und
// steht nicht in der Sitemap. So kippen wir nicht ~11.000 dünne Seiten auf einmal
// in den Index. Ausrollen = diese Datei ändern + deployen.

export type AtlasLevel = "de" | "bundesland" | "landkreis" | "gemeinde";

// Welle 0a: Deutschland + Bundesländer. Nächste Stufen:
//   0b → landkreis: true
//   1  → gemeinde: true (dann greift die Anlagen-Schwelle unten)
const RELEASED: Record<AtlasLevel, boolean> = {
  de: true,
  bundesland: true,
  landkreis: false,
  gemeinde: false,
};

// Thin-Schwelle: Gemeinden unter dieser Anlagenzahl bleiben noindex — ohne
// nennenswerten Bestand hat die Seite keinen Eigenwert (Doorway-/Thin-Risiko).
export const GEMEINDE_MIN_ANLAGEN = 10;

export function atlasLevelReleased(level: AtlasLevel): boolean {
  return RELEASED[level];
}

/** Ist eine konkrete Atlas-Seite indexierbar? Für Gemeinden zählt zusätzlich die
 *  Anlagen-Schwelle. */
export function atlasIsIndexable(level: AtlasLevel, anlagen?: number): boolean {
  if (!RELEASED[level]) return false;
  if (level === "gemeinde") return (anlagen ?? 0) >= GEMEINDE_MIN_ANLAGEN;
  return true;
}

/** robots-Feld für Next-Metadata: indexierbar → explizit index/follow (überschreibt
 *  den Pilot-Default), sonst noindex/nofollow. */
export function atlasRobots(indexable: boolean): Metadata["robots"] {
  return indexable ? { index: true, follow: true } : { index: false, follow: false };
}
