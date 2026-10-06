/**
 * Wording for the moment Energy-Charts is down and the energy routes serve an
 * earlier copy (`stale: true`, see lib/energy-letzter-stand.ts).
 *
 * One sentence, one source, used by every surface that shows such a copy: the
 * live block, the history chart and the embeds. It names the cause and the
 * actual time of the newest data point — never "now", never a time we did not
 * observe. The source name comes from the data-source register so the outage
 * note and the licence credit cannot disagree about who supplies the data.
 */

import { DATA_SOURCES } from "./data-sources";

/** "05.10., 11:45 Uhr" in German time, or null for keys that are not instants (weekly rows). */
export function ersatzstandZeit(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const t = new Date(ts);
  if (Number.isNaN(t.getTime())) return null;
  const datum = t.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });
  const zeit = t.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  return `${datum}, ${zeit} Uhr`;
}

/** Newest timestamp of a series (series are ascending, but don't rely on it). */
export function letzterZeitpunkt(data: { ts: string }[]): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const d of data) {
    const ms = new Date(d.ts).getTime();
    if (!Number.isNaN(ms) && ms > bestMs) {
      bestMs = ms;
      best = d.ts;
    }
  }
  return best;
}

/** What a generation/nuclear payload says about where its numbers come from. */
export interface QuellenStand {
  stale?: boolean;
  fallback?: "smard";
}

/** The source to credit for this payload — SMARD when it supplied the numbers. */
export function energieQuelle(p: QuellenStand) {
  return p.fallback === "smard" ? DATA_SOURCES.smard : DATA_SOURCES.energyCharts;
}

/**
 * The note for a payload that is not the normal live Energy-Charts answer, or
 * null when it is. Covers both fallbacks:
 * - SMARD live: data is current, only the supplier changed — said with the
 *   exact attribution SMARD's licence requires.
 * - stored copy: data is old — said with the real time of the newest point.
 */
export function quellenHinweis(p: QuellenStand, lastTs: string | null | undefined): string | null {
  const ausfall = `${DATA_SOURCES.energyCharts.name} liefert gerade keine Daten.`;
  const zeit = ersatzstandZeit(lastTs);
  if (p.stale) {
    return zeit
      ? `${ausfall} Gezeigt wird der letzte Stand vom ${zeit}.`
      : `${ausfall} Gezeigt wird der letzte verfügbare Stand.`;
  }
  if (p.fallback === "smard") {
    return `${ausfall} Gezeigt werden die Zahlen von ${DATA_SOURCES.smard.name}${zeit ? `, Stand ${zeit}` : ""}.`;
  }
  return null;
}
