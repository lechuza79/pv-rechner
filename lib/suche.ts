// Site search: one query in, structured answers out.
//
// A recognised PLACE (by name or postcode) gets a card with the ways into our
// content for that place — its atlas page, the funding that applies there, and
// the calculators with the place already filled in. Everything else is matched
// against the page directory (lib/suche-verzeichnis.ts) and grouped.
//
// A query can be both: "Förderung Würzburg" is a topic word plus a place. The
// split is derived, not listed: a word that matches a page is a topic word, the
// rest is looked up as a place.

import { searchRegions, getRegionById, type RegionHit } from "./atlas";
import { gemeindenZurPlz, gemeindeGeo } from "./atlas-geo";
import { aktuellerGemeindeschluessel } from "./ags-nachfolger";
import { bundeslandByAgs } from "./mastr-regions";
import { ATLAS_CITIES, isCityPublished, cityPath, foerderBundeslaender, slugify } from "./atlas-cities";
import { DB_SOFT_READ_TIMEOUT_MS } from "./db-timeout";
import {
  suchePassendeSeiten,
  normalisiere,
  KATEGORIE_TITEL,
  KATEGORIE_REIHENFOLGE,
  type SucheEintrag,
  type SucheKategorie,
} from "./suche-verzeichnis";

export type OrtLink = { href: string; titel: string; art: "ort" | "foerderung" | "rechner" };

export type OrtTreffer = {
  ags: string;
  name: string;
  /** "Gemeinde", "Kreisfreie Stadt", "Landkreis", "Bundesland" … */
  gattung: string;
  /** Kreis and/or Land — tells same-named places apart. May be empty. */
  kontext: string;
  links: OrtLink[];
};

export type SeitenGruppe = {
  kategorie: SucheKategorie;
  titel: string;
  eintraege: Pick<SucheEintrag, "href" | "titel" | "zusatz">[];
};

export type SuchErgebnis = {
  q: string;
  orte: OrtTreffer[];
  seiten: SeitenGruppe[];
  /** The place lookup failed (database) — "no place found" would be a lie. */
  orteNichtVerfuegbar: boolean;
};

const MAX_ORTE = 5;
/** Glue words that are neither topic nor place. */
const FUELLWOERTER = new Set(["in", "im", "fuer", "bei", "von", "der", "die", "das", "und", "am", "an"]);

function gruppiere(eintraege: SucheEintrag[]): SeitenGruppe[] {
  return KATEGORIE_REIHENFOLGE.map((kategorie) => ({
    kategorie,
    titel: KATEGORIE_TITEL[kategorie],
    eintraege: eintraege
      .filter((e) => e.kategorie === kategorie)
      .map(({ href, titel, zusatz }) => ({ href, titel, zusatz })),
  })).filter((g) => g.eintraege.length > 0);
}

/** Split a query into topic words (match a page) and the rest (a place). */
export function zerlegeAnfrage(q: string): { themen: string[]; ort: string; plz: string | null } {
  const roh = q.trim().split(/\s+/).filter(Boolean);
  const plz = roh.find((w) => /^\d{5}$/.test(w)) ?? null;
  const themen: string[] = [];
  const ort: string[] = [];
  for (const w of roh) {
    if (w === plz) continue;
    const n = normalisiere(w);
    if (!n || FUELLWOERTER.has(n)) continue;
    if (n.length >= 2 && suchePassendeSeiten(w, 1).length > 0) themen.push(w);
    else ort.push(w);
  }
  return { themen, ort: ort.join(" "), plz };
}

function foerderLink(ags: string, name: string): OrtLink {
  const stadt = ATLAS_CITIES.find((c) => c.ags === ags);
  if (stadt && isCityPublished(stadt)) {
    return { href: cityPath(stadt), titel: `Förderung in ${name}`, art: "foerderung" };
  }
  const land = bundeslandByAgs(ags.slice(0, 2));
  const seite = land && foerderBundeslaender().find((b) => b.slug === slugify(land.name));
  if (land && seite) {
    return { href: `/photovoltaik-foerderung/${seite.slug}`, titel: `Förderung in ${land.name}`, art: "foerderung" };
  }
  return { href: "/photovoltaik-foerderung", titel: "Förderprogramme finden", art: "foerderung" };
}

function rechnerLinks(plz: string | null): OrtLink[] {
  if (!plz) return [];
  return [
    { href: `/photovoltaik-rechner?plz=${plz}`, titel: "Photovoltaik rechnen", art: "rechner" },
    { href: `/balkonkraftwerk/rechner?plz=${plz}`, titel: "Balkonkraftwerk rechnen", art: "rechner" },
  ];
}

/**
 * The key a place is linked under. A kreisfreie Stadt stands twice in the
 * register (5 and 8 digits); its pages and funding hang on the 5-digit key.
 */
function seitenSchluessel(ags: string, gattung: string): string {
  return gattung === "Kreisfreie Stadt" && ags.length === 8 ? ags.slice(0, 5) : ags;
}

/** Does this place have its own calculator location (a municipality)? */
function istGemeinde(ags: string, gattung: string): boolean {
  return ags.length === 8 || gattung === "Kreisfreie Stadt" || /^(02|04|11)$/.test(ags);
}

async function kontextVon(hit: RegionHit): Promise<string> {
  const land = bundeslandByAgs(hit.region_id.slice(0, 2))?.name ?? "";
  if (hit.region_id.length === 2) return "";
  // A kreisfreie Stadt is its own Kreis — naming it twice says nothing.
  if (hit.region_id.length === 8 && hit.label !== "Kreisfreie Stadt" && hit.parent_region_id?.length === 5) {
    const kreis = await getRegionById(hit.parent_region_id).catch(() => null);
    return [kreis?.name, land].filter(Boolean).join(" · ");
  }
  return land;
}

async function ortKarte(ags: string, name: string, gattung: string, kontext: string, plz: string | null): Promise<OrtTreffer> {
  const schluessel = seitenSchluessel(ags, gattung);
  const links: OrtLink[] = [
    { href: `/api/atlas/goto?ags=${schluessel}`, titel: "Energiedaten", art: "ort" },
    foerderLink(schluessel, name),
  ];
  if (istGemeinde(ags, gattung)) {
    const ags8 = ags.length === 8 ? ags : ags.padEnd(8, "0");
    const vertreter = plz ?? (await gemeindeGeo(ags8).catch(() => null))?.plz ?? null;
    links.push(...rechnerLinks(vertreter));
  }
  return { ags: schluessel, name, gattung, kontext, links };
}

async function orteZurPlz(plz: string): Promise<OrtTreffer[]> {
  const eintraege = await gemeindenZurPlz(plz);
  const out: OrtTreffer[] = [];
  const gesehen = new Set<string>();
  for (const e of eintraege.slice(0, MAX_ORTE)) {
    const ags = aktuellerGemeindeschluessel(e.ags);
    if (gesehen.has(ags)) continue;
    gesehen.add(ags);
    const region = await getRegionById(ags).catch(() => null);
    const name = region?.name ?? e.ort;
    const gattung = region?.bezeichnung ?? "Gemeinde";
    // The postcode table carries codes, not names; the names come from the register.
    const kontext = await kontextVon({ region_id: ags, name, label: gattung, parent_region_id: region?.parent_region_id ?? null });
    out.push(await ortKarte(ags, name, gattung, kontext, plz));
  }
  return out;
}

async function orteZumNamen(name: string): Promise<RegionHit[]> {
  if (normalisiere(name).length < 2) return [];
  const hits = await searchRegions(name, DB_SOFT_READ_TIMEOUT_MS);
  // A city state stands as Land and as city under one name (Berlin, Hamburg).
  // One card: the city, which carries the city pages.
  return hits.filter(
    (h) => !(h.region_id.length === 2 && hits.some((o) => o !== h && o.name === h.name && o.region_id.startsWith(h.region_id))),
  );
}

export async function suche(qRoh: string): Promise<SuchErgebnis> {
  const q = qRoh.trim().slice(0, 80);
  const leer: SuchErgebnis = { q, orte: [], seiten: [], orteNichtVerfuegbar: false };
  if (normalisiere(q).length < 2) return leer;

  const { themen, ort, plz } = zerlegeAnfrage(q);
  let orte: OrtTreffer[] = [];
  let orteNichtVerfuegbar = false;
  // What goes to the page directory: the whole query, unless a place took
  // part of it. Found under its full name ("Alt Schwerin") → the query was a
  // place, no topic pages (unless every word is a topic, like "Speicher");
  // found under the rest ("Förderung Würzburg") → the topic words.
  let seitenAnfrage = q;

  try {
    if (plz) {
      orte = await orteZurPlz(plz);
      seitenAnfrage = themen.join(" ");
    } else {
      // The whole query first ("Bad Tölz" must not be split), then the part
      // that is left once the topic words are out ("Förderung Würzburg").
      let hits = await orteZumNamen(q);
      let ueberRest = false;
      if (hits.length === 0 && ort && ort !== q) {
        hits = await orteZumNamen(ort);
        ueberRest = true;
      }
      // A query made only of topic words still asks the register, because
      // towns share names with topics (Speicher, Verl, Selb — measured against
      // all 9,924 town names). But then only an exact name counts: "Wind" is a
      // topic, not a request for Windeck.
      if (!ort) hits = hits.filter((h) => normalisiere(h.name) === normalisiere(q));
      orte = await Promise.all(
        hits.slice(0, MAX_ORTE).map(async (h) => ortKarte(h.region_id, h.name, h.label, await kontextVon(h), null)),
      );
      if (orte.length > 0) seitenAnfrage = ueberRest ? themen.join(" ") : ort ? "" : q;
    }
  } catch {
    orteNichtVerfuegbar = true;
  }

  const seiten = seitenAnfrage ? gruppiere(suchePassendeSeiten(seitenAnfrage)) : [];
  return { q, orte, seiten, orteNichtVerfuegbar };
}
