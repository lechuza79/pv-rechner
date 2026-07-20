// Google Search Console — Search-Analytics-Query (Impressions/Klicks je Seite).
// Auth über lib/google-auth.ts (geteilter Service-Account, webmasters-Scope).
// Docs: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
//
// Property: GSC_SITE_URL (Default Domain-Property "sc-domain:solar-check.io").
// Ist es eine URL-Präfix-Property, GSC_SITE_URL="https://solar-check.io/" setzen.

import { getGoogleAccessToken, getServiceAccountCredentials } from "./google-auth";

const GSC_API_BASE = "https://www.googleapis.com/webmasters/v3";
const MAX_ROWS = 25_000; // GSC-Hardlimit

// Property-URL: explizit per GSC_SITE_URL, sonst automatisch aus den Properties
// ermittelt, auf die der Service-Account Zugriff hat (Domain vs. URL-Präfix egal).
let resolvedSite: string | null = null;

async function resolveSiteUrl(token: string): Promise<string> {
  if (process.env.GSC_SITE_URL) return process.env.GSC_SITE_URL;
  if (resolvedSite) return resolvedSite;

  const res = await fetch(`${GSC_API_BASE}/sites`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GSC sites.list fehlgeschlagen: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { siteEntry?: { siteUrl: string; permissionLevel: string }[] };
  const sites = data.siteEntry ?? [];
  const match =
    sites.find((s) => s.siteUrl === "sc-domain:solar-check.io") ??
    sites.find((s) => s.siteUrl === "https://solar-check.io/") ??
    sites.find((s) => s.siteUrl.includes("solar-check.io"));
  if (!match) {
    throw new Error(
      `Service-Account hat auf keine solar-check.io-Property Zugriff. Sichtbare Properties: ${
        sites.map((s) => s.siteUrl).join(", ") || "(keine)"
      }. In der Search Console die SA-E-Mail als Nutzer der solar-check.io-Property hinzufügen.`,
    );
  }
  resolvedSite = match.siteUrl;
  return match.siteUrl;
}

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
  const siteUrl = await resolveSiteUrl(token);
  const url = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
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
