// Shared nuclear-import figure + formatters for the atomstrom-import pages.
//
// Both the overview page and the extracted /methodik page read the SAME live
// computeNuclearImport() the dashboard and API route use, so the number can
// never drift. Both are ISR (revalidate 3600), so the double fetch is cached.

import { computeNuclearImport } from "../../../lib/nuclear-import";

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";
export const PAGE_URL = `${BASE_URL}/atomstrom-import`;
export const METHODIK_URL = `${BASE_URL}/atomstrom-import/methodik`;

const WINDOW_HOURS = 168; // 7-day rolling average — smooths day/night & FR swings

export async function getNuclearImport() {
  const now = new Date();
  const start = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000);
  const startStr = start.toISOString().slice(0, 19) + "+01:00";
  const endStr = now.toISOString().slice(0, 19) + "+01:00";
  try {
    const result = await computeNuclearImport(startStr, endStr, WINDOW_HOURS);
    return { result, asOf: now };
  } catch {
    return { result: null, asOf: now };
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
    ? `Atomstrom-Import Deutschland: rund ${nf1(avgGw)} GW im Durchschnitt (7-Tage-Mittel, Stand ${standStr}). Quelle: Solar Check (solar-check.io), berechnet aus Daten von Energy-Charts / Fraunhofer ISE (CC BY 4.0). ${PAGE_URL}`
    : `Atomstrom-Import Deutschland: rechnerischer Kernstrom-Import aus sechs Nachbarländern. Quelle: Solar Check (solar-check.io), berechnet aus Daten von Energy-Charts / Fraunhofer ISE (CC BY 4.0). ${PAGE_URL}`;
}
