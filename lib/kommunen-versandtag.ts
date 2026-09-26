import { wochentagInBerlin } from "./zeit";

// ─── Versandtag der Kommunen-Briefe: EINE Quelle ──────────────────────────────
//
// The rule used to live only inside the send script. The status overview
// (`kommunen:stand`) asked the holiday check alone and announced "today you may
// send" on a Saturday evening (26.09.2026) — two versions of one rule, the
// incomplete one in the place people read. Both now ask this function.

const WOCHENTAG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

/**
 * Ist heute ein Versandtag? Dienstag bis Donnerstag, deutscher Kalendertag.
 *
 * Montags konkurriert die Mail mit allem, was übers Wochenende aufgelaufen ist;
 * freitags wird sie gelesen und bis Montag vergessen. Bei einer Aussendung ohne
 * Nachfassen ist der erste Blick der einzige.
 */
export function kommunenVersandtag(datum: Date): { ok: boolean; grund?: string } {
  const tag = wochentagInBerlin(datum);
  if (tag >= 2 && tag <= 4) return { ok: true };
  return { ok: false, grund: `${WOCHENTAG[tag]} — versendet wird Dienstag bis Donnerstag.` };
}
