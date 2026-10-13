// Shared nuclear-import figure + formatters for the atomstrom-import pages.
//
// Both the overview page and the extracted /methodik page read the SAME live
// computeNuclearImport() the dashboard and API route use, so the number can
// never drift.
//
// The shared result is cached explicitly via unstable_cache, NOT via fetch
// defaults. One call fans out to seven Energy-Charts requests (cross-border
// flows + six neighbours), and Energy-Charts rate-limits us — without this the
// two pages would fetch fourteen times per regeneration. Next 14 papered over
// that with its implicit fetch cache; Next 15 no longer caches fetch by
// default, so the caching has to be stated here to survive that change and the
// next one. Same TTL as both pages' ISR window.
//
// Caching `asOf` together with the data is deliberate: the "Stand" line must
// name when the numbers were actually fetched. Reading a fresh clock next to
// cached data would date the page younger than its own figures.

import { unstable_cache } from "next/cache";
import { type NuclearImportResponse, computeNuclearImport } from "../../../lib/nuclear-import";
import { DATA_SOURCES } from "../../../lib/data-sources";

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";
export const PAGE_URL = `${BASE_URL}/atomstrom-import`;
export const METHODIK_URL = `${BASE_URL}/atomstrom-import/methodik`;

const WINDOW_HOURS = 168; // 7-day rolling average — smooths day/night & FR swings
const CACHE_TTL_SECONDS = 3600; // matches `export const revalidate` on both pages

// Keep both requests below the live API's downsampling threshold so daily
// energy retains its original quarter-hour resolution.
async function loadLiveImport(now: Date, start: Date): Promise<NuclearImportResponse> {
  const olderEnd = new Date(now.getTime() - 7 * 86400000);
  const queries = ["hours=168", new URLSearchParams({start: start.toISOString().slice(0, 10), end: olderEnd.toISOString().slice(0, 10)}).toString()];
  const parts = await Promise.all(queries.map(async query => {
    const response = await fetch(`https://solar-check.io/api/energy/nuclear-import?${query}`, {cache: "no-store", signal: AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error(`Live import data unavailable: ${response.status}`);
    const payload: NuclearImportResponse = await response.json();
    if (payload.source === "error" || !Array.isArray(payload.data) || !payload.data.length) throw new Error("Live import observations unavailable");
    return payload;
  }));
  const points = new Map(parts.flatMap(part => part.data).map(point => [point.ts, point]));
  return {...parts[0], data: [...points.values()].sort((a, b) => a.ts.localeCompare(b.ts))};
}

// Cached payload is plain JSON — unstable_cache serializes, so no Date here.
// Errors are deliberately NOT caught inside the cache boundary: unstable_cache
// stores nothing when the function throws, so a transient rate-limit is retried
// on the next render instead of pinning an empty page for a full hour.
const loadNuclearImport = unstable_cache(
  async () => {
    const now = new Date();
    // Extra calendar coverage supports seven complete Berlin days, including DST.
    // Retain raw intervals for energy integration; the FAQ keeps its rolling window.
    const chartStart = new Date(now.getTime() - 216 * 60 * 60 * 1000);
    const chartResult = process.env.NODE_ENV === "development"
      ? await loadLiveImport(now, chartStart)
      : await computeNuclearImport(chartStart.toISOString(), now.toISOString(), 216, { preserveResolution: true });
    const rollingStart = now.getTime() - WINDOW_HOURS * 60 * 60 * 1000;
    const data = chartResult.data.filter(p => Date.parse(p.ts) >= rollingStart && Date.parse(p.ts) < now.getTime());
    if (!data.length) throw new Error("No observations in the rolling import window");
    const avg = data.reduce((sum, p) => sum + p.nuclear_gw, 0) / data.length;
    const result = { ...chartResult, data, avg_gw: Math.round(avg * 100) / 100, avg_share_pct: Math.round(avg / 45 * 1000) / 10 };
    return { result, chartResult, asOfIso: now.toISOString() };
  },
  ["atomstrom-import-figure-v3-live-preview"],
  { revalidate: CACHE_TTL_SECONDS }
);

export async function getNuclearImport() {
  try {
    const { result, chartResult, asOfIso } = await loadNuclearImport();
    return { result, chartResult, asOf: new Date(asOfIso) };
  } catch {
    // Same shape as before: callers render the "no figure available" branch.
    return { result: null, chartResult: null, asOf: new Date() };
  }
}

export const nf1 = (n: number) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const nf0 = (n: number) => Math.round(n).toLocaleString("de-DE");
export const dateLong = (d: Date) =>
  d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

/** Ready-to-cite attribution string (CC BY 4.0). */
export function buildCitation(avgGw: number | null, standStr: string): string {
  return avgGw != null
    ? `Atomstrom-Import Deutschland: rund ${nf1(avgGw)} GW im Durchschnitt (7-Tage-Mittel, Stand ${standStr}). Quelle: Solar Check (solar-check.io), berechnet aus Daten von ${DATA_SOURCES.energyCharts.name}, ${DATA_SOURCES.energyCharts.license}. ${PAGE_URL}`
    : `Atomstrom-Import Deutschland: rechnerischer Kernstrom-Import aus sechs Nachbarländern. Quelle: Solar Check (solar-check.io), berechnet aus Daten von ${DATA_SOURCES.energyCharts.name}, ${DATA_SOURCES.energyCharts.license}. ${PAGE_URL}`;
}
