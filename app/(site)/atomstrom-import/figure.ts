// Shared cached observations for the Atomstrom page, hero and method explanation.
import { unstable_cache } from "next/cache";
import { nuclearEnergyPreviewData } from "../../../lib/nuclear-preview-server";
import { DATA_SOURCES } from "../../../lib/data-sources";

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";
export const PAGE_URL = `${BASE_URL}/atomstrom-import`;
export const METHODIK_URL = `${BASE_URL}/atomstrom-import/methodik`;

const WINDOW_HOURS = 168; // 7-day rolling average — smooths day/night & FR swings
const CACHE_TTL_SECONDS = 3600; // matches `export const revalidate` on both pages

// Cached payload is plain JSON — unstable_cache serializes, so no Date here.
// Errors are deliberately NOT caught inside the cache boundary: unstable_cache
// stores nothing when the function throws, so a transient rate-limit is retried
// on the next render instead of pinning an empty page for a full hour.
const loadNuclearImport = unstable_cache(
  async () => {
    const now = new Date();
    // Extra calendar coverage supports seven complete Berlin days, including DST.
    // Retain raw intervals for energy integration; the FAQ keeps its rolling window.
    const chartResult = await nuclearEnergyPreviewData(now);
    if (!chartResult) throw new Error("Nuclear import observations unavailable");
    const rollingStart = now.getTime() - WINDOW_HOURS * 60 * 60 * 1000;
    const data = chartResult.data.filter(p => Date.parse(p.ts) >= rollingStart && Date.parse(p.ts) < now.getTime());
    if (!data.length) throw new Error("No observations in the rolling import window");
    const avg = data.reduce((sum, p) => sum + p.nuclear_gw, 0) / data.length;
    const result = { ...chartResult, data, avg_gw: Math.round(avg * 100) / 100, avg_share_pct: Math.round(avg / 45 * 1000) / 10 };
    return { result, chartResult, asOfIso: now.toISOString() };
  },
  ["atomstrom-import-figure-v4-shared-recovery"],
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
