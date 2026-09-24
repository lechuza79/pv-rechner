// Google Search Console — Search-Analytics-Query (Impressions/Klicks je Seite).
// Auth über lib/google-auth.ts (geteilter Service-Account, webmasters-Scope).
// Property-Auflösung in lib/gsc-site.ts (geteilt mit dem Index-Status).
// Docs: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
//
// GRENZE DIESES MODULS: Impressionen sagen NICHT, ob eine Seite im Index ist.
// Eine Seite ohne Impressionen kann indexiert sein (nur nie ausgeliefert) oder
// Google völlig unbekannt. Dafür lib/gsc-index-status.ts benutzen.

import { getGoogleAccessToken, getServiceAccountCredentials } from "./google-auth";
import { GSC_API_BASE, resolveGscSiteUrl } from "./gsc-site";

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
  const siteUrl = await resolveGscSiteUrl(token);
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

export type QueryRow = {
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

/** Impressions/Klicks je Suchanfrage (mit der jeweils rankenden Seite), optional
 *  auf eine einzelne Seite gefiltert. Position ist der impressions-gewichtete
 *  Durchschnitt, den GSC selbst liefert. */
export async function querySearchAnalyticsByQuery(opts: {
  startDate: string;
  endDate: string;
  /** Exakte Seiten-URL (voll qualifiziert) — filtert serverseitig via GSC-Filter. */
  pageUrl?: string;
  /** URL-Präfixe (voll qualifiziert) — filtert eine ganze Seitenfamilie.
   *  Nachgefiltert auf der Seiten-Dimension, die ohnehin mitgezogen wird (wie in
   *  den beiden Schwesterfunktionen).
   *
   *  NICHT, weil GSC das nicht könnte — es kann: `INCLUDING_REGEX` auf der
   *  PAGE-Dimension ist ein serverseitiger Präfixfilter, und laut Schema muss
   *  man nach einer Dimension nicht gruppieren, um gegen sie zu filtern
   *  (Discovery-Dokument, am 12.09.2026 im Original abgerufen). Der frühere
   *  Kommentar hier behauptete das Gegenteil und war der tragende Grund für die
   *  Bauweise — ungeprüft und falsch. Nachfiltern bleibt trotzdem, weil EIN
   *  Abruf mehrere Präfixe bedient; serverseitig bräuchte jede Familie ihren
   *  eigenen.
   *  OFFEN (bis 12/2026): serverseitig einmal live probieren. Es wäre der
   *  bessere Weg, sobald der Zeilendeckel (MAX_ROWS) je wirklich greift — dann
   *  ginge das Budget an die Familie statt an die ganze Domain.
   *
   *  ACHTUNG, die Zahlen sind NICHT die Reichweite der Familie: Auf der
   *  Anfragen-Ebene unterdrückt GSC seltene Suchanfragen, und WIE STARK, hängt
   *  an der Familie — gemessen 09/2026 sind auf Förder-Stadtseiten nur 0–7 %
   *  der Anfragen sichtbar, auf Atlas-Landesseiten 58–81 %
   *  (docs/seo/rankings-2026-09.md). Einen pauschalen Korrekturfaktor gibt es
   *  deshalb nicht. Für MENGEN gilt querySearchAnalyticsByPage; diese Sicht
   *  beantwortet, WONACH gesucht wurde. */
  urlPrefixFilter?: string[];
  rowLimit?: number;
}): Promise<QueryRow[]> {
  const creds = getServiceAccountCredentials();
  if (!creds) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON nicht konfiguriert");

  const token = await getGoogleAccessToken(creds);
  const siteUrl = await resolveGscSiteUrl(token);
  const res = await fetch(`${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate: opts.startDate,
      endDate: opts.endDate,
      dimensions: ["query", "page"],
      ...(opts.pageUrl
        ? { dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "equals", expression: opts.pageUrl }] }] }
        : {}),
      rowLimit: Math.min(opts.rowLimit ?? MAX_ROWS, MAX_ROWS),
      dataState: "final",
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GSC-Query (nach Suchanfrage) fehlgeschlagen: ${res.status} ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { rows?: GscRow[] };
  const prefixes = opts.urlPrefixFilter;
  return (data.rows ?? [])
    .map(
      (r): QueryRow => ({
        query: r.keys[0],
        page: r.keys[1],
        impressions: r.impressions,
        clicks: r.clicks,
        ctr: r.ctr,
        position: r.position,
      }),
    )
    .filter((r) => !prefixes?.length || prefixes.some((p) => r.page.startsWith(p)));
}

export type DayRow = { date: string; impressions: number; clicks: number };

/** Impressionen je TAG (optional auf URL-Präfixe gefiltert). Ohne diese Sicht
 *  ist eine 28-Tage-Summe nicht interpretierbar: 139 Impressionen können aus
 *  vier Wochen stammen oder aus den letzten drei Tagen — mit völlig anderer
 *  Bedeutung. Deshalb gehört sie in jede Auswertung einer frisch
 *  freigeschalteten Seitenfamilie. */
export async function querySearchAnalyticsByDate(opts: {
  startDate: string;
  endDate: string;
  urlPrefixFilter?: string[];
}): Promise<DayRow[]> {
  const creds = getServiceAccountCredentials();
  if (!creds) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON nicht konfiguriert");

  const token = await getGoogleAccessToken(creds);
  const siteUrl = await resolveGscSiteUrl(token);
  const res = await fetch(`${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate: opts.startDate,
      endDate: opts.endDate,
      // Seite mitnehmen, damit der Präfix-Filter greift: Er läuft hier im Code
      // über die Seiten-Dimension, muss sie also im Ergebnis haben.
      //
      // Der frühere Grund an dieser Stelle — „GSC kann nicht nach URL-Präfix
      // filtern und gleichzeitig nur nach Datum gruppieren" — ist widerlegt:
      // Das Discovery-Dokument sagt ausdrücklich „You do not need to group by a
      // specified dimension to filter against it", und INCLUDING_REGEX auf der
      // PAGE-Dimension ist ein Präfixfilter (am 12.09.2026 im Original
      // abgerufen). Serverseitig ginge es also mit dimensions: ["date"] allein.
      dimensions: ["date", "page"],
      rowLimit: MAX_ROWS,
      dataState: "final",
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GSC-Query (nach Datum) fehlgeschlagen: ${res.status} ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { rows?: GscRow[] };
  const prefixes = opts.urlPrefixFilter;
  const proTag = new Map<string, DayRow>();
  for (const r of data.rows ?? []) {
    const [date, page] = r.keys;
    if (prefixes?.length && !prefixes.some((p) => page.startsWith(p))) continue;
    const cur = proTag.get(date) ?? { date, impressions: 0, clicks: 0 };
    cur.impressions += r.impressions;
    cur.clicks += r.clicks;
    proTag.set(date, cur);
  }
  return Array.from(proTag.values()).sort((a, b) => a.date.localeCompare(b.date));
}
