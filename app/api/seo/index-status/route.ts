import { NextResponse } from "next/server";
import { gscConfigured, querySearchAnalyticsByDate } from "../../../../lib/gsc-search-analytics";
import {
  brauchtNeueEinreichung,
  countOwnSitemapUrls,
  daysSinceDownload,
  inspectUrls,
  listSitemaps,
  submitSitemap,
} from "../../../../lib/gsc-index-status";

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

  // Veraltete Sitemap ist der Frühindikator dafür, dass neue Seiten gar nicht
  // erst entdeckt werden — sie wird nur EINMAL eingereicht, danach holt Google
  // sie nach eigenem Rhythmus. Ab `resubmitAfterDays` neu einreichen.
  const resubmit = url.searchParams.get("resubmit") === "1";
  const schwelleTage = Math.max(parseInt(url.searchParams.get("resubmitAfterDays") ?? "3", 10) || 3, 1);

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

  // Neu einreichen, wenn Google lange nicht geschaut hat ODER unsere Sitemap
  // inzwischen eine andere Zahl URLs führt als die, die Google gezählt hat.
  //
  // SELBSTHEILUNG NUR IN DER SICHEREN RICHTUNG (dieselbe Linie wie beim
  // Förder- und Gesundheits-Wächter): Ist die Sitemap GEWACHSEN, sind neue
  // Seiten live und Einreichen ist eindeutig richtig. Ist sie GESCHRUMPFT,
  // sieht ein gewollter Wellen-Rückbau exakt so aus wie ein still ausgefallener
  // Zweig in app/sitemap.ts (der Landkreis-Teil dort fängt Fehler bewusst ab).
  // Im zweiten Fall würde automatisches Einreichen Google mitteilen, hunderte
  // Seiten seien verschwunden — deshalb wird das nur gemeldet, nicht getan.
  // `force=1` führt es nach menschlicher Klärung aus.
  const sitemapListe = Array.isArray(sitemaps) ? sitemaps : [];
  const eigeneAnzahl = sitemapListe.length ? await countOwnSitemapUrls() : null;
  const force = url.searchParams.get("force") === "1";
  const geprueft = sitemapListe.map((s) => ({ s, pruefung: brauchtNeueEinreichung(s, eigeneAnzahl, schwelleTage) }));
  const faellig = geprueft.filter((x) => force || x.pruefung.noetig);

  let erneutEingereicht: { path: string; ok: boolean; grund: string | null; error?: string }[] | undefined;
  let zurueckgehalten: { path: string; grund: string | null }[] | undefined;
  if (resubmit && faellig.length) {
    erneutEingereicht = [];
    for (const { s, pruefung } of faellig) {
      if (!force && !pruefung.automatisch) {
        (zurueckgehalten ??= []).push({ path: s.path, grund: pruefung.grund });
        continue;
      }
      const grund = force && !pruefung.noetig ? "erzwungen" : pruefung.grund;
      try {
        await submitSitemap(s.path);
        erneutEingereicht.push({ path: s.path, ok: true, grund });
      } catch (e) {
        erneutEingereicht.push({ path: s.path, ok: false, grund, error: e instanceof Error ? e.message : "Fehler" });
      }
    }
    if (!erneutEingereicht.length) erneutEingereicht = undefined;
  }
  const veraltet = faellig.map((x) => x.s);

  return NextResponse.json({
    configured: true,
    range: { start: ymd(start), end: ymd(end), days },
    sitemaps: sitemapListe.length
      ? sitemapListe.map((s) => ({ ...s, tageSeitAbruf: daysSinceDownload(s), eigeneUrls: eigeneAnzahl }))
      : sitemaps,
    sitemapVeraltet: veraltet.map((s) => s.path),
    sitemapBefund: geprueft.filter((x) => x.pruefung.noetig).map((x) => ({ path: x.s.path, grund: x.pruefung.grund })),
    ...(erneutEingereicht ? { erneutEingereicht } : {}),
    ...(zurueckgehalten ? { zurueckgehalten } : {}),
    urls: inspected,
    // Sichtbar machen, was weggelassen wurde — stilles Abschneiden liest sich
    // wie „alles geprüft", obwohl es das nicht war.
    ...(abgeschnitten > 0 ? { hinweis: `${abgeschnitten} URLs nicht geprüft (Grenze ${MAX_URLS} je Aufruf)` } : {}),
    ...(prefixPath ? { prefix: prefixPath, byDate } : {}),
  });
}
