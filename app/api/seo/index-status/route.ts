import { NextResponse } from "next/server";
import { gscConfigured, querySearchAnalyticsByDate } from "../../../../lib/gsc-search-analytics";
import { inspectUrls, listSitemaps } from "../../../../lib/gsc-index-status";

// Indexierungsstatus statt nur Impressionen — die Lücke, an der die Auswertung
// der Atlas-Freischaltung vorbeigelaufen ist. Drei Antworten in einem Aufruf:
//
//   1. sitemaps  — wann eingereicht, wann von Google geholt, wie viele URLs
//   2. urls      — je Stichproben-URL: kennt Google sie, wann zuletzt gecrawlt,
//                  warum ggf. nicht indexiert (noindex? nur entdeckt? gecrawlt
//                  aber nicht aufgenommen?)
//   3. byDate    — Impressionen je Tag statt einer 28-Tage-Summe
//
// Auth: Bearer $CRON_SECRET (wie /api/alert, /api/seo/gsc).
//
// GET /api/seo/index-status?urls=<url1,url2>&prefix=/solar-atlas&days=28
// Kontingent: höchstens 10 URLs je Aufruf (Google: 2.000/Tag, 600/Minute).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;
const BASE = "https://solar-check.io";
const MAX_URLS = 10;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  if (!CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!gscConfigured()) {
    return NextResponse.json({
      configured: false,
      hint: "GOOGLE_SERVICE_ACCOUNT_JSON (Vercel) + Service-Account in der GSC-Property fehlt",
    });
  }

  const url = new URL(req.url);
  const raw = (url.searchParams.get("urls") ?? "").trim();
  const prefixPath = url.searchParams.get("prefix") ?? "";
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") ?? "28", 10) || 28, 1), 180);

  // Relative Pfade auf die Produktions-Domain heben — bequemer im Aufruf und
  // verhindert, dass versehentlich eine fremde Domain inspiziert wird.
  const urls = raw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean)
    .map((u) => (u.startsWith("http") ? u : `${BASE}${u.startsWith("/") ? "" : "/"}${u}`))
    .filter((u) => u.startsWith(BASE))
    .slice(0, MAX_URLS);

  const abgeschnitten = raw ? raw.split(",").filter(Boolean).length - urls.length : 0;

  const end = new Date(Date.now() - 3 * 86400_000); // GSC-Verzug 2–3 Tage
  const start = new Date(end.getTime() - days * 86400_000);

  const [sitemaps, inspected, byDate] = await Promise.all([
    listSitemaps().catch((e: unknown) => ({ error: e instanceof Error ? e.message : "Fehler" })),
    urls.length ? inspectUrls(urls) : Promise.resolve([]),
    prefixPath
      ? querySearchAnalyticsByDate({
          startDate: ymd(start),
          endDate: ymd(end),
          urlPrefixFilter: [`${BASE}${prefixPath}`, `https://www.solar-check.io${prefixPath}`],
        }).catch((e: unknown) => ({ error: e instanceof Error ? e.message : "Fehler" }))
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    configured: true,
    range: { start: ymd(start), end: ymd(end), days },
    sitemaps,
    urls: inspected,
    // Sichtbar machen, was weggelassen wurde — stilles Abschneiden liest sich
    // wie „alles geprüft", obwohl es das nicht war.
    ...(abgeschnitten > 0 ? { hinweis: `${abgeschnitten} URLs nicht geprüft (Grenze ${MAX_URLS} je Aufruf)` } : {}),
    ...(prefixPath ? { prefix: prefixPath, byDate } : {}),
  });
}
