// Google Search Console — Indexierungsstatus (URL Inspection + Sitemaps).
//
// WARUM ES DIESES MODUL GIBT: Der Wellen-Monitor konnte bisher nur Search
// Analytics abfragen (Impressionen/Klicks je Seite). Das beantwortet die Frage
// „ist die Seite im Index?" NICHT — es sagt nur, ob sie in den letzten Tagen
// ausgeliefert wurde. Eine frisch freigeschaltete Seite hat null Impressionen,
// egal ob Google sie längst indexiert hat oder gar nicht kennt; und eine Zahl
// über einen 28-Tage-Zeitraum sagt nicht, an welchem Tag sie entstanden ist.
// Beide Lücken haben in der Auswertung zu einer falschen Schlussfolgerung
// geführt. Der Indexierungsstatus ist eine eigene API und muss eigens gefragt
// werden.
//
// Kontingent (Google): 2.000 Abfragen/Tag und 600/Minute je Property — die
// Inspektion ist also für Stichproben gedacht, nicht für 11.000 Gemeinden.
// Docs: https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect

import { getGoogleAccessToken, getServiceAccountCredentials } from "./google-auth";
import { GSC_API_BASE, resolveGscSiteUrl } from "./gsc-site";

const INSPECT_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

/** Wie Google die Seite sieht. Die Felder heißen bewusst wie in der API — die
 *  Übersetzung in Klartext passiert an der Oberfläche, nicht hier. */
export type IndexStatus = {
  url: string;
  /** PASS | PARTIAL | FAIL | NEUTRAL | VERDICT_UNSPECIFIED */
  verdict: string | null;
  /** z. B. "Submitted and indexed", "Crawled - currently not indexed",
   *  "Discovered - currently not indexed", "Excluded by 'noindex' tag" */
  coverageState: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
  /** ISO-Zeitstempel des letzten Crawls — null heißt: nie gecrawlt. */
  lastCrawlTime: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  /** Sitemaps, über die Google die URL gefunden hat. */
  sitemaps: string[];
  /** Fehler beim Abruf (Kontingent, Rechte) — die Zeile bleibt dann leer. */
  error?: string;
};

export type SitemapStatus = {
  path: string;
  lastSubmitted: string | null;
  lastDownloaded: string | null;
  isPending: boolean;
  warnings: number;
  errors: number;
  submittedUrls: number;
};

type InspectResponse = {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      robotsTxtState?: string;
      indexingState?: string;
      pageFetchState?: string;
      lastCrawlTime?: string;
      googleCanonical?: string;
      userCanonical?: string;
      sitemap?: string[];
    };
  };
};

/** Eine URL inspizieren. Wirft NICHT — ein Fehler landet im `error`-Feld, damit
 *  eine Stichprobe von zehn URLs nicht an einer einzigen scheitert. */
export async function inspectUrl(url: string): Promise<IndexStatus> {
  const leer: IndexStatus = {
    url,
    verdict: null,
    coverageState: null,
    robotsTxtState: null,
    indexingState: null,
    pageFetchState: null,
    lastCrawlTime: null,
    googleCanonical: null,
    userCanonical: null,
    sitemaps: [],
  };

  const creds = getServiceAccountCredentials();
  if (!creds) return { ...leer, error: "GOOGLE_SERVICE_ACCOUNT_JSON nicht konfiguriert" };

  try {
    const token = await getGoogleAccessToken(creds);
    const siteUrl = await resolveGscSiteUrl(token);
    const res = await fetch(INSPECT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionUrl: url, siteUrl, languageCode: "de" }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ...leer, error: `HTTP ${res.status} ${text.slice(0, 200)}` };
    }
    const r = ((await res.json()) as InspectResponse).inspectionResult?.indexStatusResult ?? {};
    return {
      url,
      verdict: r.verdict ?? null,
      coverageState: r.coverageState ?? null,
      robotsTxtState: r.robotsTxtState ?? null,
      indexingState: r.indexingState ?? null,
      pageFetchState: r.pageFetchState ?? null,
      lastCrawlTime: r.lastCrawlTime ?? null,
      googleCanonical: r.googleCanonical ?? null,
      userCanonical: r.userCanonical ?? null,
      sitemaps: r.sitemap ?? [],
    };
  } catch (err) {
    return { ...leer, error: err instanceof Error ? err.message : "Unbekannter Fehler" };
  }
}

/** Mehrere URLs nacheinander inspizieren. Bewusst seriell mit kleiner Pause:
 *  das Minutenkontingent ist knapp, und ein Burst würde 429 kassieren. */
export async function inspectUrls(urls: string[], pauseMs = 150): Promise<IndexStatus[]> {
  const out: IndexStatus[] = [];
  for (const url of urls) {
    out.push(await inspectUrl(url));
    if (pauseMs > 0 && url !== urls[urls.length - 1]) {
      await new Promise((r) => setTimeout(r, pauseMs));
    }
  }
  return out;
}

/** Eingereichte Sitemaps mit Einreiche-/Abrufdatum. Beantwortet „wann habe ich
 *  das eingereicht und hat Google es überhaupt geholt?". */
export async function listSitemaps(): Promise<SitemapStatus[]> {
  const creds = getServiceAccountCredentials();
  if (!creds) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON nicht konfiguriert");

  const token = await getGoogleAccessToken(creds);
  const siteUrl = await resolveGscSiteUrl(token);
  const res = await fetch(`${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GSC sitemaps.list fehlgeschlagen: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    sitemap?: {
      path: string;
      lastSubmitted?: string;
      lastDownloaded?: string;
      isPending?: boolean;
      warnings?: string;
      errors?: string;
      contents?: { submitted?: string }[];
    }[];
  };
  return (data.sitemap ?? []).map((s) => ({
    path: s.path,
    lastSubmitted: s.lastSubmitted ?? null,
    lastDownloaded: s.lastDownloaded ?? null,
    isPending: !!s.isPending,
    warnings: Number(s.warnings ?? 0),
    errors: Number(s.errors ?? 0),
    submittedUrls: (s.contents ?? []).reduce((a, c) => a + Number(c.submitted ?? 0), 0),
  }));
}

/**
 * Sitemap erneut einreichen.
 *
 * Die Sitemap wird bei jedem Aufruf frisch ERZEUGT (app/sitemap.ts), aber nur
 * EINMAL eingereicht — danach entscheidet Google allein, wann es sie wieder
 * abholt. Bei einer kleinen, jungen Domain können das Wochen sein: am
 * 27.07.2026 lag der letzte Abruf fünf Tage zurück, meldete 83 statt 85 URLs,
 * und die zwei Tage zuvor umgezogenen Ratgeber-Seiten galten Google als
 * unbekannt. Eine erneute Einreichung ist der einzige Weg, das aktiv
 * anzustoßen (der frühere Ping-Endpunkt wurde von Google abgeschaltet).
 */
export async function submitSitemap(feedPath = "https://solar-check.io/sitemap.xml"): Promise<void> {
  const creds = getServiceAccountCredentials();
  if (!creds) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON nicht konfiguriert");

  const token = await getGoogleAccessToken(creds);
  const siteUrl = await resolveGscSiteUrl(token);
  const res = await fetch(
    `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(feedPath)}`,
    { method: "PUT", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sitemap einreichen fehlgeschlagen: ${res.status} ${text.slice(0, 200)}`);
  }
}

/** Tage seit dem letzten Abruf durch Google — der Frühindikator dafür, dass
 *  neue Seiten gar nicht erst entdeckt werden. Null, wenn nie abgerufen. */
export function daysSinceDownload(s: SitemapStatus, now = Date.now()): number | null {
  if (!s.lastDownloaded) return null;
  const t = new Date(s.lastDownloaded).getTime();
  return Number.isFinite(t) ? Math.floor((now - t) / 86_400_000) : null;
}
