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
//      ERLEDIGT, nachgemessen 17.08.2026: Gemeinden kalt 0,5/1,2/1,8 s,
//      Kreisseiten kalt 0,5/0,5/1,6 s (nur `x-vercel-cache: MISS` gewertet),
//      Atlas-Abfragen 111–133 ms, 6,2 s Luft bis zur Notbremse. Der Abstand kam
//      vom Präfix-Literal in lib/mastr-region-sql.ts und vom Rollup, nicht von
//      der Wellen-Rücknahme. (03.08.2026 lag es bei 0,4–0,9 s.)
//      Die Messung altert: vor dem Flip erneut messen, nicht diese Zeile zitieren.
//   2. Aufwärm-Crawl vor der Freischaltung, nicht danach.
//      `npm run atlas:warm` deckt beide Ebenen ab (ATLAS_WARM_LEVELS default
//      "gemeinde,landkreis"), muss aber einmal DURCHGELAUFEN sein, bevor geflippt
//      wird — sonst zahlt Googlebot die Kaltrender, die der Crawl abfangen soll.
//   3. Kreisseiten in den Gesundheitscheck aufnehmen (er zog nur Gemeinden,
//      die neu indexierte Ebene wäre sonst unbeobachtet gewesen).
//      ERLEDIGT 17.08.2026: scripts/health-check.ts misst je Lauf zwei
//      Kreisseiten kalt mit (COLD_KREIS_SAMPLES), eigene Zeile im Bericht,
//      dieselbe Schwelle wie die Gemeinden. Die Kreispfade fallen aus derselben
//      Zufallsabfrage ab und kosten keinen zusätzlichen Datenbank-Read.
//
// Der Sitemap-Zweig für Kreise ist inzwischen da (app/sitemap.ts, hängt an
// atlasLevelReleased) — beim ersten Anlauf fehlte er und die Welle wäre halb
// wirkungslos gewesen. Nach einem Flip trotzdem nachsehen statt annehmen.
//
// ABER — und das ist seit dem 18.08.2026 der eigentliche Grund, warum `landkreis`
// hier auf false steht: Die drei Auflagen oben sind inzwischen alle erfüllt, und
// die Welle wird TROTZDEM nicht freigeschaltet. Nicht wegen des Risikos, sondern
// weil auf dieser Ebene niemand sucht. Gemessen (docs/seo/befund-2026-08-18-atlas-wellen.md):
//   - Ein Wettbewerber mit demselben Produkt (wieistmeinsolar.de) hat 139
//     Platzierungen, davon 8 in den Top 10 — und NULL davon auf einem Suchbegriff
//     mit dem Wort „Landkreis". 125 der 139 liegen auf Ortsseiten.
//   - Suchvolumen „photovoltaik landkreis würzburg": 10/Monat. Für Hameln-Pyrmont,
//     Fulda und Bautzen nicht einmal messbar. „photovoltaik münchen": 320.
//   - Unsere eigene Kreisseite Hameln-Pyrmont, die durch die zwei Stunden am
//     27.07. im Index hing, brachte 42 Einblendungen — alle fünf Anfragen dahinter
//     waren ORTSanfragen („solaranlage hameln"), keine einzige Kreisanfrage. Und
//     0 Klicks.
// Die Kreisebene ist damit kein eigenes Suchziel, sondern der Umschlagplatz zur
// Ortsebene. Der nächste sinnvolle Schritt ist Welle 1 (Gemeinden, oberhalb der
// Thin-Schwelle) mit Ortsname im Titel — nicht 0b. Wer 0b trotzdem flippen will,
// braucht eine neue Messung, die diese hier widerlegt, nicht nur grüne Auflagen.
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
