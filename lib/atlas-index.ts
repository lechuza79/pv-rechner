import type { Metadata } from "next";

// Gestufte Index-Freischaltung des Solar-Atlas (Plan: docs/atlas-index-wellen.md).
// Solange eine Ebene hier nicht freigeschaltet ist, bleibt sie noindex (Pilot) und
// steht nicht in der Sitemap. So kippen wir nicht ~11.000 dünne Seiten auf einmal
// in den Index. Ausrollen = diese Datei ändern + deployen.

export type AtlasLevel = "de" | "bundesland" | "landkreis" | "gemeinde";

// Stand: Welle 0a (Deutschland + Bundesländer). Welle 0b (Landkreise) war am
// 27.07.2026 rund zwei Stunden frei und ist am selben Abend auf Entscheidung des
// Betreibers zurückgenommen worden.
//
// Die Freigabekriterien waren erfüllt (Wellen-Monitor: Self-Check 17/17 grün,
// alle 17 Seiten mit Impressions). Zurückgenommen wurde aus einem anderen Grund,
// der VOR der Freischaltung nicht geprüft worden war: Eine Kreisseite verlinkt
// rund 52 Gemeindeseiten. Mit `landkreis: true` wird aus 400 indexierten Seiten
// ein Einstieg in ~11.000 noindex-Gemeindeseiten, die Google alle einmal abrufen
// muss, um das noindex zu sehen. Genau diese gleichzeitigen Kaltrender waren am
// selben Tag die Ursache von 0,7 % Serverfehlern (siehe STAMMDATEN_TTL in
// lib/atlas.ts).
//
// VOR einem erneuten Anlauf zu klären — nicht einfach wieder auf true setzen:
//   1. Kaltrender der Gemeindeseiten mit Abstand unter der 8-s-Notbremse
//      (gemessen 27.07.: 2,3–8,0 s — der Ausreißer stand exakt auf der Kante).
//   2. Aufwärm-Crawl vor der Freischaltung, nicht danach.
//   3. Kreisseiten in den Gesundheitscheck aufnehmen (er zieht nur Gemeinden,
//      die neu indexierte Ebene wäre sonst unbeobachtet).
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
