// Fingerabdruck einer Amtsseite — geteilt zwischen dem Seiten-Wächter
// (scripts/funding-watch.ts) und der Abruf-Route (/api/funding/fetch).
//
// MUSS eine Quelle bleiben: Der Wächter vergleicht Fingerabdrücke, die mal er
// selbst und mal die Route erzeugt hat. Zwei Kopien dieser Normalisierung, die
// minimal auseinanderlaufen, würden bei jedem Wechsel des Abrufwegs eine
// Änderung melden, die es nie gab — und niemand käme darauf, dass nicht die
// Stadt, sondern unser eigener Code die Meldung erzeugt.

import { createHash } from "node:crypto";

/**
 * Sichtbarer Text, so weit normalisiert, dass nur echte Inhaltsänderungen
 * zählen. Bewusst grob: Ein zu feiner Abdruck schlägt bei jedem Deploy der Stadt
 * an, wird dann ignoriert — und so stirbt ein Wächter.
 */
export function fingerprintOf(html: string): string {
  const text = html
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    // Sitzungs-/Cache-Kennungen und Uhrzeiten ändern sich bei jedem Abruf und
    // würden sonst täglich eine Änderung vortäuschen.
    .replace(/\b[0-9a-f]{16,}\b/gi, " ")
    .replace(/\b\d{1,2}[.:]\d{2}(:\d{2})?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return createHash("sha256").update(text).digest("hex");
}

/** Kennzeichnet, auf welchem Weg der Abdruck entstand. Nur Gleiches vergleichen. */
export type Abrufweg = "live" | "archiv";

export function markiert(weg: Abrufweg, fp: string): string {
  return `${weg}:${fp}`;
}

export function wegVon(markiert: string | null): Abrufweg | null {
  const w = markiert?.split(":")[0];
  return w === "live" || w === "archiv" ? w : null;
}
