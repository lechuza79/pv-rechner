import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homeFaq, pvSimulationFaq, type FaqEntry } from "./faq";
import { jsonLdHtml } from "./json-ld";
import { BASE_URL, brandOgImage, energyOgImage } from "./seo";
import { organizationJsonLd, softwareAppJsonLd } from "./site-json-ld";
import { standSeite } from "./stand";
import { liveSatz } from "./stand-format";

/**
 * The redesigned homepage and PV simulation, served as the approved documents.
 *
 * The page bodies are the design package's HTML, taken over one to one by
 * scripts/startseite-uebernehmen.mjs into app/_neon/*.html. This module only
 * fills two markers:
 *   <!--SC:KOPF-->      title, description, canonical, social cards, icons,
 *                       site verification, structured data, analytics — the
 *                       same values the React pages carried (baseline
 *                       docs/seo/baseline-2026-09-18-startseite-simulation/).
 *   <!--SC:VOR-FUSS-->  end of body: the FAQ (and on the simulation the live
 *                       output), moved above the script-built footer, in the
 *                       package's own design tokens.
 * Nothing between the markers is touched.
 */

export type NeonSeite = "startseite" | "simulation";

/**
 * Vercel Web Analytics, cookieless — with the same rule as the React site: the
 * query string is dropped before sending (it can carry a postcode or a token).
 */
export const ANALYTICS_HTML =
  `<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};window.va("beforeSend",function(e){try{var u=new URL(e.url);u.search="";e.url=u.toString();return e}catch(_){return null}});</script>` +
  `<script defer src="/_vercel/insights/script.js"></script>`;

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Keywords the site layout sets for every page (kept identical). */
const KEYWORDS =
  "PV Rechner,Photovoltaik Rentabilität,PV Amortisation berechnen,Lohnt sich Photovoltaik,Solaranlage Rechner,PV Rendite,Photovoltaik Rechner ohne Anmeldung";

const SEITEN: Record<
  NeonSeite,
  { pfad: string; titel: string; beschreibung: string; ogTitel: string; ogBeschreibung: string; ogBild: string; faq: () => FaqEntry[]; faqTitel: string }
> = {
  startseite: {
    pfad: "",
    titel: "Solar Check – Lohnt sich Photovoltaik? Ehrlich berechnet.",
    beschreibung:
      "Kostenloser PV-Rentabilitätsrechner mit direktem Ergebnis — ohne Anmeldung, ohne Verkaufsanrufe. Amortisation, Rendite und Szenarien für deine Photovoltaikanlage mit oder ohne Speicher.",
    ogTitel: "Solar Check – Lohnt sich Photovoltaik? Ehrlich berechnet.",
    ogBeschreibung:
      "Kostenloser PV-Rentabilitätsrechner mit direktem Ergebnis — ohne Anmeldung, ohne Verkaufsanrufe. Amortisation, Rendite und Szenarien für deine Photovoltaikanlage mit oder ohne Speicher.",
    ogBild: energyOgImage(),
    faq: homeFaq,
    faqTitel: "Häufige Fragen",
  },
  simulation: {
    pfad: "/pv-simulation",
    titel: "PV-Simulation – live: Was produziert dein Dach gerade? | Solar Check",
    beschreibung:
      "PV-Simulation in Echtzeit: Sieh, was verschiedene Photovoltaik-Anlagen an deinem Standort gerade produzieren würden. Aus aktuellen Wetterdaten — kostenlos, ohne Anmeldung.",
    ogTitel: "PV-Simulation – Was produziert dein Dach gerade?",
    ogBeschreibung: "Sieh in Echtzeit, was verschiedene PV-Anlagen an deinem Standort gerade produzieren würden.",
    ogBild: brandOgImage("Was produziert dein Dach gerade?", "Live PV-Leistung an deinem Standort — aus aktuellen Wetterdaten."),
    faq: pvSimulationFaq,
    faqTitel: "Häufige Fragen zur PV-Simulation",
  },
};

function kopf(seite: NeonSeite, faq: FaqEntry[]): string {
  const s = SEITEN[seite];
  const url = `${BASE_URL}${s.pfad}`;
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return [
    `<title>${esc(s.titel)}</title>`,
    `<meta name="description" content="${esc(s.beschreibung)}">`,
    `<meta name="keywords" content="${esc(KEYWORDS)}">`,
    `<meta name="theme-color" content="#FFFFFF">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:title" content="${esc(s.ogTitel)}">`,
    `<meta property="og:description" content="${esc(s.ogBeschreibung)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:site_name" content="Solar Check">`,
    `<meta property="og:image" content="${esc(s.ogBild)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:type" content="website">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(s.ogTitel)}">`,
    `<meta name="twitter:description" content="${esc(s.ogBeschreibung)}">`,
    `<meta name="twitter:image" content="${esc(s.ogBild)}">`,
    `<link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any">`,
    `<link rel="apple-touch-icon" href="/apple-icon.png" type="image/png" sizes="180x180">`,
    `<meta name="google-site-verification" content="OdndfgILkY22LlMHqIT8_ASdidCYTyqksv6LC9zw67o">`,
    `<script type="application/ld+json">${jsonLdHtml(organizationJsonLd)}</script>`,
    `<script type="application/ld+json">${jsonLdHtml(softwareAppJsonLd)}</script>`,
    `<script type="application/ld+json">${jsonLdHtml(faqLd)}</script>`,
    // Vercel Web Analytics, cookieless — with the same rule as the React site:
    // the query string is dropped before sending (it can carry a postcode).
    ANALYTICS_HTML,
    `<style>${FAQ_CSS}</style>`,
    `<script src="/shared-footer/trust-badges-v7/trust-art-web.js" defer></script>`,
    `<script src="/shared-footer/trust-badges-v7/trust-badges.js" defer></script>`,
    `<script src="/homepage-study/interactions.js" defer></script>`,
  ].join("");
}

/**
 * FAQ using shared homepage typography and the dark editorial surface:
 * type roles. Plain <details>, no script — readable before anything loads.
 */
const FAQ_CSS = `
.sc-faq{background:#08191c;color:#e8eee9;padding:72px var(--sc-page-inset,max(24px,5vw)) 88px;font-family:'DM Sans',sans-serif}
.sc-faq-wrap{max-width:var(--sc-layout-content,1120px);margin:0 auto}
.sc-faq h2{font-family:Montserrat,sans-serif;font-size:var(--sc-type-secondary-label-size,13px);line-height:1.5;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#a7bcbb;margin:0 0 16px}
.sc-faq details{border-bottom:1px solid #aec4bd30}
.sc-faq details:last-child{border-bottom:0}
.sc-faq summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:92px;box-sizing:border-box;padding:28px 0;font-size:var(--sc-type-title-size,20px);line-height:1.4;font-weight:500;transition:color 180ms ease}
.sc-faq summary:hover{color:#d4ff24}
.sc-faq summary::-webkit-details-marker{display:none}
.sc-faq summary::after{content:"";width:10px;height:10px;margin-right:4px;flex:none;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);transition:transform 240ms ease}
.sc-faq details[open]:not([data-closing]) summary::after{transform:rotate(225deg)}
.sc-faq summary:focus-visible{outline:2px solid #d4ff24;outline-offset:4px}
.sc-faq-answer{overflow:hidden}
.sc-faq p{font-size:var(--sc-type-body-size,16px);line-height:var(--sc-type-body-leading,1.6);color:#a7bcbb;margin:0 0 24px;max-width:680px}
.sc-faq a{color:inherit;text-decoration:underline;text-underline-offset:3px}
.sc-faq .sc-faq-cta{display:inline-block;margin:0 0 28px;font-size:var(--sc-type-action-size,14px);font-weight:500}
@media(prefers-reduced-motion:reduce){.sc-faq summary,.sc-faq summary::after{transition:none}}
.sc-live{background:var(--sc-surface-light);padding:72px var(--sc-page-inset,max(24px,5vw)) 0;font-family:'DM Sans',sans-serif;color:var(--ink)}
.sc-live-wrap{max-width:760px;margin:0 auto}
.sc-live h2{font-family:Montserrat,sans-serif;font-size:var(--sc-type-section-compact-size,clamp(26px,3vw,38px));line-height:1.25;margin:0 0 12px}
.sc-live p{font-size:var(--sc-type-body-size,16px);line-height:1.6;margin:0 0 24px}
.sc-live iframe{display:block;width:100%;border:0;min-height:560px}
.sc-live .sc-stand{font-size:var(--sc-type-eyebrow-size);line-height:1.7;margin:32px 0 0;padding:24px 0 0;border-top:1px solid color-mix(in srgb,var(--ink) 18%,transparent)}
.sc-live .sc-stand a{color:inherit}
`;

function antwortHtml(f: FaqEntry, aktuellerPfad: string): string {
  let text = esc(f.a);
  const links = [...(f.links ?? [])].filter((l) => l.href !== aktuellerPfad).sort((a, b) => b.phrase.length - a.phrase.length);
  for (const l of links) {
    const p = esc(l.phrase);
    const i = text.indexOf(p);
    if (i >= 0) text = text.slice(0, i) + `<a href="${esc(l.href)}">${p}</a>` + text.slice(i + p.length);
  }
  const cta = f.cta && f.cta.href !== aktuellerPfad ? `<a class="sc-faq-cta" href="${esc(f.cta.href)}">${esc(f.cta.label)} →</a>` : "";
  return `<p>${text}</p>${cta}`;
}

/**
 * The simulation's stand line, same wording as <StandNoteView>. Only the
 * "no dated value" form is needed here; if the page ever gets a dated entry,
 * this throws instead of silently dropping the date.
 */
function simulationStand(): string {
  const seite = standSeite("/pv-simulation");
  if (!seite) return "";
  if (seite.eintraege.length) throw new Error("PV-Simulation hat jetzt datierte Werte — Stand-Zeile hier erweitern");
  const live = liveSatz(seite.live);
  return `<p class="sc-stand"><strong>Stand:</strong> Diese Seite rechnet ohne Stichtag — ${esc(live ? live.replace(/\.$/, "") : "alle Werte werden live geholt")}. Womit wir rechnen, mit Stand und Quelle, steht auf der <a href="/datenstand">Datenstand-Seite</a>.</p>`;
}

function vorFuss(seite: NeonSeite, faq: FaqEntry[]): string {
  const s = SEITEN[seite];
  const aktuell = s.pfad || "/";
  const live =
    seite === "simulation"
      ? `<section class="sc-live" data-sc-vor-fuss aria-labelledby="sc-live-titel"><div class="sc-live-wrap"><h2 id="sc-live-titel">Was produziert eine PV-Anlage gerade?</h2><p>Live aus aktuellen Wetterdaten: die Leistung verschiedener Beispielanlagen an deinem Standort, Stunde für Stunde.</p><iframe id="sc-live-rahmen" src="/embed/simulation?onsite=1&amp;embed=0" title="PV-Simulation live" loading="lazy"></iframe>${simulationStand()}</div></section>` +
        // The embed reports its height (widget:height); only same-origin messages count.
        `<script>addEventListener("message",function(e){if(e.origin!==location.origin)return;var d=e.data,f=document.getElementById("sc-live-rahmen");if(f&&d&&d.type==="widget:height"&&d.height>0&&e.source===f.contentWindow)f.style.height=Math.ceil(d.height)+"px"});</script>`
      : "";
  const fragen = faq
    .map((f) => `<details><summary>${esc(f.q)}</summary><div class="sc-faq-answer">${antwortHtml(f, aktuell)}</div></details>`)
    .join("");
  // The approved page builds its footer by script; move our blocks right above
  // it once it exists. Without script they stay at the end, still readable.
  const verschieben =
    `<script>(function(){var b=[].slice.call(document.querySelectorAll("[data-sc-vor-fuss]"));function los(){var f=document.querySelector(".sc-footer");if(!f)return false;b.forEach(function(x){f.before(x)});return true}if(los())return;var o=new MutationObserver(function(){if(los())o.disconnect()});o.observe(document.body,{childList:true,subtree:true});setTimeout(function(){o.disconnect()},30000)})();</script>`;
  return `${live}<section class="sc-faq" data-sc-vor-fuss aria-labelledby="sc-faq-titel"><div class="sc-faq-wrap"><h2 id="sc-faq-titel">${esc(s.faqTitel)}</h2>${fragen}</div></section>${verschieben}`;
}

export function neonSeiteHtml(seite: NeonSeite): string {
  const vorlage = readFileSync(join(process.cwd(), "app/_neon", `${seite}.html`), "utf8");
  if (!vorlage.includes("<!--SC:KOPF-->") || !vorlage.includes("<!--SC:VOR-FUSS-->")) {
    throw new Error(`Vorlage ${seite} ohne Einfügemarken — Übernahme neu ausführen`);
  }
  const faq = SEITEN[seite].faq();
  return vorlage.replace("<!--SC:KOPF-->", kopf(seite, faq)).replace("<!--SC:VOR-FUSS-->", vorFuss(seite, faq));
}
