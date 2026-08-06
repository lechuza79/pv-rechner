import { NextResponse } from "next/server";
import { gscConfigured, querySearchAnalyticsByPage, querySearchAnalyticsByQuery } from "../../../../lib/gsc-search-analytics";

// Search-Console-Kennzahlen für Wellen-Monitor und SEO-Wächter.
// Auth: Bearer $CRON_SECRET (wie /api/alert). Der Service-Account-Key
// (GOOGLE_SERVICE_ACCOUNT_JSON) lebt nur auf Vercel.
//
// GET /api/seo/gsc?prefix=/solar-atlas&days=28
//   { configured, siteHint, range, totals, pages: [{url, impressions, clicks, position}] }
// GET /api/seo/gsc?dim=query&days=90[&page=/strommix-deutschland]
//   { configured, range, queries: [{query, page, impressions, clicks, position}] }
//   — je Suchanfrage (mit rankender Seite), optional auf EINE Seite gefiltert.
// Ist GOOGLE_SERVICE_ACCOUNT_JSON nicht gesetzt → { configured:false } (kein Fehler).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;
const BASE = "https://solar-check.io";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  if (!CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!gscConfigured()) {
    return NextResponse.json({ configured: false, hint: "GOOGLE_SERVICE_ACCOUNT_JSON (Vercel) + Service-Account in der GSC-Property fehlt" });
  }

  const url = new URL(req.url);
  const prefixPath = url.searchParams.get("prefix") || "/solar-atlas";
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "28", 10) || 28, 1), 180);

  // GSC hat 2–3 Tage Lag: Ende = heute − 3, Start = Ende − days.
  const end = new Date(Date.now() - 3 * 86400_000);
  const start = new Date(end.getTime() - days * 86400_000);

  if (url.searchParams.get("dim") === "query") {
    const pagePath = url.searchParams.get("page");
    try {
      const rows = await querySearchAnalyticsByQuery({
        startDate: ymd(start),
        endDate: ymd(end),
        pageUrl: pagePath ? `${BASE}${pagePath}` : undefined,
      });
      return NextResponse.json({
        configured: true,
        range: { start: ymd(start), end: ymd(end), days },
        page: pagePath ?? null,
        queries: rows
          .sort((a, b) => b.impressions - a.impressions)
          .map((r) => ({
            query: r.query,
            page: r.page,
            impressions: r.impressions,
            clicks: r.clicks,
            position: Math.round(r.position * 10) / 10,
          })),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ configured: true, error: message }, { status: 502 });
    }
  }

  try {
    const rows = await querySearchAnalyticsByPage({
      startDate: ymd(start),
      endDate: ymd(end),
      urlPrefixFilter: [`${BASE}${prefixPath}`, `https://www.solar-check.io${prefixPath}`],
    });

    const totals = rows.reduce(
      (a, r) => ({ impressions: a.impressions + r.impressions, clicks: a.clicks + r.clicks }),
      { impressions: 0, clicks: 0 },
    );

    return NextResponse.json({
      configured: true,
      range: { start: ymd(start), end: ymd(end), days },
      prefix: prefixPath,
      pagesWithImpressions: rows.length,
      totals,
      pages: rows
        .sort((a, b) => b.impressions - a.impressions)
        .map((r) => ({ url: r.url, impressions: r.impressions, clicks: r.clicks, position: Math.round(r.position * 10) / 10 })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // 403 = Service-Account hat (noch) keinen Zugriff auf die Property.
    return NextResponse.json({ configured: true, error: message }, { status: 502 });
  }
}
