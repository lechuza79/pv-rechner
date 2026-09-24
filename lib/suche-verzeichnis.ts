// The page directory behind the site search.
//
// READ, NOT COPIED. The entries come from the two lists that already name our
// pages: the shared navigation (tools, funding, energy data, knowledge) and the
// guide registry. A third hand-written list would drift the first time a page
// is renamed in the menu — and both would look right on their own.
//
// What this module adds is only what those lists cannot say: extra words people
// type ("Wallbox", "Speicher") that do not appear in a title. They hang on a
// path, and a test rejects any path that is not in the directory.

import { load } from "cheerio";
import { navigationContent } from "../public/shared-nav/nav-content.js";
import { RATGEBER } from "./ratgeber";

export type SucheKategorie = "rechner" | "foerderung" | "ratgeber" | "energiedaten";

export type SucheEintrag = {
  href: string;
  titel: string;
  /** One line under the title; may be empty. */
  zusatz: string;
  kategorie: SucheKategorie;
  /** Extra search words, normalised. Not shown. */
  stichworte: string[];
  /** Counts like the title when matching, e.g. the tool card a link sits on
   *  ("Einspeisevergütung" above "Vergütung berechnen"). Not shown. */
  kopf: string;
};

export const KATEGORIE_TITEL: Record<SucheKategorie, string> = {
  rechner: "Rechner & Tools",
  foerderung: "Förderung",
  ratgeber: "Ratgeber",
  energiedaten: "Energiedaten",
};

/** Display order of the groups in the result list. */
export const KATEGORIE_REIHENFOLGE: SucheKategorie[] = ["rechner", "foerderung", "ratgeber", "energiedaten"];

/**
 * Words people search for that the title does not carry. Keyed by the page's
 * path (without query). Keep it short: every word here is a claim that the page
 * answers that question.
 */
export const SUCH_STICHWORTE: Record<string, string[]> = {
  "/photovoltaik-rechner": ["pv", "solar", "solaranlage", "dach", "speicher", "batterie", "amortisation", "eigenverbrauch", "wallbox", "e-auto"],
  "/balkonkraftwerk/rechner": ["steckersolar", "balkon", "mini-pv", "stecker"],
  "/waermepumpe-rechner": ["heizung", "heizkosten", "wp", "heizungstausch"],
  "/klimaanlage-stromkosten": ["klima", "kühlen", "split", "monoblock", "hitze"],
  "/einspeiseverguetung-rechner": ["einspeisung", "vergütung", "eeg"],
  "/pv-simulation": ["simulation", "live", "tagesverlauf", "ertrag"],
  "/photovoltaik-foerderung": ["zuschuss", "förderprogramm", "pv", "solar"],
  "/balkonkraftwerk/foerderung": ["zuschuss", "steckersolar", "balkon"],
  "/ratgeber/waermepumpe-foerderung": ["beg", "kfw", "zuschuss", "heizungsförderung"],
  "/strommix-deutschland": ["strom", "erzeugung", "wind", "kohle", "erneuerbare"],
  "/photovoltaik-zubau-deutschland": ["ausbau", "neue anlagen"],
  "/photovoltaik-bestand-deutschland": ["wie viele solaranlagen", "anzahl", "balkonkraftwerke"],
  "/ratgeber/lohnt-sich-pv-mit-speicher": ["batterie", "speicher", "stromspeicher"],
  "/einspeiseverguetung-tabelle": ["eeg", "sätze", "vergütung"],
  "/photovoltaik-neigungswinkel": ["neigung", "ausrichtung", "ost-west", "dach"],
  "/balkonkraftwerk/ratgeber/anmelden": ["marktstammdatenregister", "mastr", "anmeldung"],
};

const SEKTION_KATEGORIE: Record<string, SucheKategorie | null> = {
  tools: "rechner",
  funding: "foerderung",
  monitor: "energiedaten",
  knowledge: "ratgeber",
  local: "energiedaten",
};

/** Lower-case, umlauts folded, punctuation to spaces — for matching only. */
export function normalisiere(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pfadOhneQuery(href: string): string {
  return href.split("?")[0].split("#")[0];
}

function ausNavigation(): SucheEintrag[] {
  const $ = load(navigationContent());
  const out: SucheEintrag[] = [];
  $("details[data-section]").each((_, group) => {
    const kategorie = SEKTION_KATEGORIE[$(group).attr("data-section") ?? ""];
    if (!kategorie) return;
    $(group).find("a[href]").each((__, a) => {
      const href = $(a).attr("href") ?? "";
      if (!href.startsWith("/")) return;
      const label = $(a).find("span").first().clone().children("small").remove().end().text().trim();
      const small = $(a).find("small").first().text().trim();
      // A tool card names the subject (h3) and the action (link). With one link
      // the subject is the better title ("Wärmepumpe", not "Wärmepumpe
      // durchrechnen"; "Angebotscheck", not "Auf die Warteliste"); with two,
      // the action tells them apart and the subject goes underneath.
      const card = $(a).closest(".sc-nav-tool");
      const h3 = card.find("h3").first();
      const cardTitle = card.length ? h3.clone().children().remove().end().text().trim() : "";
      const badge = card.length ? h3.find(".sc-nav-badge").text().trim() : "";
      const cardText = card.length ? card.find("p").first().text().trim() : "";
      const einzig = card.length > 0 && card.find("a[href]").length === 1;
      out.push({
        href,
        titel: einzig ? cardTitle : label,
        zusatz: !card.length ? small : einzig ? [badge, cardText].filter(Boolean).join(": ") : [cardTitle, cardText].filter(Boolean).join(" · "),
        kategorie,
        stichworte: [],
        kopf: einzig ? label : cardTitle,
      });
    });
  });
  return out;
}

let cache: SucheEintrag[] | null = null;

/** All searchable pages, deduplicated by href (first mention wins). */
export function suchVerzeichnis(): SucheEintrag[] {
  if (cache) return cache;
  const byHref = new Map<string, SucheEintrag>();
  for (const e of ausNavigation()) if (!byHref.has(e.href)) byHref.set(e.href, e);
  for (const r of RATGEBER) {
    const vorhanden = byHref.get(r.slug);
    if (vorhanden) {
      // The menu names it briefly; the registry has the real title and teaser.
      vorhanden.titel = r.title;
      vorhanden.zusatz = r.teaser;
      continue;
    }
    byHref.set(r.slug, { href: r.slug, titel: r.title, zusatz: r.teaser, kategorie: "ratgeber", stichworte: [], kopf: "" });
  }
  for (const e of byHref.values()) {
    e.stichworte = (SUCH_STICHWORTE[pfadOhneQuery(e.href)] ?? []).map(normalisiere);
  }
  cache = [...byHref.values()];
  return cache;
}

/**
 * Rank pages for a query. Every query word must occur somewhere (title, extra
 * words or the line underneath); a word counts from its start, so "wärme"
 * finds "Wärmepumpe" but "pumpe" alone does not match "Wärmepumpe".
 */
export function suchePassendeSeiten(q: string, max = 8): SucheEintrag[] {
  const woerter = normalisiere(q).split(" ").filter((w) => w.length >= 2);
  if (woerter.length === 0) return [];
  const beginnt = (text: string, w: string) => (" " + text).includes(" " + w);
  const treffer: { e: SucheEintrag; score: number; i: number }[] = [];
  suchVerzeichnis().forEach((e, i) => {
    const titel = normalisiere(e.titel + " " + e.kopf);
    const stich = e.stichworte.join(" ");
    // The group name counts too: "Rechner" should list the calculators.
    const zusatz = normalisiere(e.zusatz + " " + KATEGORIE_TITEL[e.kategorie]);
    let score = 0;
    for (const w of woerter) {
      if (beginnt(titel, w)) score += 3;
      else if (beginnt(stich, w)) score += 2;
      else if (beginnt(zusatz, w)) score += 1;
      else return;
    }
    treffer.push({ e, score, i });
  });
  treffer.sort((a, b) => b.score - a.score || a.i - b.i);
  return treffer.slice(0, max).map((t) => t.e);
}
