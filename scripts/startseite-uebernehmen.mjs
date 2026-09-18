/**
 * Takes over the approved homepage + PV simulation from the design package
 * ONE TO ONE: files are copied unchanged into public/ under their original
 * paths, and only the patches listed below are applied. Every patch must hit;
 * a patch that finds nothing aborts the run, so a newer package can never be
 * taken over with a fix silently missing.
 *
 * Why not rebuild in React: the page was approved as rendered. A rebuild
 * (tried first, 2026-09-18) drifted in header, splashes, race chart and more.
 * The component library is aligned to these pages AFTERWARDS, checked by an
 * image comparison against them — not the other way round.
 *
 *   node scripts/startseite-uebernehmen.mjs <path-to-solar-hero-handoff>
 *
 * Writes: public/<original paths>, app/_neon/startseite.html,
 * app/_neon/simulation.html (document templates with insertion markers).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const QUELLE = process.argv[2];
if (!QUELLE || !existsSync(join(QUELLE, "Solar-Check-Dynamisch.html"))) {
  console.error("Aufruf: node scripts/startseite-uebernehmen.mjs <Pfad zum solar-hero-handoff>");
  process.exit(1);
}
const ZIEL = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PUBLIC = join(ZIEL, "public");

// ─── Files the two pages request (measured by loading both pages at 1440 and
// 393 px incl. postcode entry and story reader), plus directories that are
// read relative to a script (menu illustrations, motifs, reader assets). ────
const DATEIEN = [
  "dynamic-hero/test.css",
  "dynamic-hero/panel-fallback-0.webp",
  "dynamic-hero/panel-fallback-mobile.webp",
  "dynamic-hero/plz-coordinates.json",
  "dynamic-hero/shell-font-0.woff2",
  "dynamic-hero/shell-font-1.woff2",
  "dynamic-hero/moon-lroc-1k.jpg",
  "design-lab/homepage-experiments.css",
  "design-lab/splash-blue-web.svg",
  "design-lab/splash-color-web.svg",
  "design-lab/splash-ochre-web.svg",
  "design-lab/splash-sage-web.svg",
  "homepage-study/homepage.css",
  "homepage-study/mobile-hero.css",
  "homepage-study/montserrat-700.woff2",
  "homepage-study/illustrations/balcony-modern-v20.webp",
  "homepage-study/illustrations/funding-check-v20.webp",
  "homepage-study/illustrations/heatpump-modern-v20.webp",
  "homepage-study/illustrations/house-v20.webp",
  "homepage-study/illustrations/offer-check-v20.webp",
  "homepage-study/audience-v3/register.js",
  "shared-footer/footer.css",
  "shared-footer/trust-badges-v7/trust-badges.js",
  "shared-footer/trust-badges-v7/trust-art-web.js",
  "shared-person/person.css",
  "shared-person/sebastian-portrait.webp",
  "illustrations-motion/solar-illustrations.js",
  "illustrations-neon/solar-neon.js",
];
// The stage bundle: its entry plus the chunks it imports (the package's dist
// folder also holds a dozen stale builds of the renderer, ~9 MB).
function modulGraph(eintrag) {
  const gesehen = new Set();
  const offen = [eintrag];
  while (offen.length) {
    const rel = offen.pop();
    if (gesehen.has(rel)) continue;
    gesehen.add(rel);
    const text = readFileSync(join(QUELLE, rel), "utf8");
    for (const m of text.matchAll(/["']\.\/([\w.-]+\.js)["']/g)) offen.push(join(dirname(rel), m[1]));
  }
  return [...gesehen];
}
DATEIEN.push(...modulGraph("dynamic-hero/dist/test.js"));
const ORDNER = [
  "homepage-study/race-dist",
  "homepage-study/story-dist",
  "homepage-study/audience-v3/assets",
  "shared-nav",
  "illustrations-neon/assets-web",
  "illustrations-neon/motifs",
];
// Only web formats; the packages also carry multi-megabyte masters.
const ERLAUBT = /\.(js|css|json|webp|svg|woff2|jpg|png)$/;

const kopiert = [];
function kopiere(rel) {
  const von = join(QUELLE, rel);
  if (!existsSync(von)) throw new Error(`Fehlt im Paket: ${rel}`);
  if (statSync(von).isDirectory()) {
    for (const e of readdirSync(von)) kopiere(join(rel, e));
    return;
  }
  if (!ERLAUBT.test(rel)) return;
  const nach = join(PUBLIC, rel);
  mkdirSync(dirname(nach), { recursive: true });
  copyFileSync(von, nach);
  kopiert.push(rel);
}
for (const d of DATEIEN) kopiere(d);
for (const d of ORDNER) kopiere(d);

// ─── Patches ────────────────────────────────────────────────────────────────
// Each: file (in public/ or the page templates), from, to, why.
const DOMAIN_WEG = { from: /https:\/\/solar-check\.io(?=[/"'`])/g, to: "", why: "Links auf die eigene Seite relativ statt auf die Live-Domain (die Vorschau lief auf localhost)." };
const PATCHES = [
  {
    datei: "dynamic-hero/dist/test.js",
    from: 'new URLSearchParams(window.location.search).has("homepage")',
    to: "!0",
    why: "Startseiten-Modus fest an: die Vorschau schaltete ihn über ?homepage=1 ein, die echte Seite hat keinen Adress-Zusatz.",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: '<a href="https://open-meteo.com/" target="_blank" rel="noopener">Wettermodell: Open-Meteo</a>',
    to: '<a href="/datenstand" target="_blank" rel="noopener">Wetter: Deutscher Wetterdienst</a>',
    why: "Das Live-Wetter kommt auf der Seite vom DWD (eigene Schnappschüsse), nicht mehr von Open-Meteo.",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: '<p><a href="http://localhost:4178/Solar-Check-Regen-Test.html" target="_blank" rel="noopener">Variante C vergleichen \\u2197</a></p>',
    to: "",
    why: "Verweis auf einen lokalen Testserver in den Design-Werkzeugen.",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: "So viel h\\xE4ttest du in",
    to: "So viel h\\xE4tte dir eine Solaranlage in",
    why: "Prüfer 18.09.: 76–78 % des Betrags sind Einspeisevergütung, also Einnahmen, und die Anschaffung ist nicht abgezogen. „gespart“ sagt etwas anderes, als die Zahl misst.",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: "in 10 Jahren gespart.<button",
    to: "in 10 Jahren gebracht.<button",
    why: "Zweite Hälfte derselben Überschrift (siehe oben).",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: "was Solarstrom von 2016 bis 2025 bei dir eingespart h\\xE4tte",
    to: "was Solarstrom von 2016 bis 2025 bei dir gebracht h\\xE4tte",
    why: "Einleitung zur selben Zahl; dieselbe Begründung.",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: /"\/Solar-Check-Dynamisch\.html\?[^"]*"/g,
    to: '"/"',
    why: "Logo, Rücksprung und Fußzeile zeigten auf die Vorschau-Datei samt Schaltern; die Startseite ist /.",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: '"/pv-simulation/?homepage=1&panels=3d&foreground=branch"',
    to: '"/pv-simulation"',
    why: "Simulations-Link ohne Vorschau-Schalter und ohne Schrägstrich (die kanonische Adresse).",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: /"\/rechner-uebersicht\/"/g,
    to: '"/#hs-rechner"',
    why: "Eine Rechner-Übersicht gibt es (noch) nicht; derselbe Ersatz wie im Menü.",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: 'f="Solar Check \\xB7 Dein Dach. Deine Energie."',
    to: 'f="Solar Check \u2013 Lohnt sich Photovoltaik? Ehrlich berechnet."',
    why: "Das Skript setzt document.title; SEO-Titel bleiben unverändert (lib/neon-seite.ts). Wer rendert, sähe sonst einen anderen Titel als im HTML.",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: 'document.title=y?"PV-Simulation \\xB7 Solar Check":f',
    to: 'document.title=y?"PV-Simulation \u2013 live: Was produziert dein Dach gerade? | Solar Check":f',
    why: "Dieselbe Titel-Zuweisung für die Simulation.",
  },
  { datei: "dynamic-hero/dist/test.js", ...DOMAIN_WEG },
  { datei: "shared-nav/nav.js", ...DOMAIN_WEG },
  {
    datei: "shared-nav/nav.js",
    from: "'/rechner-uebersicht'",
    to: "'/#hs-rechner'",
    why: "Die Rechner-Übersicht ist nicht Teil dieses Livegangs; der Link führt zu den Rechnern der Startseite.",
  },
  { datei: "homepage-study/race-dist/direct-race.js", ...DOMAIN_WEG },
  { datei: "homepage-study/story-dist/atlas-story-cards.js", ...DOMAIN_WEG },
];

function lies(datei) {
  return readFileSync(join(PUBLIC, datei), "utf8");
}
function anwenden(text, p, wo) {
  if (p.from instanceof RegExp) {
    const n = (text.match(p.from) ?? []).length;
    if (!n) throw new Error(`Patch trifft nicht: ${wo} — ${p.why}`);
    return text.replace(p.from, p.to);
  }
  if (!text.includes(p.from)) throw new Error(`Patch trifft nicht: ${wo} — ${p.why}\n  gesucht: ${p.from.slice(0, 120)}`);
  return text.split(p.from).join(p.to);
}
for (const p of PATCHES) {
  writeFileSync(join(PUBLIC, p.datei), anwenden(lies(p.datei), p, p.datei));
}

// ─── Page templates ─────────────────────────────────────────────────────────
// The head is replaced by ours (SEO, analytics); the preview-only switches are
// set statically; the rest of the document stays byte-for-byte.
function vorlage(quelle) {
  let s = readFileSync(join(QUELLE, quelle), "utf8");
  const kopfEnde = s.indexOf("</head>");
  const kopf = s.slice(0, kopfEnde);
  // Keep the preview's own styles, preloads and stylesheet links; drop its
  // title/robots/base and the query-parameter scripts.
  const behalten = [];
  for (const m of kopf.matchAll(/<style>[\s\S]*?<\/style>|<link [^>]*>|<script src="\/shared-nav\/header-boot\.js"><\/script>/g)) behalten.push(m[0]);
  let rumpf = s.slice(kopfEnde + "</head>".length);
  rumpf = rumpf.replace(/<body>/, '<body data-lab-accent="lime" data-lab-splash="edge" style="--lab-wash:0.14">');
  rumpf = rumpf.replace(DOMAIN_WEG.from, DOMAIN_WEG.to);
  // Back link of the simulation template pointed at the preview file.
  rumpf = rumpf.replace(/href="\/Solar-Check-Dynamisch\.html[^"]*"/g, 'href="/"');
  // Scripts that only exist to read the preview's query switches.
  rumpf = rumpf.replace(/<script>\(function\(\)\{const q=new URLSearchParams\(location\.search\);const explicit=[\s\S]*?<\/script>/, "");
  rumpf = rumpf.replace(/<script type="module" src="\/design-lab\/homepage-experiments\.js"><\/script>/, "");
  if (!rumpf.includes('<footer class="prototype-footer"')) throw new Error(`Kein Fußbereich gefunden in ${quelle}`);
  // The static footer placeholder sits inside a section the page hides; the
  // real footer is built by script. Our additions go to the end of the body
  // (visible without script) and are moved before the built footer (see
  // lib/neon-seite.ts).
  if (!rumpf.includes("</body>")) throw new Error(`Kein </body> in ${quelle}`);
  rumpf = rumpf.replace("</body>", "<!--SC:VOR-FUSS--></body>");
  return (
    '<!doctype html><html lang="de" data-homepage-preview="" data-sc-shell="homepage"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><!--SC:KOPF-->' +
    behalten.join("") +
    "</head>" +
    rumpf
  );
}
mkdirSync(join(ZIEL, "app/_neon"), { recursive: true });
const start = vorlage("Solar-Check-Dynamisch.html");
const sim = vorlage("pv-simulation/index.html");
for (const [name, t] of [["startseite", start], ["simulation", sim]]) {
  if (/localhost|127\.0\.0\.1|noindex/.test(t)) throw new Error(`Vorschau-Rest in ${name}: localhost/noindex`);
  writeFileSync(join(ZIEL, `app/_neon/${name}.html`), t);
}
// ─── Guard: nothing may still point at the preview ───────────────────────────
// Script-built links never show up in the server HTML, so a link check on the
// delivered page cannot see them (found 2026-09-18: logo, back link and footer
// pointed at the preview file). Checked in every taken-over text file instead.
const VORSCHAU = /Solar-Check-Dynamisch|[?&]homepage=1|rechner-uebersicht|foreground=branch|localhost:\d/;
const textdateien = [...kopiert.filter((f) => /\.(js|css|json|svg)$/.test(f)).map((f) => join(PUBLIC, f)), join(ZIEL, "app/_neon/startseite.html"), join(ZIEL, "app/_neon/simulation.html")];
const reste = textdateien.filter((f) => VORSCHAU.test(readFileSync(f, "utf8")));
if (reste.length) throw new Error(`Vorschau-Verweise übrig in:\n  ${reste.join("\n  ")}`);

console.log(`${kopiert.length} Dateien übernommen, ${PATCHES.length} Anpassungen angewendet, 2 Seitenvorlagen geschrieben.`);
