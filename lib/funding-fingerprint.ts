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

/**
 * Fassung des Verfahrens oben. **Hochzählen, sobald `fingerprintOf` etwas anders
 * verdichtet** — jede Änderung dort erzeugt für dieselbe unveränderte Seite einen
 * anderen Abdruck.
 *
 * WARUM DAS NÖTIG IST (gemessen am 18./19.08.2026): Am 18.08. bekam
 * `fingerprintOf` den Token-Filter gegen die verwürfelten Kontaktadressen. Für
 * jede Seite fiel damit ein anderer Abdruck an als am Vortag — der Wächter
 * verbuchte das für **15 Programme an einem Tag** als „Amtsseite hat sich
 * geändert", startete die Nachprüf-Frist und hätte sie am 02.09.2026 geschlossen
 * aus der Rechnung fallen lassen. Fünfzehn Städte, die alle am selben Tag ihre
 * Seite ändern, gibt es nicht; geändert hatten wir uns.
 *
 * Das ist dieselbe Fehlerklasse, gegen die es die Herkunfts-Kennzeichnung schon
 * gab, nur eine Ebene höher: Nicht der Abrufweg wechselte, sondern das Verfahren.
 * Beides beantwortet dieselbe Frage — **halten wir hier überhaupt zwei
 * vergleichbare Dinge nebeneinander?** — und beides gehört deshalb in denselben
 * Schlüssel. Ein Wächter, der eine eigene Änderung als fremde meldet, ist
 * schlimmer als einer, der schweigt: Er erzeugt Arbeit, die niemand braucht, und
 * nimmt nebenbei Förderungen weg, die es gibt.
 */
export const FINGERPRINT_VERSION = 2;

/** Kennzeichnet, auf welchem Weg der Abdruck entstand. Nur Gleiches vergleichen. */
export type Abrufweg = "live" | "archiv";

/** `live-v2:a1b2…` — Abrufweg UND Verfahrensfassung vor dem Abdruck. */
export function markiert(weg: Abrufweg, fp: string): string {
  return `${weg}-v${FINGERPRINT_VERSION}:${fp}`;
}

/** Der Schlüssel vor dem Doppelpunkt: Abrufweg plus Fassung. */
function schluesselVon(m: string | null): string | null {
  const k = m?.split(":")[0];
  return k ? k : null;
}

export function wegVon(m: string | null): Abrufweg | null {
  const w = schluesselVon(m)?.replace(/-v\d+$/, "");
  return w === "live" || w === "archiv" ? w : null;
}

/**
 * Dürfen diese beiden Abdrücke überhaupt gegeneinander gehalten werden?
 *
 * Nein, sobald Abrufweg oder Verfahrensfassung auseinandergehen — dann ist ein
 * Unterschied unsere Sache, nicht die der Stadt. Ein alter Abdruck ohne
 * Fassungskennung (vor dem 19.08.2026 geschrieben) ist aus demselben Grund nicht
 * vergleichbar: Er stammt aus Fassung 1.
 */
export function vergleichbar(alt: string | null, neu: string): boolean {
  if (!alt) return false;
  return schluesselVon(alt) === schluesselVon(neu);
}

/** Warum zwei Abdrücke nicht vergleichbar sind — für die Protokollzeile, damit
 *  dort nicht „Abrufweg gewechselt" steht, wo sich unser Verfahren geändert hat. */
export function unterschiedsGrund(alt: string, neu: string): string {
  const wegAlt = wegVon(alt), wegNeu = wegVon(neu);
  if (wegAlt !== wegNeu) return `Abrufweg gewechselt (${wegAlt ?? "unbekannt"} → ${wegNeu ?? "unbekannt"})`;
  return "unser Abdruck-Verfahren hat sich geändert — kein Hinweis auf die Amtsseite";
}
