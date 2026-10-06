/**
 * Wind farm operators — the rules, without I/O.
 *
 * Who operates a turbine comes from the market master data register, never
 * from a search: every turbine names its operator by register number, and the
 * operator's own entry carries name, legal form and address. What the register
 * often lacks is a website (22 % of the operating organisations have one) — and
 * that is where everything that went wrong in the other stocks can go wrong
 * here too. A website therefore counts for an operator only when the site's OWN
 * IMPRINT proves it, in one of three ways, each calibrated on a real case
 * (06.10.2026):
 *
 *  - NAME: the operator's name stands in the imprint. A Bürgerwindpark with its
 *    own site.
 *  - ANSCHRIFT: the operator's register address stands in the imprint. The
 *    project companies of a developer sit at the developer's address — all 208
 *    Alterric companies at Holzweg 87, Aurich, which alterric.com's imprint
 *    names. The address, not mere proximity: 115 companies share an address in
 *    Sehestedt, and the only domain there belongs to an auditing firm whose
 *    imprint names Hamburg.
 *  - MARKE: a group subsidiary registered somewhere else. EnBW Windkraftprojekte
 *    GmbH sits in Stuttgart, enbw.com's imprint names Karlsruhe. The brand counts
 *    only when it stands in the operator's name, in the domain AND in the
 *    imprint — two of those three alone would let any directory page through.
 *
 * Search results are mostly directories (northdata, Creditreform, copies of the
 * commercial register). They fail all three tests because their imprint names
 * the directory, which is exactly the point.
 */

import { organisationsDomain } from "./bestand-abgleich";
import { GRATIS_POSTFACH } from "./kontakt-suche";

export type Akteur = Record<string, string>;

/** Register codes that matter here (Katalogwerte of the export). */
export const PERSONENART_ORGANISATION = "517";
export const PERSONENART_NATUERLICH = "518";
export const STATUS_IN_BETRIEB = "35";
export const STATUS_IN_PLANUNG = "31";

/** Lowercase, umlauts folded, the register's fullwidth ampersand made plain. */
export function falten(s: string): string {
  return s
    .toLowerCase()
    .replace(/＆/g, "&")
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/é|è/g, "e");
}

/** Words that say what kind of company it is, never which one. */
const RECHTSFORM = new Set([
  "gmbh", "mbh", "co", "kg", "ag", "se", "eg", "ug", "haftungsbeschraenkt", "ohg", "gbr", "kgaa",
  "ek", "ev", "und", "&", "gesellschaft", "mit", "beschraenkter", "haftung", "kommanditgesellschaft",
]);

/** Words too common in this market to identify a group. */
const GENERISCH = new Set([
  "wind", "windpark", "windparks", "windkraft", "windkraftanlage", "windkraftanlagen", "windenergie",
  "windenergieanlage", "windenergieanlagen", "windfeld", "windrad", "windraeder", "wea", "buergerwind",
  "buergerwindpark", "buergerwindparks", "buergerenergie", "energie", "energien", "energy", "erneuerbare",
  "regenerative", "solar", "park", "parks", "projekt", "projekte", "projektgesellschaft", "betriebs",
  "betreiber", "betreibergesellschaft", "beteiligungs", "beteiligung", "verwaltungs", "verwaltung",
  "holding", "invest", "portfolio", "deutschland", "germany", "nord", "sued", "ost", "west", "neue", "die",
  "der", "das", "am", "an", "im", "zum", "zur", "bei", "fuer", "von", "renditefonds", "fonds", "repowering",
  "erste", "zweite", "dritte", "service", "management", "kraft", "strom", "power", "green", "gruene",
]);

/** The name as comparable words, legal form removed. */
export function nameWoerter(name: string): string[] {
  return falten(name)
    .replace(/[^a-z0-9&]+/g, " ")
    .split(" ")
    .filter((w) => w && !RECHTSFORM.has(w));
}

/** Imprint text as one comparable string. */
export function textFalten(text: string): string {
  return ` ${falten(text).replace(/[^a-z0-9&]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

const STRASSE = (s: string) => falten(s).replace(/strasse|str\./g, "str").replace(/[^a-z0-9]/g, "");

/** A key for "same register address". Used to group, never as proof. */
export function anschriftSchluessel(a: Akteur): string | null {
  const s = STRASSE(a.Strasse ?? "");
  const plz = (a.Postleitzahl ?? "").trim();
  if (!s || !/^\d{5}$/.test(plz)) return null;
  return `${s}|${(a.Hausnummer ?? "").toLowerCase().replace(/\s+/g, "")}|${plz}`;
}

/** The first word of the name that could identify a group: EnBW, Alterric, enercity. */
export function marke(name: string): string | null {
  for (const w of nameWoerter(name)) {
    if (/^\d+$/.test(w) || /^[ivx]+$/.test(w)) continue;
    if (GENERISCH.has(w) || w.length < 4) continue;
    return w;
  }
  return null;
}

export type Beleg = { wie: "name" | "anschrift" | "marke"; textstelle: string };

function umgebung(t: string, i: number, laenge: number) {
  return t.slice(Math.max(0, i - 60), i + laenge + 60).trim();
}

/**
 * Does this imprint prove that `domain` is reachable for the operator?
 * Returns the proof with the text it rests on, or null.
 */
export function impressumBelegt(impressumText: string, a: Akteur, domain: string): Beleg | null {
  const t = textFalten(impressumText);

  // NAME — the whole name, in order; a single word would match any page.
  const woerter = nameWoerter(a.Firmenname ?? "");
  const name = woerter.join(" ");
  if (woerter.length >= 2 && name.length >= 8) {
    const i = t.indexOf(` ${name} `);
    if (i >= 0) return { wie: "name", textstelle: umgebung(t, i, name.length) };
  }

  // ANSCHRIFT — street and number together, the postcode close behind. Not one
  // contiguous string: windmanager writes "Stephanitorsbollwerk 3 (Haus LUV)
  // 28217 Bremen".
  const strasse = STRASSE(a.Strasse ?? "");
  const nr = (a.Hausnummer ?? "").toLowerCase().replace(/\s+/g, "");
  const plz = (a.Postleitzahl ?? "").trim();
  if (strasse.length >= 4 && /^\d{5}$/.test(plz)) {
    const kompakt = t.replace(/ /g, "");
    const kopf = kompakt.indexOf(strasse + nr);
    if (kopf >= 0 && kompakt.slice(kopf, kopf + strasse.length + nr.length + 60).includes(plz)) {
      const roh = t.indexOf(plz);
      return { wie: "anschrift", textstelle: umgebung(t, Math.max(0, roh - 40), plz.length + 40) };
    }
  }

  // MARKE — name, domain and imprint must all carry it.
  const m = marke(a.Firmenname ?? "");
  if (m && falten(domain).replace(/[^a-z0-9]/g, "").includes(m)) {
    const i = t.indexOf(` ${m} `);
    if (i >= 0) return { wie: "marke", textstelle: umgebung(t, i, m.length) };
  }
  return null;
}

/** Where a website candidate came from — decides only the order of trying. */
export type Kandidatenquelle = "register-webseite" | "register-mail" | "anschrift" | "suche" | "manuell";

/** Order of preference: what the operator told the register comes first. */
export const KANDIDAT_VORRANG: Record<Kandidatenquelle, number> = {
  "register-webseite": 0,
  "register-mail": 1,
  anschrift: 2,
  manuell: 3,
  suche: 4,
};

/** Search query for an operator: distinctive name and place, no legal form —
 *  with "GmbH & Co. KG" in it the search returned nothing (calibrated). */
export function suchanfrage(a: Akteur): string {
  const woerter = nameWoerter(a.Firmenname ?? "").filter((w) => !/^\d+$/.test(w));
  const ort = (a.Ort ?? "").trim();
  return [...woerter.slice(0, 6), ort].filter(Boolean).join(" ");
}

/**
 * The final state of every operator. "Nothing found" and "not yet looked"
 * must never look the same — the stock is complete when no entry is `offen`.
 */
export type Stand =
  | "website-belegt" //   a website whose imprint proves it
  | "nur-register" //     no proven website, but the register's own e-mail or phone
  | "keine-website" //    searched and checked, nothing that proves itself
  | "offen"; //           not yet looked at

export function standVon(z: { website_beleg: string | null; register_email: string | null; register_telefon: string | null; gesucht_am: string | null }): Stand {
  if (z.website_beleg) return "website-belegt";
  if (!z.gesucht_am) return "offen";
  if (z.register_email || z.register_telefon) return "nur-register";
  return "keine-website";
}

/** An operator row as the candidate rules need it. */
export type Registerzeile = {
  mastr_nr: string; name: string; strasse: string | null; hausnummer: string | null; plz: string | null;
  register_webseite: string | null; register_email: string | null;
};

const alsAkteur = (z: Registerzeile): Akteur => ({ Firmenname: z.name, Strasse: z.strasse ?? "", Hausnummer: z.hausnummer ?? "", Postleitzahl: z.plz ?? "" });

/** The domain of a mailbox, unless it is a free-mail provider — gmx.de is nobody's website. */
export function maildomain(mail: string | null): string | null {
  const host = mail?.split("@")[1];
  if (!host) return null;
  const d = organisationsDomain(host);
  return d && !GRATIS_POSTFACH.test(d) ? d : null;
}

export type Kandidat = { domain: string; quelle: Kandidatenquelle };

/**
 * What the register itself offers for an operator: its own website, the
 * domain of its own mailbox, and those of the other operators at the same
 * address. Address mates only SUGGEST — the auditing firm at Sehestedt is an
 * address mate too; the imprint decides.
 */
export function registerKandidaten(z: Registerzeile, nachAnschrift: Map<string, Registerzeile[]>): Kandidat[] {
  const out = new Map<string, Kandidat>();
  const dazu = (d: string | null, quelle: Kandidatenquelle) => { if (d && !out.has(d)) out.set(d, { domain: d, quelle }); };
  dazu(organisationsDomain(z.register_webseite), "register-webseite");
  dazu(maildomain(z.register_email), "register-mail");
  const k = anschriftSchluessel(alsAkteur(z));
  for (const m of k ? nachAnschrift.get(k) ?? [] : []) {
    if (m.mastr_nr === z.mastr_nr) continue;
    dazu(organisationsDomain(m.register_webseite), "anschrift");
    dazu(maildomain(m.register_email), "anschrift");
  }
  return [...out.values()];
}

const BELEG_RANG: Record<Beleg["wie"], number> = { name: 0, anschrift: 1, marke: 2 };

/** Of several proven websites: what the operator told the register first, then the stronger proof. */
export function besterBeleg<P extends { ergebnis: string; kandidat: Kandidat; beleg: Beleg | null }>(pruefungen: P[]): P | null {
  return pruefungen
    .filter((p) => p.ergebnis === "belegt" && p.beleg)
    .sort((a, b) => KANDIDAT_VORRANG[a.kandidat.quelle] - KANDIDAT_VORRANG[b.kandidat.quelle] || BELEG_RANG[a.beleg!.wie] - BELEG_RANG[b.beleg!.wie])[0] ?? null;
}
