// Google Search Console — Search-Analytics-Query (Impressions/Klicks je Seite).
// Auth über lib/google-auth.ts (geteilter Service-Account, webmasters-Scope).
// Docs: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
//
// Property: GSC_SITE_URL (Default Domain-Property "sc-domain:solar-check.io").
// Ist es eine URL-Präfix-Property, GSC_SITE_URL="https://solar-check.io/" setzen.

import { getGoogleAccessToken, getServiceAccountCredentials } from "./google-auth";

const GSC_API_BASE = "https://www.googleapis.com/webmasters/v3";
const SITE_URL = process.env.GSC_SITE_URL || "sc-domain:solar-check.io";
const MAX_ROWS = 25_000; // GSC-Hardlimit

export type PageRow = {
  url: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

export function gscConfigured(): boolean {
  return !!getServiceAccountCredentials();
}

/** Impressions/Klicks je Seite über einen Zeitraum, optional auf URL-Präfixe
 *  gefiltert. Seiten mit 0 Impressions liefert GSC nicht zurück. */
export async function querySearchAnalyticsByPage(opts: {
  startDate: string; // YYYY-MM-DD (GSC hat 2–3 Tage Lag)
  endDate: string;
  urlPrefixFilter?: string[];
  rowLimit?: number;
}): Promise<PageRow[]> {
  const creds = getServiceAccountCredentials();
  if (!creds) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON nicht konfiguriert");

  const token = await getGoogleAccessToken(creds);
  const url = `${GSC_API_BASE}/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate: opts.startDate,
      endDate: opts.endDate,
      dimensions: ["page"],
      rowLimit: Math.min(opts.rowLimit ?? MAX_ROWS, MAX_ROWS),
      dataState: "final",
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GSC-Query fehlgeschlagen: ${res.status} ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { rows?: GscRow[] };
  const prefixes = opts.urlPrefixFilter;
  return (data.rows ?? [])
    .map((r): PageRow => ({ url: r.keys[0], impressions: r.impressions, clicks: r.clicks, ctr: r.ctr, position: r.position }))
    .filter((r) => !prefixes?.length || prefixes.some((p) => r.url.startsWith(p)));
}
