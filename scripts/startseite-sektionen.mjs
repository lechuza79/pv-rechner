/**
 * Reads the homepage sections OUT OF the design package's bundle and writes
 * them as data (lib/startseite-sektionen.json).
 *
 * Why this exists: without JavaScript the homepage's body carries the hero,
 * the FAQ and the footer — the tools, the local atlas, the guides and the
 * section for organisations only appear after the scene bundle has run, so
 * crawlers that do not execute JavaScript never see them. The server renders
 * them instead (lib/neon-seite.ts), and it needs their wording.
 *
 * WHY EXTRACTED HERE AND NOT WRITTEN OUT BY HAND: a second copy of the
 * package's wording drifts the moment the package is rebuilt, and both sides
 * look right on their own — with JavaScript the page shows the bundle's
 * version, without it a crawler reads ours, and nobody ever sees the two side
 * by side. Taking the words from the bundle keeps ONE source.
 *
 * AND WHY AT TAKEOVER TIME AND NOT WHEN A PAGE IS SERVED: the bundle is
 * minified foreign JavaScript, so the extraction is only as good as its
 * patterns. Here a miss throws and the takeover stops, with a person watching
 * — the same contract every patch in the takeover already has. In the serving
 * path the same miss would be the homepage.
 *
 *   node scripts/startseite-sektionen.mjs [--pruefen]
 *
 * --pruefen writes nothing and fails if the file on disk is not what the
 * bundle currently says (used by the test, so a package taken over without
 * re-running this goes red instead of serving stale wording).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const WURZEL = resolve(dirname(new URL(import.meta.url).pathname), "..");
const BUENDEL = join(WURZEL, "public/dynamic-hero/dist/test.js");
const ZIEL = join(WURZEL, "lib/startseite-sektionen.json");

/** The sections we render server-side, in the order the script builds them. */
const GESPIEGELT = ["hs-tools", "hs-local-atlas", "hs-guides", "hs-organisation-links"];

function scheitere(was) {
  throw new Error(
    `Abschnitte nicht lesbar: ${was}\n` +
      `Das Design-Paket hat seinen Aufbau geändert. Die Extraktion in scripts/startseite-sektionen.mjs\n` +
      `muss angepasst werden — ohne sie steht auf der Startseite ohne JavaScript nichts über unsere Tools.`,
  );
}

/**
 * The markup the bundle assigns to its content container.
 *
 * The template NESTS template literals (the guides build their rows in a .map
 * with their own backticks), so the end is found by counting ${…} depth. Taking
 * the next backtick cuts the extraction off mid-way — measured, and silent:
 * everything needed happened to lie before the cut.
 */
function abschnittsVorlage() {
  const quelle = readFileSync(BUENDEL, "utf8");
  const auf = quelle.indexOf("v.innerHTML=`");
  if (auf < 0) scheitere("Abschnitts-Vorlage nicht gefunden");
  const start = auf + "v.innerHTML=`".length;
  let tiefe = 0;
  let ende = -1;
  for (let i = start; i < quelle.length; i++) {
    const c = quelle[i];
    if (c === "\\") { i++; continue; }
    if (c === "$" && quelle[i + 1] === "{") { tiefe++; i++; continue; }
    if (c === "}" && tiefe > 0) { tiefe--; continue; }
    if (c === "`" && tiefe === 0) { ende = i; break; }
  }
  if (ende < 0) scheitere("Abschnitts-Vorlage nicht abgeschlossen");
  // Minified JS keeps German umlauts as escapes.
  const text = quelle
    .slice(start, ende)
    .replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  // The last section marks the end; without it the extraction is truncated.
  if (!text.includes("data-home-footer")) scheitere("Abschnitts-Vorlage endet zu früh");
  return text;
}

/** Strips tags and the template's own placeholders from a fragment. */
function nurText(roh) {
  return roh
    .replace(/<[^>]*>/g, " ")
    .replace(/\$\{[^}]*\}/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A link target in the template: href="${ie}/pfad" or href="/pfad". */
function pfadAus(roh) {
  const m = roh.match(/href="\$\{ie\}([^"]*)"|href="(\/[^"]*)"/);
  return m ? (m[1] ?? m[2]) : null;
}

function sektion(vorlage, kennung) {
  const auf = vorlage.indexOf(`<section class="hs-section ${kennung}`);
  if (auf < 0) scheitere(`Abschnitt ${kennung} fehlt`);
  const naechste = vorlage.indexOf('<section class="hs-section ', auf + 1);
  return vorlage.slice(auf, naechste < 0 ? undefined : naechste);
}

function werkzeuge(vorlage) {
  const block = sektion(vorlage, "hs-tools");
  const karten = [...block.matchAll(/<article class="hs-tool[^"]*">([\s\S]*?)<\/article>/g)].map((m) => m[1]);
  if (karten.length < 4) scheitere(`nur ${karten.length} Werkzeug-Karten`);
  return karten.map((karte) => {
    const kopf = karte.match(/<div class="hs-tool-top">([\s\S]*?)<\/div>/);
    const titel = karte.match(/<h3>([^<]+)<\/h3>/);
    const text = karte.match(/<\/h3>\s*<p>([^<]+)<\/p>/);
    if (!kopf || !titel || !text) scheitere("Werkzeug-Karte ohne Kennung, Titel oder Text");
    // "05 / ANGEBOTSCHECK <span class="hs-coming">Demnächst</span>"
    const hinweis = kopf[1].match(/<span[^>]*>([^<]+)<\/span>/);
    return {
      kennung: nurText(kopf[1].replace(/<span[\s\S]*?<\/span>/, "")),
      hinweis: hinweis ? hinweis[1].trim() : null,
      titel: titel[1].trim(),
      text: text[1].trim(),
      links: [...karte.matchAll(/<a href="[^"]*">([\s\S]*?)<\/a>/g)]
        .map((m) => ({ text: nurText(m[1]), href: pfadAus(m[0]) }))
        .filter((l) => l.href && l.text),
    };
  });
}

function atlas(vorlage) {
  const block = sektion(vorlage, "hs-local-atlas");
  const kicker = block.match(/<p class="hs-kicker">([^<]+)<\/p>/);
  const titel = block.match(/<h2>([^<]+)<\/h2>/);
  const text = block.match(/<\/h2>\s*<p>([^<]+)<\/p>/);
  const punkte = [...block.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => nurText(m[1]));
  const link = block.match(/<a class="hs-product-primary[^"]*"[^>]*>([\s\S]*?)<\/a>/);
  if (!kicker || !titel || !text || !link) scheitere("Atlas-Abschnitt unvollständig");
  if (punkte.length < 2) scheitere(`Atlas-Abschnitt mit ${punkte.length} Punkten`);
  return {
    kicker: kicker[1].trim(),
    titel: titel[1].trim(),
    text: text[1].trim(),
    punkte,
    link: { text: nurText(link[1]), href: pfadAus(link[0]) },
  };
}

function ratgeber(vorlage) {
  const block = sektion(vorlage, "hs-guides");
  const titel = block.match(/<h2>([^<]+)<\/h2>/);
  const alle = block.match(/<a href="\$\{ie\}(\/ratgeber)">([\s\S]*?)<\/a>/);
  if (!titel || !alle) scheitere("Ratgeber-Abschnitt ohne Titel oder Übersichts-Link");
  // The rows come from a tuple list the template maps over.
  const eintraege = [...block.matchAll(/\["(\d\d)","([^"]+)","([^"]+)","(\/[^"]+)"\]/g)].map((m) => ({
    kennung: m[1],
    bereich: m[2],
    titel: m[3],
    href: m[4],
  }));
  if (eintraege.length < 2) scheitere(`Ratgeber-Abschnitt mit ${eintraege.length} Einträgen`);
  return { titel: titel[1].trim(), alle: { text: nurText(alle[2]), href: alle[1] }, eintraege };
}

function organisationen(vorlage) {
  const block = sektion(vorlage, "hs-organisation-links");
  const kicker = block.match(/<p class="hs-kicker">([\s\S]*?)<\/p>/);
  const titel = block.match(/<h2>([\s\S]*?)<\/h2>/);
  if (!kicker || !titel) scheitere("Organisations-Abschnitt ohne Kicker oder Titel");
  const eintraege = [...block.matchAll(/<a href="[^"]*">[\s\S]*?<strong>([\s\S]*?)<\/strong><span>([^<]*)<\/span><\/a>/g)].map(
    (m) => ({ titel: nurText(m[1]), text: m[2].trim(), href: pfadAus(m[0]) }),
  );
  if (eintraege.length < 3) scheitere(`Organisations-Abschnitt mit ${eintraege.length} Einträgen`);
  if (eintraege.some((e) => !e.href)) scheitere("Organisations-Eintrag ohne Ziel");
  return { kicker: nurText(kicker[1]), titel: nurText(titel[1]), eintraege };
}

export function lesen() {
  const vorlage = abschnittsVorlage();
  const tools = sektion(vorlage, "hs-tools");
  const kicker = tools.match(/<p class="hs-kicker">([^<]+)<\/p>/);
  const titel = tools.match(/<h2>([\s\S]*?)<\/h2>/);
  const text = tools.match(/<\/h2>\s*<p>([\s\S]*?)<\/p>/);
  if (!kicker || !titel || !text) scheitere("Werkzeug-Abschnitt ohne Einleitung");
  return {
    _hinweis:
      "Erzeugt aus public/dynamic-hero/dist/test.js — nicht von Hand ändern. " +
      "Neu erzeugen: node scripts/startseite-sektionen.mjs",
    gespiegelt: GESPIEGELT,
    einleitung: { kicker: kicker[1].trim(), titel: nurText(titel[1]), text: nurText(text[1]) },
    werkzeuge: werkzeuge(vorlage),
    atlas: atlas(vorlage),
    ratgeber: ratgeber(vorlage),
    organisationen: organisationen(vorlage),
  };
}

const alsText = (d) => JSON.stringify(d, null, 2) + "\n";

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const daten = lesen();
  if (process.argv.includes("--pruefen")) {
    const jetzt = alsText(daten);
    const abgelegt = readFileSync(ZIEL, "utf8");
    if (jetzt !== abgelegt) {
      console.error(
        "Die abgelegten Abschnitte stimmen nicht mehr mit dem Paket überein.\n" +
          "Neu erzeugen: node scripts/startseite-sektionen.mjs",
      );
      process.exit(1);
    }
    console.log("Abschnitte stimmen mit dem Paket überein.");
  } else {
    writeFileSync(ZIEL, alsText(daten));
    console.log(
      `${daten.werkzeuge.length} Werkzeuge, ${daten.ratgeber.eintraege.length} Ratgeber, ` +
        `${daten.organisationen.eintraege.length} Organisations-Einträge aus dem Paket gelesen.`,
    );
  }
}
