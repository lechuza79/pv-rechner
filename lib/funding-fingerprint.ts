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
  const roh = html
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .toLowerCase();

  // Der Abdruck entsteht aus ZAHLEN und LANGEN WÖRTERN, nicht aus jedem Zeichen.
  //
  // WARUM (17.08.2026, gemessen): wuerzburg.de zerlegt seine Kontaktadresse als
  // Spamschutz bei JEDEM Aufruf neu in Buchstabenfragmente ("i rder a t w e z g
  // e" / "l m e a t e u ."). Ein zeichengenauer Abdruck meldet dort jeden Tag
  // eine Änderung, die keine ist — und ein Wächter, der täglich Alarm schlägt,
  // wird weggesehen; schlimmer noch, unter der 14-Tage-Regel würde das Programm
  // dauerhaft aus der Rechnung fallen.
  //
  // Beträge und Fristen überleben: Sie enthalten Ziffern. Fachwörter überleben:
  // sie sind lang. Was verschwindet, sind Füllwörter und Buchstabensalat — also
  // genau das, was sich ändert, ohne dass sich etwas ändert.
  const zeichen = 5;
  const tokens = roh
    .split(/[^0-9a-zäöüß€%]+/)
    .filter((t) => t.length >= zeichen || /[0-9€%]/.test(t));

  return createHash("sha256").update(tokens.join(" ")).digest("hex");
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
