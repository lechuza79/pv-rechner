import "server-only";
import { BASE_URL } from "./seo";
import { ANALYTICS_HTML, esc } from "./neon-seite";
import { siteFussHtml } from "./site-fuss";

/**
 * A plain content page in the new design, built on the design package's own
 * template for such pages (rechner-uebersicht: header mounted by the shared
 * nav script, breadcrumb, intro, simple footer; stylesheet taken over one to
 * one). Only the head and the main content are ours.
 *
 * Used where the React site layout would drop a visitor from the new homepage
 * into the old design (waitlist page and its confirm/unsubscribe steps).
 */
export function neonUnterseiteHtml(o: {
  titel: string;
  beschreibung: string;
  pfad: string;
  /** Breadcrumb label of this page. */
  krume: string;
  /** Trusted HTML of the main area below the breadcrumb. */
  inhalt: string;
  index: boolean;
  /** Extra inline script (trusted), e.g. a form handler. */
  skript?: string;
}): string {
  const url = `${BASE_URL}${o.pfad}`;
  return [
    `<!doctype html><html lang="de" data-sc-shell="page"><head><meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<title>${esc(o.titel)}</title>`,
    `<meta name="description" content="${esc(o.beschreibung)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    o.index ? "" : `<meta name="robots" content="noindex,follow">`,
    `<meta name="theme-color" content="#FFFFFF">`,
    `<link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any">`,
    `<link rel="apple-touch-icon" href="/apple-icon.png" type="image/png" sizes="180x180">`,
    `<link rel="stylesheet" href="/shared-nav/nav.css"><link rel="stylesheet" href="/rechner-uebersicht/overview.css"><link rel="stylesheet" href="/shared-footer/footer.css">`,
    ANALYTICS_HTML,
    `</head><body>`,
    `<header class="site-header"><a class="brand" href="/"><img src="/shared-nav/logo-result.svg" alt="Solar Check" width="210" height="40"></a></header>`,
    `<main><nav class="crumb" aria-label="Brotkrümel"><a href="/">Startseite</a><span aria-hidden="true">/</span>${esc(o.krume)}</nav>`,
    o.inhalt,
    `</main>`,
    siteFussHtml(),
    `<script type="module">import {mountGlobalNav} from '/shared-nav/nav.js';mountGlobalNav(document.querySelector('header'));</script>`,
    o.skript ? `<script>${o.skript}</script>` : "",
    `</body></html>`,
  ].join("");
}

export const htmlAntwort = (html: string, status = 200) =>
  new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
