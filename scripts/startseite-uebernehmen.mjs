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
  "dynamic-hero/panel-fallback-0.webp",
  "dynamic-hero/panel-fallback-mobile.webp",
  "dynamic-hero/plz-coordinates.json",
  "dynamic-hero/shell-font-0.woff2",
  "dynamic-hero/shell-font-1.woff2",
  "dynamic-hero/moon-lroc-1k.jpg",
  "design-lab/splash-blue-web.svg",
  "design-lab/splash-color-web.svg",
  "design-lab/splash-ochre-web.svg",
  "design-lab/splash-sage-web.svg",
  "homepage-study/montserrat-700.woff2",
  "homepage-study/illustrations/balcony-modern-v20.webp",
  "homepage-study/illustrations/funding-check-v20.webp",
  "homepage-study/illustrations/heatpump-modern-v20.webp",
  "homepage-study/illustrations/house-v20.webp",
  "homepage-study/illustrations/offer-check-v20.webp",
  "homepage-study/audience-v3/register.js",
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
  "homepage-study/story-dist",
  "homepage-study/audience-v3/assets",
  "illustrations-neon/assets-web",
  "illustrations-neon/motifs",
];
// OWNED BY THE REPO since 2026-09-18, never copied again: menu, footer, person
// card and every stylesheet. They are hand-written files without a build step,
// so the repo is their only source and Codex edits them there on a branch. A
// copy would silently overwrite that work. Only the built scene bundles and
// their assets still come from the package (their sources and build live
// there until the scene is rebuilt after launch).
const IM_PROJEKT = [/^homepage-study\/race-dist\//, /^shared-nav\//, /^shared-footer\//, /^shared-person\//, /^(?!.*(?:^|\/)(?:dist|race-dist|story-dist)\/).*\.css$/];
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
  if (IM_PROJEKT.some((r) => r.test(rel))) throw new Error(`Gehört dem Projekt, wird nicht kopiert: ${rel}`);
  const nach = join(PUBLIC, rel);
  mkdirSync(dirname(nach), { recursive: true });
  copyFileSync(von, nach);
  kopiert.push(rel);
}
for (const d of DATEIEN) kopiere(d);
for (const d of ORDNER) kopiere(d);

// ─── Patches ────────────────────────────────────────────────────────────────
// Each: file (in public/ or the page templates), from, to, why.
// The retrospective's credit comes from the source registry, never typed here:
// CC BY 4.0 needs licensor, licence link and the change note (legal checklist 1),
// and a second hand-written copy would drift from lib/data-sources.ts.
const { DATA_SOURCES } = await import(join(ZIEL, "lib/data-sources.ts"));
const quelleLink = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
const ERA5 = DATA_SOURCES.era5Archive;
const EUROSTAT = DATA_SOURCES.eurostat;
const RUECKBLICK_QUELLE =
  `Grundlage: st\\xFCndliche Wetterdaten aus ${quelleLink(ERA5.url, ERA5.name)} ` +
  `(${quelleLink(ERA5.licenseUrl, ERA5.license)}, ${ERA5.note}) und historische ` +
  `Durchschnittsstrompreise von ${quelleLink(EUROSTAT.url, EUROSTAT.name)} (${EUROSTAT.note}).`;
const DOMAIN_WEG = { from: /https:\/\/solar-check\.io(?=[/"'`])/g, to: "", why: "Links auf die eigene Seite relativ statt auf die Live-Domain (die Vorschau lief auf localhost)." };
const PATCHES = [
{"datei": "dynamic-hero/dist/test.js", "from": ":{cloud:0,rain:0,wind:z,direction:270,code:0};U=Ze(_(),d,o)", "to": ":{cloud:100,rain:0,wind:0,direction:270,code:3};a.dataset.weatherAvailable=String(u!==\"live\"||!!h),U=Ze(_(),d,o)", "why": "Missing weather is an explicitly unavailable neutral sky, never invented sunshine."},
{"datei": "dynamic-hero/dist/test.js", "from": "let o=++L;W?.abort(),W=new AbortController;", "to": "let o=++L;clearTimeout(ne.retryTimer),W?.abort(),W=new AbortController;", "why": "Cancel scheduled retries when a newer location request starts."},
{"datei": "dynamic-hero/dist/test.js", "from": "h=null,l=null,te(),Y(\"Aktuelle Daten f", "to": "d.plz!==s||!h||Date.now()-h.asOf>45*6e4?(h=null,l=null):void 0,te(),Y(\"Aktuelle Daten f", "why": "Keep recent weather during refresh only for the same postcode."},
{"datei": "dynamic-hero/dist/test.js", "from": "try{let w=await fetch(\"/scene-data?plz=\"+s,{signal:W.signal});", "to": "try{let coordinates=(await scPostcodes())[s];if(o!==L)return;if(coordinates&&d.plz!==s)d={plz:s,name:\"PLZ \"+s,lat:coordinates[0],lon:coordinates[1]};V();let w=await fetch(\"/scene-data?plz=\"+s,{signal:m.signal});", "why": "Apply accepted postcode coordinates before waiting for weather, including fallback sun times."},
{"datei": "dynamic-hero/dist/test.js", "from": "finally{clearTimeout(c),o===L&&V()}}i(\"test-3d-loss\")", "to": "finally{clearTimeout(c),o===L&&(V(),h||(ne.retryTimer=setTimeout(ne,30000)))}}i(\"test-3d-loss\")", "why": "Retry missing weather after thirty seconds instead of leaving the fallback for ten minutes."},
{"datei": "dynamic-hero/dist/test.js", "from": "clearInterval(j),clearInterval(Z),clearInterval(y),W?.abort()", "to": "clearInterval(j),clearInterval(Z),clearInterval(y),clearTimeout(ne.retryTimer),W?.abort()", "why": "Dispose weather retry together with the stage."},
{"datei": "dynamic-hero/dist/test.js", "to": "import{postcodes as scPostcodes,retrospective as scRetrospective}from\"/homepage-study/simulation-data.js\";import{a as _e,b as ye,c as ue}", "why": "Share and bound simulation reads instead of duplicate or seventy-second requests.", "from": "import{a as _e,b as ye,c as ue}"},
{"datei": "dynamic-hero/dist/test.js", "to": "scPostcodes()", "why": "Coalesce postcode requests and retry one transient failure.", "from": "fetch(\"/dynamic-hero/plz-coordinates.json\",{signal:AbortSignal.timeout(1e4)}).then(C=>{if(!C.ok)throw Error(\"Standortliste nicht erreichbar. Bitte erneut versuchen.\");return C.json()})"},
{"datei": "dynamic-hero/dist/test.js", "to": "I().catch(()=>{}),y.oninput=()=>{H=!1,R()}", "why": "Warm the postcode list when the input opens, before the user finishes typing.", "from": "y.oninput=()=>{H=!1,R()}"},
{"datei": "dynamic-hero/dist/test.js", "to": "A=B,scRetrospective(B).catch(()=>{}),s.textContent=H?", "why": "Start the prepared result read as soon as a valid postcode is known.", "from": "A=B,s.textContent=H?"},
{"datei": "dynamic-hero/dist/test.js", "to": "let C=await scRetrospective(H);", "why": "Reuse the prefetched result and bound retries to avoid lingering placeholders.", "from": "let R=await fetch(\"/simulation-retrospective?plz=\"+H,{signal:AbortSignal.timeout(7e4)});if(!R.ok)throw Error(\"Quelle derzeit nicht erreichbar\");let C=await R.json();"},
{"datei": "dynamic-hero/dist/test.js", "to": "Deine Solarbilanz wird geladen \\u2026", "why": "The server reads prepared results; no historical weather calculation runs here.", "from": "Historische Wetterdaten werden geladen und berechnet \\u2026"},
  {
    datei: "dynamic-hero/dist/test.js",
    from: 'function R(){W=!0,a.dataset.sceneBoot=',
    to: 'e.addEventListener("sc-contrast-request",I,{signal:E.signal});function R(){W=!0,a.dataset.sceneBoot=',
    why: "Allow a single measurement frame for paused and reduced-motion scenes.",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: 'ne=M,j=!1,e.dataset.renderCount=',
    to: 'window.SolarSceneContrast?.afterFrame(e),ne=M,j=!1,e.dataset.renderCount=',
    why: "Sample the complete background only on demand after a painted frame.",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: "y.blur(),window.scrollTo({top:0,behavior:\"instant\"}),a.scrollTop=0,await U(",
    to: "y.blur(),document.dispatchEvent(new Event(\"sc-simulation-scroll-top\")),await U(",
    why: "Use one smooth scroll owner after postcode submission.",
  },
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
    from: "if(me()){if(history.state?.solarFromHome){history.back();return}history.replaceState({},\"\",p)}",
    to: "if(me())history.replaceState({},\"\",p);",
    why: "Keep route transitions in the mounted scene and measure contrast before reveal.",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: "r.inert=!0,Y(),await W(z(),!0)",
    to: "r.inert=!0,Y(),document.dispatchEvent(new Event(\"sc-hero-content-ready\")),await W(z(),!0)",
    why: "Keep route transitions in the mounted scene and measure contrast before reveal.",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: 'x.after(v.querySelector(".sc-footer"))',
    to: 'v.querySelector(".sc-footer")&&x.after(v.querySelector(".sc-footer"))',
    why: "The server owns the footer; appending a missing node would print null.",
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
  {
    datei: "dynamic-hero/dist/test.js",
    from: 'Grundlage: st\\xFCndliche <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener">Wetterdaten</a> und historische <a href="https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_204/default/table" target="_blank" rel="noopener">Durchschnittsstrompreise</a>.',
    to: RUECKBLICK_QUELLE,
    why: "Die Rückschau rechnet mit ERA5 (Copernicus, CC BY 4.0) und Eurostat-Preisen; die Quellenzeile nennt Urheber, Lizenz und Änderungshinweis aus dem Quellen-Register.",
  },
  { datei: "dynamic-hero/dist/test.js", ...DOMAIN_WEG },
  // After the domain patch: these match the already relative defaults.
  {
    datei: "dynamic-hero/dist/test.js",
    from: 'function Ye(a,{logoElement:n,base:e="",homeHref:g="/",simulationHref:t,atlasHref:r}={}){',
    to: 'function Ye(a,{logoElement:n,base:e="",homeHref:g="/",simulationHref:t,atlasHref:r}={}){let sF=document.querySelector("footer.sc-footer[data-sc-server]");if(sF)return{footer:sF,dispose(){}};',
    why: "Die Fußzeile kommt serverseitig aus lib/site-fuss.ts (eine Quelle für alle Seiten, crawlbar). Das Skript baut keine zweite.",
  },
  {
    datei: "dynamic-hero/dist/test.js",
    from: 'function Xe(a,{base:n=""}={}){',
    to: 'function Xe(a,{base:n=""}={}){let sT=document.querySelector(".sc-trust[data-sc-server]");if(sT){a.replaceWith(sT);return{trust:sT,dispose(){}}}',
    why: "Die Vertrauensleiste trägt die geprüften Zusagen aus lib/trust-signals.ts; das Skript rückt die serverseitige Leiste an ihren Platz, statt eigene Texte zu bauen.",
  },
  { datei: "homepage-study/story-dist/atlas-story-cards.js", ...DOMAIN_WEG },
  // The atlas is called "Energie-Atlas" (operator, 19.09.2026). Optional: the
  // race and story bundles are built from our own sources, which already carry
  // the new name — once the package is rebuilt there is nothing left to replace.
  ...["dynamic-hero/dist/test.js", "homepage-study/race-dist/direct-race.js", "homepage-study/story-dist/atlas-story-cards.js"].map((datei) => ({
    datei,
    from: /Solar-Atlas/g,
    to: "Energie-Atlas",
    optional: true,
    why: "Der Atlas heißt Energie-Atlas.",
  })),
];

function lies(datei) {
  return readFileSync(join(PUBLIC, datei), "utf8");
}
function anwenden(text, p, wo) {
  if (p.from instanceof RegExp) {
    const n = (text.match(p.from) ?? []).length;
    if (!n && p.optional) return text;
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
function vorlage(quelle, { entwurfErsetzen = false } = {}) {
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
  // The placeholder footer carries the draft's label ("Hero-Konzept · …"); it is
  // hidden only by script, so without script and for crawlers it would show.
  rumpf = rumpf.replace(/<footer class="prototype-footer">[\s\S]*?<\/footer>/, "");
  // The static footer placeholder sits inside a section the page hides; the
  // real footer is built by script. Our additions go to the end of the body
  // (visible without script) and are moved before the built footer (see
  // lib/neon-seite.ts).
  // The draft section (#entdecken) is the only part of the body the script
  // takes away again: it sets hidden on it and builds the real tools, atlas
  // and guides sections in its place. Without script it therefore stands as
  // the ONLY thing a crawler reads about our tools — with the draft's older
  // wording ("Oder schon eine konkrete Idee?" instead of "Oder eine neue
  // Heizung?") and two entries instead of five. We replace its body with a
  // marker and render the real sections into it (see lib/neon-seite.ts); the
  // script keeps hiding the section, so with script nothing changes at all.
  if (entwurfErsetzen) {
    const entwurf = /(<section class="next-section"[^>]*>)[\s\S]*?(<\/section>)/;
    if (!entwurf.test(rumpf)) throw new Error(`Keine Entwurfs-Sektion (.next-section) in ${quelle}`);
    rumpf = rumpf.replace(entwurf, "$1<!--SC:STATISCH-->$2");
  }
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
// Only the homepage gets the server-rendered sections; the simulation keeps
// its draft section byte-for-byte (its own crawler text is a separate question).
const start = vorlage("Solar-Check-Dynamisch.html", { entwurfErsetzen: true });
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

// ─── Sections as data ───────────────────────────────────────────────────────
// The homepage renders the script-built sections server-side so a crawler
// without JavaScript sees them (see lib/neon-seite.ts). Their wording is read
// OUT OF the bundle we just copied, never written out a second time — a second
// copy drifts the moment the package is rebuilt, and both sides look right on
// their own. This runs here and not when a page is served: the bundle is
// minified foreign JavaScript, so a miss must stop the takeover with a person
// watching, not the homepage.
const { lesen } = await import("./startseite-sektionen.mjs");
const sektionen = lesen();
writeFileSync(
  join(ZIEL, "lib/startseite-sektionen.json"),
  JSON.stringify(sektionen, null, 2) + "\n",
);

console.log(
  `${kopiert.length} Dateien übernommen, ${PATCHES.length} Anpassungen angewendet, 2 Seitenvorlagen geschrieben, ` +
    `${sektionen.werkzeuge.length} Werkzeuge + ${sektionen.ratgeber.eintraege.length} Ratgeber + ` +
    `${sektionen.organisationen.eintraege.length} Organisations-Einträge aus dem Paket gelesen.`,
);
