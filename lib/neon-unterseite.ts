import "server-only";
import { BASE_URL } from "./seo";
import { ANALYTICS_HTML, esc } from "./neon-seite";
import { siteFussHtml } from "./site-fuss";

/**
 * The three pieces of the frame that app/global-not-found.tsx needs as well.
 * It cannot call the function below (Next renders it as a React tree, not as a
 * string), so they are exported instead of typed a second time — a second copy
 * of the header or the stylesheet list would drift the moment the design
 * package ships a new file, and only on the page nobody looks at.
 */
export const NEON_STYLESHEETS = ["/shared-nav/nav.css", "/rechner-uebersicht/overview.css", "/shared-footer/footer.css"];

/** Inside of <header class="site-header"> — the brand, before the nav script fills the rest in. */
export const NEON_KOPF_INNEN =
  '<a class="brand" href="/"><img src="/shared-nav/logo-result.svg" alt="Solar Check" width="210" height="40"></a>';

/** Body of the module script that mounts the shared menu into that header. */
export const NEON_NAV_SKRIPT =
  "import {mountGlobalNav} from '/shared-nav/nav.js';mountGlobalNav(document.querySelector('header'));";

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
    NEON_STYLESHEETS.map((href) => `<link rel="stylesheet" href="${href}">`).join(""),
    ANALYTICS_HTML,
    `</head><body>`,
    `<header class="site-header">${NEON_KOPF_INNEN}</header>`,
    `<main><nav class="crumb" aria-label="Brotkrümel"><a href="/">Startseite</a><span aria-hidden="true">/</span>${esc(o.krume)}</nav>`,
    o.inhalt,
    `</main>`,
    siteFussHtml(),
    `<script type="module">${NEON_NAV_SKRIPT}</script>`,
    o.skript ? `<script>${o.skript}</script>` : "",
    `</body></html>`,
  ].join("");
}

export const htmlAntwort = (html: string, status = 200) =>
  new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
