// The site footer of the new design: trust section + link footer, ONE source
// for every page (React site layout, the one-to-one homepage and simulation,
// the plain new-design pages).
//
// Server-rendered on purpose. The design package built this footer by script,
// so on the homepage its links were not in the delivered HTML. The footer is
// the one place where every topic cluster is crawlably linked from every page
// (see CLAUDE.md, "Themen-Cluster") — a script-built footer would drop that.
//
// Markup and class names are the design package's own (sc-trust, sc-footer,
// public/shared-footer/footer.css); only the data behind them lives here:
//   - the link groups are the package's groups, plus the Energie-Atlas state
//     pages the old footer linked (released atlas levels, same rule as before);
//   - the trust items come from lib/trust-signals.ts, never typed here — they
//     are promises under § 5 UWG on every page and have exactly one source.
import { TRUST_SIGNALS, type TrustIcon } from "./trust-signals";
import { BUNDESLAENDER } from "./mastr-regions";
import { slugify } from "./atlas-cities";
import { atlasLevelReleased } from "./atlas-index";

export type FussLink = { href: string; label: string };
export type FussGruppe = { titel: string; links: FussLink[] };

/** State pages of the Energie-Atlas (released levels only, same rule as the old
 *  footer). Shown centred under the columns, each with its outline faintly
 *  behind the name — the outlines come from one cached sprite
 *  (app/bundeslaender.svg), not inline: all sixteen are ~30 kB, on every page. */
export const FUSS_LAENDER: (FussLink & { slug: string })[] = atlasLevelReleased("bundesland")
  ? BUNDESLAENDER.map((bl) => ({ href: `/solar-atlas/${slugify(bl.name)}`, label: bl.name, slug: slugify(bl.name) }))
  : [];

export const FUSS_GRUPPEN: FussGruppe[] = [
  {
    titel: "Rechner",
    links: [
      { href: "/photovoltaik-rechner", label: "PV-Anlage planen" },
      { href: "/photovoltaik-rechner?direkt=1", label: "PV durchrechnen" },
      { href: "/balkonkraftwerk/rechner", label: "Balkonkraftwerk" },
      { href: "/waermepumpe-rechner", label: "Wärmepumpe" },
      { href: "/klimaanlage-stromkosten", label: "Klimaanlage" },
      { href: "/einspeiseverguetung-rechner", label: "Einspeisevergütung" },
      { href: "/pv-simulation", label: "Live-Simulation" },
    ],
  },
  {
    titel: "Themen & Förderung",
    links: [
      { href: "/ratgeber", label: "Alle Ratgeber" },
      { href: "/balkonkraftwerk", label: "Balkonkraftwerk verstehen" },
      { href: "/balkonkraftwerk/ratgeber/anmelden", label: "Balkonkraftwerk anmelden" },
      { href: "/balkonkraftwerk/ratgeber/mit-speicher", label: "Balkonkraftwerk mit Speicher" },
      { href: "/photovoltaik-foerderung", label: "PV-Förderung" },
      { href: "/balkonkraftwerk/foerderung", label: "Balkonkraftwerk-Förderung" },
      { href: "/ratgeber/waermepumpe-foerderung", label: "Wärmepumpen-Förderung" },
      { href: "/glossar", label: "Glossar" },
    ],
  },
  {
    titel: "Atlas & Energiemonitor",
    links: [
      { href: "/solar-atlas", label: "Energie-Atlas" },
      { href: "/strommix-deutschland", label: "Strommix Deutschland" },
      { href: "/atomstrom-import", label: "Atomstrom-Import" },
      { href: "/photovoltaik-bestand-deutschland", label: "Solaranlagen in Deutschland" },
      { href: "/photovoltaik-zubau-deutschland", label: "Solar-Zubau" },
      { href: "/datenstand", label: "Datenstand & Quellen" },
    ],
  },
  {
    titel: "Solar Check & Weiterverwenden",
    links: [
      { href: "/ueber", label: "Über Solar Check" },
      { href: "/methodik", label: "So rechnen wir" },
      { href: "/kontakt", label: "Kontakt" },
      { href: "/presse", label: "Medien & Creator" },
      { href: "/energie-widgets", label: "Widgets für deine Website" },
      { href: "/lizenz", label: "Nutzung & Lizenz" },
    ],
  },
];

/** Badge artwork of the package (public/shared-footer/trust-badges-v7) per trust icon. */
const MOTIV: Record<TrustIcon, string> = { check: "research", quote: "sources", refresh: "updated", lock: "access" };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const PFEIL =
  '<svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.333 8h9.334m0 0L8 3.333M12.667 8 8 12.667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Inner HTML of the trust section (the grid). */
export function vertrauenInnenHtml(): string {
  const items = TRUST_SIGNALS.map((s) => {
    // Link the named terms in text order, like the package did.
    const treffer = (s.links ?? [])
      .map((l) => ({ ...l, at: s.text.indexOf(l.begriff) }))
      .filter((l) => l.at >= 0)
      .sort((a, b) => a.at - b.at);
    let text = "";
    let i = 0;
    for (const l of treffer) {
      text += esc(s.text.slice(i, l.at)) + `<a href="${esc(l.url)}">${esc(l.begriff)}</a>`;
      i = l.at + l.begriff.length;
    }
    text += esc(s.text.slice(i));
    const mehr = s.mehr ? `<a class="sc-trust-more" href="${esc(s.href)}">Mehr erfahren ${PFEIL}</a>` : "";
    return `<div class="sc-trust-item"><solar-trust-badge motif="${MOTIV[s.icon]}" aria-hidden="true"></solar-trust-badge><h3>${esc(s.titel)}</h3><p>${text}</p>${mehr}</div>`;
  }).join("");
  return `<div class="sc-trust-grid">${items}</div>`;
}

/** Everything in the footer after the brand logo. */
export function fussInnenHtml(): string {
  const gruppen = FUSS_GRUPPEN.map(
    (g) => `<section><h2>${esc(g.titel)}</h2>${g.links.map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join("")}</section>`,
  ).join("");
  return (
    `<p class="sc-footer-tagline">Dein Dach. Deine Energie.</p>` +
    `<nav class="sc-footer-grid" aria-label="Fußnavigation">${gruppen}</nav>` +
    (FUSS_LAENDER.length
      ? `<nav class="sc-footer-laender" aria-label="Energie-Atlas nach Bundesland"><h2>Energie-Atlas nach Bundesland</h2><div>${FUSS_LAENDER.map((l) => `<a href="${esc(l.href)}"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="/bundeslaender.svg#bl-${esc(l.slug)}"/></svg><span>${esc(l.label)}</span></a>`).join("")}</div></nav>`
      : "") +
    `<div class="sc-footer-legal"><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a></div>` +
    `<p class="sc-footer-disclaimer">Alle Berechnungen und Angaben sind unverbindliche Näherungswerte ohne Anspruch auf Richtigkeit, Aktualität oder Vollständigkeit und stellen keine Rechts-, Steuer- oder Anlageberatung dar.</p>`
  );
}

/** Scripts that draw the trust badges (web component + artwork, in this order). */
export const FUSS_SKRIPTE =
  '<script src="/shared-footer/trust-badges-v7/trust-art-web.js" defer></script><script src="/shared-footer/trust-badges-v7/trust-badges.js" defer></script>';

/**
 * The full block as a string, for the pages served as documents. The logo is
 * cloned from the page header by a tiny script (the design package's own way);
 * without script the brand shows as text.
 */
export function siteFussHtml(): string {
  return (
    `<div data-sc-fuss>` +
    `<section class="sc-trust" data-sc-server aria-label="Unsere Grundlagen">${vertrauenInnenHtml()}</section>` +
    `<footer class="sc-footer" data-sc-server><div class="sc-footer-wrap"><a class="sc-footer-brand" href="/" aria-label="Solar Check – Startseite">solar-check.io</a>${fussInnenHtml()}</div></footer>` +
    `</div>` +
    `<script>(function(){var b=document.querySelector("footer[data-sc-server] .sc-footer-brand");function los(){var s=document.querySelector(".site-header .brand svg");if(!s||!b)return false;var k=s.cloneNode(true);k.setAttribute("width","220");k.querySelectorAll("[id]").forEach(function(e){var a=e.id,n="footer-"+a;e.id=n;k.querySelectorAll("*").forEach(function(x){[].slice.call(x.attributes).forEach(function(t){if(t.value.indexOf("#"+a+")")>=0)x.setAttribute(t.name,t.value.split("#"+a+")").join("#"+n+")"))})})});b.textContent="";b.append(k);return true}if(!los()){var o=new MutationObserver(function(){if(los())o.disconnect()});o.observe(document.documentElement,{childList:true,subtree:true});setTimeout(function(){o.disconnect()},15000)}})();</script>` +
    FUSS_SKRIPTE
  );
}
