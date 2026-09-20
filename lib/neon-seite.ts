import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homeFaq, pvSimulationFaq, type FaqEntry } from "./faq";
import { jsonLdHtml } from "./json-ld";
import { BASE_URL, brandOgImage, energyOgImage } from "./seo";
import { organizationJsonLd, softwareAppJsonLd } from "./site-json-ld";
import { standSeite } from "./stand";
import { liveSatz } from "./stand-format";
import { siteFussHtml } from "./site-fuss";

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
 *   <!--SC:STATISCH-->  homepage only: the body of the draft section
 *                       (#entdecken), which the takeover empties. The script
 *                       hides that section and builds tools, atlas and guides
 *                       in its place, so this is what a crawler without
 *                       JavaScript reads instead of the draft.
 * Nothing between the markers is touched.
 */

export type NeonSeite = "startseite" | "simulation";

/**
 * Vercel Web Analytics, cookieless — with the same rule as the React site: the
 * query string is dropped before sending (it can carry a postcode or a token).
 */
/** The part that drops the query string — must run BEFORE the script below. */
export const ANALYTICS_SETUP =
  'window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};window.va("beforeSend",function(e){try{var u=new URL(e.url);u.search="";e.url=u.toString();return e}catch(_){return null}});';

export const ANALYTICS_SRC = "/_vercel/insights/script.js";

export const ANALYTICS_HTML =
  `<script>${ANALYTICS_SETUP}</script>` + `<script defer src="${ANALYTICS_SRC}"></script>`;

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
    `<script src="/homepage-study/hero-contrast.js" defer></script>`,
    `<script src="/homepage-study/interactions.js" defer></script>`,
  ].join("");
}

/**
 * FAQ using shared homepage typography and the dark editorial surface:
 * type roles. Plain <details>, no script — readable before anything loads.
 */
const FAQ_CSS = `
.sc-faq{background:#08191c;color:#e8eee9;padding:var(--sc-space-section,72px) var(--sc-page-inset,max(24px,5vw)) 88px;font-family:'DM Sans',sans-serif}
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
.sc-live{background:var(--sc-surface-light);padding:var(--sc-space-section,72px) var(--sc-page-inset,max(24px,5vw)) 0;font-family:'DM Sans',sans-serif;color:var(--ink)}
.sc-live-wrap{max-width:var(--sc-layout-widget,760px);margin:0 auto}
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

/**
 * The sections the page's own script builds at runtime, as server HTML.
 *
 * Why at all: without script the homepage's body carried ~900 characters —
 * hero, intro, FAQ, footer — plus the design draft's two placeholder cards.
 * Tools, the local atlas and the guides only exist after
 * public/dynamic-hero/dist/test.js has run, so every crawler that does not
 * execute JavaScript (most AI crawlers and the smaller search engines; Google
 * does render) read the DRAFT instead of the product.
 *
 * Where it goes: into the draft section (#entdecken) itself, whose body the
 * takeover replaces with <!--SC:STATISCH-->. That section is the one thing the
 * script already takes away again (it sets `hidden`), so with script running
 * nothing here is visible and nothing is duplicated — no second hiding
 * mechanism, no new markers in the scene.
 *
 * DRIFT IS THE RISK, NOT CORRECTNESS: this is a second copy of wording that
 * lives in the design package's bundle. lib/__tests__/startseite-statisch.test.ts
 * reads the bundle and holds every heading and every link of the three mirrored
 * sections against this list; sections we deliberately do not mirror are named
 * there with a reason. Whoever changes the wording in the package makes that
 * test red — that is the whole point of having it.
 */
type StatischerLink = { text: string; href: string };
type StatischeKarte = { kennung: string; titel: string; text: string; links: StatischerLink[]; hinweis?: string };

const WERKZEUGE: StatischeKarte[] = [
  {
    kennung: "01 / PHOTOVOLTAIK",
    titel: "Dein Dach kann mehr.",
    text: "Finde die passende Anlage oder rechne deine konkrete Planung durch.",
    links: [
      { text: "Passende Anlage finden", href: "/pv-bedarf-berechnen" },
      { text: "Anlage durchrechnen", href: "/photovoltaik-rechner" },
    ],
  },
  {
    kennung: "02 / BALKONKRAFTWERK",
    titel: "Kleine Fläche. Eigener Strom.",
    text: "Was bringt dein Balkon – und welches Set lohnt sich für dich?",
    links: [{ text: "Balkonkraftwerk berechnen", href: "/balkonkraftwerk/rechner" }],
  },
  {
    kennung: "03 / WÄRMEPUMPE",
    titel: "Wie heizt du morgen?",
    text: "Vergleiche Anschaffung und laufende Heizkosten mit deiner bisherigen Heizung.",
    links: [{ text: "Wärmepumpe durchrechnen", href: "/waermepumpe-rechner" }],
  },
  {
    kennung: "04 / FÖRDERCHECK",
    titel: "Welche Förderung bekommst du?",
    text: "Entdecke Zuschüsse für deine Solaranlage – passend zu deinem Bundesland und deinem Ort.",
    links: [{ text: "Förderung finden", href: "/photovoltaik-foerderung" }],
  },
  {
    // The waitlist is a dialog, so the script builds a button here and there is
    // no page to link to (/warteliste only has confirm and unsubscribe routes).
    // Without script the card therefore states the fact and offers no action —
    // a link that leads nowhere would be worse than none.
    kennung: "05 / ANGEBOTSCHECK",
    hinweis: "Demnächst",
    titel: "Schon ein Angebot auf dem Tisch?",
    text: "Ordne Preis, Anlagengröße und Annahmen besser ein. Wir arbeiten am Angebotscheck.",
    links: [],
  },
];

const ATLAS_PUNKTE = [
  "Solaranlagen und Speicher in deiner Gemeinde",
  "Deinen Ort mit der Region vergleichen",
  "Lokale Zahlen und Geschichten entdecken",
];

const ORGANISATIONEN: { titel: string; text: string; href: string }[] = [
  { titel: "Für Fachbetriebe", text: "Rechner im eigenen Auftritt · Pilot besprechen", href: "/kontakt" },
  { titel: "Für Kommunen", text: "Lokale Energiedaten zeigen und teilen", href: "/energie-widgets" },
  { titel: "Für Versorger", text: "Rechner und Förderdaten als Kundenservice", href: "/kontakt" },
  { titel: "Für Medien & Creator", text: "Grafiken, Daten und Geschichten nutzen", href: "/presse" },
];

const RATGEBER: { kennung: string; bereich: string; titel: string; href: string }[] = [
  { kennung: "01", bereich: "PHOTOVOLTAIK", titel: "Lohnt sich eine Solaranlage mit Speicher?", href: "/ratgeber/lohnt-sich-pv-mit-speicher" },
  { kennung: "02", bereich: "HEIZEN", titel: "Gasheizung oder Wärmepumpe?", href: "/ratgeber/gasheizung-oder-waermepumpe" },
  { kennung: "03", bereich: "BALKONKRAFTWERK", titel: "Wann lohnt sich ein Balkonspeicher?", href: "/balkonkraftwerk/ratgeber/mit-speicher" },
];

/**
 * Text only — the block is display:none as soon as the script runs, so this
 * never competes with the design. It exists so the no-script page is readable
 * rather than a stack of unstyled headings on the dark scene.
 *
 * Sizes come from the design package's type tokens (--sc-type-*), the same way
 * the FAQ above does: these documents carry the package's scale, not the site
 * theme's. One role, one size — 11px and 10px labels were typed here first and
 * are now the eyebrow token, which is what that role already has.
 */
const STATISCH_CSS = `
.sc-statisch{background:#08191c;color:#e8eee9;padding:72px max(24px,5vw);font-family:'DM Sans',sans-serif}
.sc-statisch-wrap{max-width:1120px;margin:0 auto}
.sc-statisch h2{font-family:Montserrat,sans-serif;font-size:var(--sc-type-section-size,clamp(26px,2.6vw,34px));line-height:var(--sc-type-section-leading,1.25);font-weight:450;margin:12px 0 16px}
.sc-statisch h3{font-family:Montserrat,sans-serif;font-size:var(--sc-type-title-size,20px);line-height:var(--sc-type-title-leading,1.35);font-weight:500;margin:0 0 8px}
.sc-statisch p{font-size:var(--sc-type-body-size,16px);line-height:var(--sc-type-body-leading,1.6);color:#a7bcbb;margin:0 0 12px;max-width:680px}
.sc-statisch .sc-statisch-kicker{font-size:var(--sc-type-secondary-label-size,13px);letter-spacing:var(--sc-type-eyebrow-tracking,.08em);text-transform:uppercase;color:#a7bcbb;margin:0}
.sc-statisch ul{list-style:none;margin:0 0 20px;padding:0}
.sc-statisch li{font-size:var(--sc-type-body-size,16px);line-height:var(--sc-type-body-leading,1.6);color:#a7bcbb;padding:4px 0}
.sc-statisch a{color:inherit;text-decoration:underline;text-underline-offset:3px}
.sc-statisch-karten{display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));margin:32px 0 0;padding:0;list-style:none}
.sc-statisch-karte{border:1px solid #aec4bd30;border-radius:12px;padding:24px}
.sc-statisch-kennung{font-size:var(--sc-type-eyebrow-size,12px);line-height:var(--sc-type-eyebrow-leading,1.5);letter-spacing:var(--sc-type-eyebrow-tracking,.08em);color:#a8c1bd;margin:0 0 12px}
.sc-statisch-aktionen a{display:block;font-size:var(--sc-type-action-size,14px);padding:4px 0}
.sc-statisch-block{margin-top:56px}
.sc-statisch-liste{list-style:none;margin:16px 0 0;padding:0;border-top:1px solid #aec4bd30}
.sc-statisch-liste li{border-bottom:1px solid #aec4bd30;padding:20px 0}
.sc-statisch-liste small{font-size:var(--sc-type-eyebrow-size,12px);line-height:var(--sc-type-eyebrow-leading,1.5);letter-spacing:var(--sc-type-eyebrow-tracking,.08em);color:#9db7ab;display:block}
`;

/** The server-side twin of the script-built sections. Homepage only. */
function statischeSektionen(): string {
  const karten = WERKZEUGE.map(
    (k) =>
      `<li class="sc-statisch-karte"><p class="sc-statisch-kennung">${esc(k.kennung)}${k.hinweis ? ` · ${esc(k.hinweis)}` : ""}</p>` +
      `<h3>${esc(k.titel)}</h3><p>${esc(k.text)}</p>` +
      (k.links.length
        ? `<div class="sc-statisch-aktionen">${k.links.map((l) => `<a href="${esc(l.href)}">${esc(l.text)} →</a>`).join("")}</div>`
        : "") +
      `</li>`,
  ).join("");
  const ratgeber = RATGEBER.map(
    (r) =>
      `<li><small>${esc(r.kennung)} · ${esc(r.bereich)}</small><h3><a href="${esc(r.href)}">${esc(r.titel)}</a></h3></li>`,
  ).join("");
  const punkte = ATLAS_PUNKTE.map((p) => `<li>${esc(p)}</li>`).join("");
  const organisationen = ORGANISATIONEN.map(
    (o) => `<li><h3><a href="${esc(o.href)}">${esc(o.titel)}</a></h3><p>${esc(o.text)}</p></li>`,
  ).join("");
  return (
    `<style>${STATISCH_CSS}</style>` +
    `<div class="sc-statisch"><div class="sc-statisch-wrap">` +
    `<p class="sc-statisch-kicker">AUS SONNENLICHT WIRD KLARHEIT</p>` +
    `<h2 id="feature-title">Eine gute Entscheidung beginnt mit deinen Zahlen.</h2>` +
    `<p>Ein eigenes Dach? Ein freier Balkon? Oder eine neue Heizung? Finde heraus, was sich für dich rechnet.</p>` +
    `<ul class="sc-statisch-karten">${karten}</ul>` +
    `<section class="sc-statisch-block" aria-labelledby="sc-statisch-atlas">` +
    `<p class="sc-statisch-kicker">DIE ENERGIEWENDE VOR DEINER HAUSTÜR</p>` +
    `<h2 id="sc-statisch-atlas">Wie weit ist dein Ort?</h2>` +
    `<p>Entdecke, wie viel Solarenergie schon in deiner Gemeinde steckt. Sieh dir lokale Zahlen an und finde heraus, wie dein Ort im Vergleich zur Umgebung dasteht.</p>` +
    `<ul>${punkte}</ul><p><a href="/solar-atlas">Deinen Ort entdecken →</a></p></section>` +
    `<section class="sc-statisch-block" aria-labelledby="sc-statisch-ratgeber">` +
    `<h2 id="sc-statisch-ratgeber">Erst verstehen. Dann entscheiden.</h2>` +
    `<p><a href="/ratgeber">Alle Ratgeber →</a></p>` +
    `<ul class="sc-statisch-liste">${ratgeber}</ul></section>` +
    `<section class="sc-statisch-block" aria-labelledby="sc-statisch-organisationen">` +
    `<p class="sc-statisch-kicker">Solar Check für Unternehmen &amp; Organisationen</p>` +
    `<h2 id="sc-statisch-organisationen">Unsere Tools. Für deine Kunden, deine Bürger, dein Publikum.</h2>` +
    `<ul class="sc-statisch-liste">${organisationen}</ul></section>` +
    `</div></div>`
  );
}

/** What the drift guard reads; not used at render time. */
export const STATISCHE_INHALTE = { WERKZEUGE, ATLAS_PUNKTE, RATGEBER, ORGANISATIONEN };

function vorFuss(seite: NeonSeite, faq: FaqEntry[]): string {
  const s = SEITEN[seite];
  const aktuell = s.pfad || "/";
  // Deferred until the live-output redesign is ready; do not mount its iframe.
  const showLiveOutput = false;
  const live = showLiveOutput ?
    `<section class="sc-live" data-sc-vor-fuss aria-labelledby="sc-live-titel"><div class="sc-live-wrap"><h2 id="sc-live-titel">Was produziert eine PV-Anlage gerade?</h2><p>Live aus aktuellen Wetterdaten: die Leistung verschiedener Beispielanlagen an deinem Standort, Stunde für Stunde.</p><div class="sc-live-entry"><p>Gib deine Postleitzahl ein, um die aktuelle Solarleistung an deinem Ort zu sehen.</p><div data-sc-location-slot></div></div><iframe id="sc-live-rahmen" hidden title="PV-Simulation live" loading="lazy"></iframe>${simulationStand()}</div></section>` +
        // The embed reports its height (widget:height); only same-origin messages count.
        `<script>addEventListener("message",function(e){if(e.origin!==location.origin)return;var d=e.data,f=document.getElementById("sc-live-rahmen");if(f&&d&&d.type==="widget:height"&&d.height>0&&e.source===f.contentWindow)f.style.height=Math.ceil(d.height)+"px"});</script>`
    : "";
  const fragen = faq
    .map((f) => `<details><summary>${esc(f.q)}</summary><div class="sc-faq-answer">${antwortHtml(f, aktuell)}</div></details>`)
    .join("");
  // The footer (with trust section) is ours and server-rendered
  // (lib/site-fuss.ts); the page's script no longer builds one (takeover
  // patch). Order at the end of the body: live output, FAQ, footer. On the
  // homepage the script moves the trust section into its own slot.
  return `${live}<section class="sc-faq" data-sc-vor-fuss aria-labelledby="sc-faq-titel"><div class="sc-faq-wrap"><h2 id="sc-faq-titel">${esc(s.faqTitel)}</h2>${fragen}</div></section>${siteFussHtml()}`;
}

export function neonSeiteHtml(seite: NeonSeite): string {
  const vorlage = readFileSync(join(process.cwd(), "app/_neon", `${seite}.html`), "utf8");
  if (!vorlage.includes("<!--SC:KOPF-->") || !vorlage.includes("<!--SC:VOR-FUSS-->")) {
    throw new Error(`Vorlage ${seite} ohne Einfügemarken — Übernahme neu ausführen`);
  }
  // Only the homepage carries the third marker; the simulation keeps its draft
  // section unchanged. A homepage template without it means the takeover ran
  // without the patch — that must not pass silently.
  if (seite === "startseite" && !vorlage.includes("<!--SC:STATISCH-->")) {
    throw new Error("Startseiten-Vorlage ohne <!--SC:STATISCH--> — Übernahme neu ausführen");
  }
  const faq = SEITEN[seite].faq();
  return vorlage
    .replace("<!--SC:KOPF-->", kopf(seite, faq))
    .replace("<!--SC:STATISCH-->", seite === "startseite" ? statischeSektionen() : "")
    .replace("<!--SC:VOR-FUSS-->", vorFuss(seite, faq));
}
