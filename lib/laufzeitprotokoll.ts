import { ATLAS_AUFBAU_MARKE } from "./aufbau-uhr";

/**
 * Pulls the slow-build breakdown lines ([atlas-aufbau], see lib/aufbau-uhr.ts)
 * out of a runtime-log export so the health check can print them in its own
 * report (16.10.2026): three repair runs in a row could not read the log and
 * stopped at "would be a guess". The export is newline-delimited JSON, one
 * object per log line with the text in `message`. A line that does not parse
 * is skipped, never fatal — this is context for a finding, not a verdict.
 * The slowest builds come first.
 */
export function atlasAufbauZeilen(ndjson: string, max = 3): string[] {
  const treffer: { gesamt: number; text: string }[] = [];
  for (const zeile of ndjson.split("\n")) {
    if (!zeile.includes(ATLAS_AUFBAU_MARKE)) continue;
    let text: string | null = null;
    try {
      const m = (JSON.parse(zeile) as { message?: unknown }).message;
      if (typeof m === "string") text = m;
    } catch {
      text = zeile;
    }
    if (!text) continue;
    const i = text.indexOf(ATLAS_AUFBAU_MARKE);
    if (i < 0) continue;
    const rest = text.slice(i);
    const g = /"gesamtMs":\s*(\d+)/.exec(rest);
    treffer.push({ gesamt: g ? Number(g[1]) : 0, text: rest });
  }
  return treffer.sort((a, b) => b.gesamt - a.gesamt).slice(0, max).map((t) => t.text);
}
