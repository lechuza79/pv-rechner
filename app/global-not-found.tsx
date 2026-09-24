import type { Metadata } from "next";
import NichtGefundenInhalt from "../components/NichtGefundenInhalt";
import { NICHT_GEFUNDEN } from "../lib/nicht-gefunden";
import { ANALYTICS_SETUP, ANALYTICS_SRC } from "../lib/neon-seite";
import { NEON_KOPF_INNEN, NEON_NAV_SKRIPT, NEON_STYLESHEETS } from "../lib/neon-unterseite";
import { siteFussHtml } from "../lib/site-fuss";

/**
 * The 404 page for an address that matches no route at all.
 *
 * WHY THIS FILE AND NOT app/not-found.tsx: this app has no app/layout.tsx —
 * (site), (embed) and (partner) each bring their own root layout. A root
 * not-found.tsx therefore has no layout to live in and Next refuses it
 * ("not-found.tsx doesn't have a root layout", measured 20.09.2026: HTTP 500 on
 * every unknown address). global-not-found.tsx is exactly the way out: it IS
 * the document, html and body included. It needs experimental.globalNotFound in
 * next.config.js; without the flag Next keeps its own bare default page.
 *
 * WHAT MUST NOT CHANGE: this page keeps answering with HTTP 404. A soft 404
 * (status 200 with the 404 text in the body) counts as a valid page for Google
 * and it would crawl invented addresses on — and the health check, which asks
 * for an invented address and expects 404, would go red. Next sets the status
 * here; nothing in this file may turn it into a redirect or a normal page.
 *
 * The frame is the one every plain page of the new design uses
 * (lib/neon-unterseite.ts) — same header, same stylesheets, same footer.
 */
export const metadata: Metadata = {
  title: NICHT_GEFUNDEN.titel,
  description: NICHT_GEFUNDEN.beschreibung,
  // No robots entry here: Next already marks a not-found page as noindex, and a
  // second one only lands a conflicting-looking pair in the delivered HTML.
};

export default function GlobalNotFound() {
  return (
    <html lang="de" data-sc-shell="page">
      <head>
        {/* charset and viewport come from Next itself — repeating them here
            put each of them into the delivered HTML twice (measured). */}
        <meta name="theme-color" content="#FFFFFF" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-icon.png" type="image/png" sizes="180x180" />
        {NEON_STYLESHEETS.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        {/* Same reach measurement as every other document page, and for the same
            reason it is allowed at all: the setup snippet drops the query string
            before anything is sent (lib/neon-seite.ts). Without it a broken
            inbound link is invisible — the one thing a 404 is worth measuring
            for. Setup first, then the script that reads it. */}
        <script dangerouslySetInnerHTML={{ __html: ANALYTICS_SETUP }} />
        <script defer src={ANALYTICS_SRC} />
      </head>
      <body>
        <header className="site-header" dangerouslySetInnerHTML={{ __html: NEON_KOPF_INNEN }} />
        <NichtGefundenInhalt />
        {/* Trust section + footer, the same source as every other page. */}
        <div dangerouslySetInnerHTML={{ __html: siteFussHtml() }} />
        <script type="module" dangerouslySetInnerHTML={{ __html: NEON_NAV_SKRIPT }} />
      </body>
    </html>
  );
}
