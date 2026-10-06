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
import { anbieterBlock } from "./impressum-anbieter";

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
  // Foreign forms of Danish, Dutch and British groups (Ørsted's "Gode Wind 2 P/S").
  "ps", "as", "aps", "bv", "nv", "ltd", "llc", "sa", "sarl", "srl", "spa", "ab", "oy",
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
  // Found as false "brands" in the stock (06.10.2026): kinds of company, not companies.
  "wka", "energiepark", "energieparks", "windstrom", "stadtwerke", "stadtwerk", "buergerwindenergie",
  "windmuellerei", "buerger", "buergerwindrad", "buergerwindraeder", "onshore", "offshore", "windpool",
  "luv", "windfarm", "windfarms", "farm", "windenergiepark", "solarpark", "kraftwerk", "windkraftwerk", "becken",
  // Regional adjectives: "Windfeld Thüringer Becken" matched the Thüringer
  // Allgemeine by its "brand". Place NAMES are not listed here; they come from
  // the municipal register (ortsWoerter).
  "deutsche", "norddeutsche", "sueddeutsche", "ostdeutsche", "westdeutsche", "mitteldeutsche",
  "europaeische", "thueringer", "saechsische", "saechsisches", "bayerische", "hessische", "maerkische",
  "brandenburgische", "westfaelische", "niedersaechsische", "ostfriesische", "nordfriesische",
  "friesische", "mecklenburgische", "pfaelzische", "schwaebische", "fraenkische", "rheinische",
  "badische", "allgaeuer", "lausitzer", "uckermaerkische", "altmaerkische", "emslaender",
  "oldenburger", "holsteiner", "ostsee", "nordsee", "regional", "lokal",
]);

/** Every word of a place name that could pass for a brand. Read from the
 *  municipal register, so a park named after its town never "proves" the
 *  town's website: Windpark Hamburg is not hamburg.de. */
export function ortsWoerterAus(namen: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const n of namen) for (const w of falten(n).split(/[^a-z0-9]+/)) if (w.length >= 4) out.add(w);
  return out;
}

/** The name as comparable words, legal form removed. */
export function nameWoerter(name: string): string[] {
  return falten(name)
    // "P/S", "A/S": one legal form, not two letters.
    .replace(/\b([a-z])\/([a-z])\b/g, "$1$2")
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
    // Three letters are allowed (ABO, PNE, EWE, RWE are this market's brands);
    // impressumBelegt then demands that the domain STARTS with them.
    if (GENERISCH.has(w) || w.length < 3) continue;
    return w;
  }
  return null;
}

export type Beleg = { wie: "name" | "anschrift" | "marke" | "register"; textstelle: string };

function umgebung(t: string, i: number, laenge: number) {
  return t.slice(Math.max(0, i - 60), i + laenge + 60).trim();
}

/**
 * Does this imprint prove that `domain` is reachable for the operator?
 * Returns the proof with the text it rests on, or null.
 */
export function impressumBelegt(impressumText: string, a: Akteur, domain: string, ortsWoerter?: Set<string>): Beleg | null {
  const t = textFalten(impressumText);

  // NAME — the whole name, in order; a single word would match any page.
  const woerter = nameWoerter(a.Firmenname ?? "");
  const name = woerter.join(" ");
  if (woerter.length >= 2 && name.length >= 8) {
    const i = t.indexOf(` ${name} `);
    if (i >= 0) return { wie: "name", textstelle: umgebung(t, i, name.length) };
  }
  // The name without its trailing kind-of-company words: Ørsted's project
  // pages say "Borkum Riffgrund 2", the register "Borkum Riffgrund 2 Offshore
  // Wind Farm GmbH & Co. oHG" (manual pass, 06.10.2026). Only when what is
  // left identifies someone — never "Windpark Reher".
  const kern = kernName(woerter);
  if (kern.length >= 2 && kern.length < woerter.length && kern.some((w) => !GENERISCH.has(w) && !/^\d+$/.test(w) && !ortsWoerter?.has(w) && w.length >= 4)) {
    const k = kern.join(" ");
    const i = t.indexOf(` ${k} `);
    if (i >= 0) return { wie: "name", textstelle: umgebung(t, i, k.length) };
  }

  // ANSCHRIFT — street and number together, the postcode close behind. Not one
  // contiguous string: windmanager writes "Stephanitorsbollwerk 3 (Haus LUV)
  // 28217 Bremen".
  const strasse = STRASSE(a.Strasse ?? "");
  // Hyphens and spaces out of the number: the register writes "12-16", an
  // imprint "12 - 16".
  // "0" is the register's "no number" (Denker & Wulf, "Windmühlenberg 0").
  // Digit groups keep a "|" between them ("12-16" → "12|16"), so "1" can never
  // read as the start of "12"; letters stay glued ("12 a" → "12a").
  const nr = (a.Hausnummer ?? "").toLowerCase().replace(/(\d)[^a-z0-9]+(?=\d)/g, "$1|").replace(/[^a-z0-9|]/g, "").replace(/^0$/, "");
  const plz = (a.Postleitzahl ?? "").trim();
  if (strasse.length >= 4 && /^\d{5}$/.test(plz)) {
    // The SAME spelling rule on both sides. Normalising only the register's
    // "Straße" failed every address on a "…straße" (PNE, enercity, ABO —
    // measured on the first sample, 06.10.2026).
    const kompakt = t.replace(/strasse/g, "str").replace(/(\d) (?=\d)/g, "$1|").replace(/ /g, "");
    // The number must END where the register's ends: "1" is not "12" (found
    // with the Denker & Wulf rule, 06.10.2026 — it matched since day one).
    let kopf = -1;
    for (let i = kompakt.indexOf(strasse + nr); i >= 0; i = kompakt.indexOf(strasse + nr, i + 1)) {
      const rest = kompakt.slice(i + strasse.length + nr.length);
      // Only a number ending in a digit can run on into another number.
      if (!nr || !/\d$/.test(nr) || !/^\d/.test(rest)) { kopf = i; break; }
    }
    const danach = kopf >= 0 ? kompakt.slice(kopf + strasse.length + nr.length, kopf + strasse.length + nr.length + 60) : "";
    const p = danach.indexOf(plz);
    // Without a register number, no other number may stand between street and
    // postcode: "Windmühlenberg 12, 24814" is another house.
    let treffer = kopf >= 0 && p >= 0 && (nr || !/\d/.test(danach.slice(0, p)));
    // An imprint that writes the street with NO number at all, directly before
    // the postcode ("Windmühlenberg, 24814 Sehestedt" — Denker & Wulf, register
    // "Windmühlenberg 1"): the address of a place, not one house among many.
    if (!treffer && nr) {
      const ohneNr = kompakt.indexOf(strasse + plz);
      if (ohneNr >= 0) treffer = true;
    }
    if (treffer) {
      const roh = t.indexOf(plz);
      return { wie: "anschrift", textstelle: umgebung(t, Math.max(0, roh - 40), plz.length + 40) };
    }
  }

  // MARKE — name, domain and imprint must all carry it.
  const m = marke(a.Firmenname ?? "");
  const label = falten(domain.split(".")[0] ?? "").replace(/[^a-z0-9]/g, "");
  // A brand written as ONE hyphenated word of kind-of-company words:
  // "WIND-projekt …" on wind-projekt.de (33 companies, 06.10.2026). It counts
  // only as that hyphenated word of the name, equal to the domain's label.
  for (const tok of (a.Firmenname ?? "").split(/\s+/)) {
    if (!tok.includes("-")) continue;
    const zusammen = falten(tok).replace(/[^a-z0-9]/g, "");
    if (zusammen.length >= 8 && zusammen === label && t.replace(/ /g, "").includes(zusammen)) {
      const i = t.indexOf(falten(tok).replace(/[^a-z0-9]+/g, " ").trim());
      return { wie: "marke", textstelle: umgebung(t, Math.max(0, i), zusammen.length) };
    }
  }
  if (m && !ortsWoerter?.has(m) && (m.length >= 4 ? label.includes(m) : label.startsWith(m))) {
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
  /** The PROVEN website, if any — an address mate's proven site is a candidate too. */
  website?: string | null;
};

const alsAkteur = (z: Registerzeile): Akteur => ({ Firmenname: z.name, Strasse: z.strasse ?? "", Hausnummer: z.hausnummer ?? "", Postleitzahl: z.plz ?? "" });

/** The domain of a mailbox, unless it is a free-mail provider — gmx.de is nobody's website. */
export function maildomain(mail: string | null): string | null {
  const host = mail?.split("@")[1];
  if (!host) return null;
  const d = organisationsDomain(host);
  return d && !GRATIS_POSTFACH.test(d) ? d : null;
}

export type Kandidat = { domain: string; quelle: Kandidatenquelle; postfach?: string | null };

/** Words that make a mailbox a function, not a person. */
const FUNKTION = /info|kontakt|contact|verwalt|mastr|marktstamm|register|windpark|wind|energie|energy|betrieb|technik|service|office|post|mail|zentrale|buchhaltung|vertrieb|projekt|admin|team|hallo|hello|anfrage|eeg|netz|einspeis|abrechnung|ops|asset|portfolio|operations|kaufm|beteilig|leitwarte|investor/i;

/**
 * A register mailbox that names a FUNCTION — tmverwaltung-wm@wpd.de,
 * marktstammdatenregister@alterric.com — is the operator's own statement where
 * it is administered. One that names a PERSON — adem.bilir@mazars.de — is a
 * person at a service firm and says nothing about whose website that is.
 */
export function funktionsPostfach(mail: string | null | undefined, name?: string): boolean {
  const [lokal = "", host = ""] = (mail ?? "").toLowerCase().split("@");
  if (!lokal) return false;
  if (FUNKTION.test(lokal)) return true;
  // A mailbox named after the operator itself: krampfer@vossenergy.com for
  // "Windpark Krampfer-Reckenthin" (manual pass, 06.10.2026). A person's
  // mailbox carries a person's name, not the park's.
  const ohne = falten(lokal).replace(/[^a-z0-9]/g, "");
  if (name && ohne.length >= 5 && unterscheidendeWoerter(name).some((w) => w.length >= 5 && (ohne === w || ohne.startsWith(w) || w.startsWith(ohne)))) return true;
  // A mailbox named after the company itself: nttb@nttb-gmbh.de.
  const label = host.split(".").slice(-2, -1)[0]?.replace(/[^a-z0-9]/g, "") ?? "";
  const kern = lokal.replace(/[^a-z0-9]/g, "");
  return kern.length >= 3 && label.includes(kern);
}

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
  const eigeneMail = maildomain(z.register_email);
  if (eigeneMail && !out.has(eigeneMail)) out.set(eigeneMail, { domain: eigeneMail, quelle: "register-mail", postfach: z.register_email });
  const k = anschriftSchluessel(alsAkteur(z));
  for (const m of k ? nachAnschrift.get(k) ?? [] : []) {
    if (m.mastr_nr === z.mastr_nr) continue;
    dazu(organisationsDomain(m.register_webseite), "anschrift");
    dazu(maildomain(m.register_email), "anschrift");
    // A mate's PROVEN website — found by hand or by the machine. Only a
    // suggestion, like every address candidate: the imprint must still name
    // this operator or its address (638 open operators had such a mate, 06.10.2026).
    dazu(m.website ? organisationsDomain(m.website) : null, "anschrift");
  }
  return [...out.values()];
}

const BELEG_RANG: Record<Beleg["wie"], number> = { name: 0, anschrift: 1, marke: 2, register: 3 };

/** Of several proven websites: what the operator told the register first, then the stronger proof. */
export function besterBeleg<P extends { ergebnis: string; kandidat: Kandidat; beleg: Beleg | null }>(pruefungen: P[]): P | null {
  return pruefungen
    .filter((p) => p.ergebnis === "belegt" && p.beleg)
    .sort((a, b) => KANDIDAT_VORRANG[a.kandidat.quelle] - KANDIDAT_VORRANG[b.kandidat.quelle] || BELEG_RANG[a.beleg!.wie] - BELEG_RANG[b.beleg!.wie])[0] ?? null;
}

/** The site is about energy at all — the context a brand needs. */
export const ENERGIE = /\b(?:wind(?:energie|kraft|park|parks|rad|raeder|räder|strom|anlagen?)?|energie\w*|energy|erneuerbar\w*|renewables?|photovoltaik|solar\w*|kraftwerk\w*|onshore|offshore|einspeis\w*|stromerzeug\w*|ökostrom|oekostrom)\b/i;
// Whole words only, and no "turbine": the aircraft maker's page matched on
// "window" (code in the page text) and on its turbine jet.

export type Urteil = { ergebnis: "belegt" | "abgelehnt" | "kein-impressum" | "nicht-erreichbar" | "geparkt"; beleg: Beleg | null; seite: "impressum" | "startseite" | null };

/** A domain that is for sale or parked. A register entry can outlive the
 *  website it names; two such cases were measured in the installer stock. */
export const GEPARKT = /(?:diese |the )?domain (?:ist |is )?(?:zu verkaufen|steht zum verkauf|kann gekauft werden|kaufen|for sale|is parked|parked free)|sedo(?:parking)?\b|expireddomains|dan\.com|parkingcrew|bodis\.com|hugedomains|undeveloped\.com/i;

/**
 * The whole decision for one operator and one domain, from what was fetched.
 *
 *  1. The imprint proves it (name, address or brand).
 *  2. No imprint was found — foreign groups publish a "legal notice" or
 *     nothing (European Energy, the Danish EWE companies, Luxembourg funds:
 *     about 800 operators on the first sample): the start page may prove it
 *     by NAME or BRAND, never by an address, which a directory page could carry.
 *  3. The operator itself declared this website to the register, and the site
 *     exists: that is its own statement, proof enough to be reached there —
 *     kept apart as "register". A declared MAILBOX counts only when it names a
 *     function (funktionsPostfach): one Sehestedt company declared a personal
 *     mailbox at its auditor, 88 wpd parks an administration mailbox at wpd.
 */
/** Offices that act as c/o address without running anything. */
export const BERATER = /wirtschaftspr(?:ü|ue)f|steuerberat|rechtsanw(?:a|ä)lt|kanzlei|notar(?:iat)?\b|treuhand/i;

/** The provider block or the page title names an adviser's office ("PKF Wulf Gruppe – Wirtschaftsprüfer & Steuerberater"). */
export function istBeraterSeite(impressum: string): boolean {
  return BERATER.test(anbieterBlock(impressum)) || BERATER.test(impressum.slice(0, 200));
}

/** Imprints of hosting providers: their default page stands where a customer has no site yet. */
const HOSTER = /(?:^|\.)(?:ionos\.(?:de|com)|goneo\.de|checkdomain\.de|united-domains\.de|inwx\.(?:com|de)|strato\.de|hosteurope\.de|all-inkl\.com|1und1\.de|domainfactory\.de|df\.eu|hetzner\.(?:de|com)|netcup\.de|godaddy\.com|sedo\.com|dan\.com)$/i;

/**
 * Whose imprint was read? The link found on a site can lead elsewhere: on
 * orsted.com it led to a Cisco privacy page, on wk-nandlstadt.de to the
 * hosting provider's imprint behind a default page (81 of 1,766 stored
 * imprints lie on another domain, 06.10.2026). The same name under another
 * ending (windpunx.com → windpunx.de) is the same organisation.
 */
export function impressumHerkunft(impressumUrl: string | null | undefined, domain: string): "eigen" | "alias" | "hoster" | "fremd" | null {
  if (!impressumUrl) return null;
  let h: string;
  try { h = new URL(impressumUrl).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
  if (h === domain || h.endsWith(`.${domain}`)) return "eigen";
  if (HOSTER.test(h)) return "hoster";
  const label = (d: string) => (organisationsDomain(d) ?? d).split(".")[0];
  return label(h) === label(domain) ? "alias" : "fremd";
}

export function beurteilen(
  a: Akteur, domain: string, quelle: Kandidatenquelle,
  abruf: { impressum: string | null; startseite: string | null; impressumUrl?: string | null },
  postfach?: string | null,
  ortsWoerter?: Set<string>,
): Urteil {
  // A hosting provider's imprint behind the site: there is no site of the operator.
  const herkunft = impressumHerkunft(abruf.impressumUrl, domain);
  if (herkunft === "hoster") return { ergebnis: "geparkt", beleg: null, seite: null };
  // A brand is a word, and words are shared: "Cirrus GmbH & Co. KG" runs wind
  // turbines, cirrusaircraft.com builds aeroplanes (search sample, 06.10.2026).
  // A brand counts only on a site that is about energy at all.
  const energie = ENERGIE.test(`${abruf.impressum ?? ""} ${abruf.startseite ?? ""}`);
  const zaehlt = (b: Beleg | null) => b && (b.wie !== "marke" || energie) ? b : null;
  if (abruf.startseite && GEPARKT.test(abruf.startseite) && abruf.startseite.length < 5000) {
    return { ergebnis: "geparkt", beleg: null, seite: null };
  }
  if (abruf.impressum) {
    let b = zaehlt(impressumBelegt(abruf.impressum, a, domain, ortsWoerter));
    // The imprint text holds more than the provider: navigation, a list of
    // projects, the insurer. A NAME found outside the provider block
    // (lib/impressum-anbieter.ts) proves only when it identifies someone and
    // the text is no list of parks — "Windpark Reher" stood in the imprint
    // text of a planning office as one of its references (178 of 3,680 proofs
    // lay outside the block, 06.10.2026; addresses and brands there are mostly
    // branch offices and groups and keep counting).
    // An adviser's office as c/o address (tax advisor, auditor, lawyer, trust):
    // the letters arrive there, the operator does not live there — 42 EWF
    // companies stood on a Husum tax firm's site (06.10.2026). The ADDRESS
    // proves nothing on such a site; the operator's own name still would.
    if (b?.wie === "anschrift" && istBeraterSeite(abruf.impressum)) b = null;
    if (b?.wie === "name") {
      const block = anbieterBlock(abruf.impressum);
      const imBlock = !!block && !!impressumBelegt(block, a, domain, ortsWoerter);
      if (!imBlock && !vollerNameIn(abruf.impressum, a.Firmenname ?? "") && !(identifizierend(a.Firmenname ?? "", ortsWoerter) && !parkListe(abruf.impressum, a.Firmenname ?? ""))) b = null;
    }
    // Another organisation's imprint proves only by the operator's own name or
    // address — never by a brand word, and never the mere existence of the site.
    if (b && (herkunft !== "fremd" || b.wie === "name" || b.wie === "anschrift")) return { ergebnis: "belegt", beleg: b, seite: "impressum" };
  }
  if (abruf.startseite) {
    const b = zaehlt(impressumBelegt(abruf.startseite, a, domain, ortsWoerter));
    // A start page NAMES parks it does not run: a planning office lists its
    // references ("Windpark Reher" stood on baubuero-kaatz.de, 06.10.2026).
    // There a name proves only when it identifies someone — a word that is
    // neither the kind of company nor a place — and the page is no park list.
    const nameTraegt = b?.wie !== "name" || vollerNameIn(abruf.startseite, a.Firmenname ?? "") || (identifizierend(a.Firmenname ?? "", ortsWoerter) && !parkListe(abruf.startseite, a.Firmenname ?? ""));
    if (b && (b.wie === "name" || b.wie === "marke") && nameTraegt) return { ergebnis: "belegt", beleg: b, seite: "startseite" };
  }
  const erreichbar = !!(abruf.startseite || (abruf.impressum && herkunft !== "fremd"));
  if (quelle === "register-webseite" && erreichbar) {
    return { ergebnis: "belegt", beleg: { wie: "register", textstelle: "vom Betreiber selbst im Marktstammdatenregister als Website angegeben" }, seite: abruf.impressum ? "impressum" : "startseite" };
  }
  // A mailbox an adviser keeps per park (tauberbischofsheim@pkf-wulf.de) is
  // post at the adviser, not the operator's website.
  const beraterSeite = !!abruf.impressum && istBeraterSeite(abruf.impressum);
  if (quelle === "register-mail" && erreichbar && !beraterSeite && funktionsPostfach(postfach, a.Firmenname)) {
    return { ergebnis: "belegt", beleg: { wie: "register", textstelle: `Funktionspostfach im Marktstammdatenregister: ${postfach}` }, seite: abruf.impressum ? "impressum" : "startseite" };
  }
  if (abruf.impressum) return { ergebnis: "abgelehnt", beleg: null, seite: null };
  if (abruf.startseite) return { ergebnis: "kein-impressum", beleg: null, seite: null };
  return { ergebnis: "nicht-erreichbar", beleg: null, seite: null };
}

/**
 * How official a proven website is, for the collision rule with other stocks.
 * Official means: the register led us there (the operator's own entry or an
 * address mate's) AND the site's text confirms it by name or address, or the
 * operator declared the site itself. A brand match, or anything we found by
 * searching, is our own judgement.
 */
export function websiteHerkunft(quelle: Kandidatenquelle | string | null, wie: Beleg["wie"] | string | null): "amtlich" | "suche" {
  const vomRegister = quelle === "register-webseite" || quelle === "register-mail" || quelle === "anschrift";
  return vomRegister && (wie === "name" || wie === "anschrift" || wie === "register") ? "amtlich" : "suche";
}

/** The name's words without the kind-of-company words at its end. */
export function kernName(woerter: string[]): string[] {
  let n = woerter.length;
  while (n > 0 && (GENERISCH.has(woerter[n - 1]) || woerter[n - 1] === "co")) n--;
  return woerter.slice(0, n);
}

/** The full name WITH its legal form, verbatim: "Betreiber des Parks ist die Amrum-Offshore West GmbH" (rwe.com). */
export function vollerNameIn(text: string, name: string): boolean {
  const t = textFalten(text);
  const v = textFalten(name).trim();
  if (v.split(" ").length >= 3 && t.includes(` ${v} `)) return true;
  // The name directly followed by A legal form, not necessarily the register's:
  // ENERTRAG's project page writes "Bürgerwind Schönfeld UG & Co KG", the
  // register "GmbH & Co. KG" (manual pass, 06.10.2026). A company name in
  // front of a legal form is a company, not a reference to a place.
  const kern = nameWoerter(name).join(" ");
  return kern.split(" ").length >= 2 && new RegExp(` ${kern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (?:gmbh|ug|ag|kg|se|eg|gbr|ohg|mbh)(?= )`).test(t);
}

/** Does the name carry a word that is neither a kind of company nor a place? */
export function identifizierend(name: string, ortsWoerter?: Set<string>): boolean {
  return unterscheidendeWoerter(name).some((w) => !ortsWoerter?.has(w));
}

/**
 * Is the text a list of parks — a reference or project page? Counted are
 * distinct "Windpark/Bürgerwindpark <word>" names other than the operator's own.
 */
export function parkListe(text: string, eigenerName: string): boolean {
  const eigen = new Set(nameWoerter(eigenerName));
  const namen = new Set<string>();
  for (const m of textFalten(text).matchAll(/ (?:buerger)?wind(?:park|feld|kraft) ([a-z0-9]{3,})(?= )/g)) if (!eigen.has(m[1])) namen.add(m[1]);
  return namen.size >= 3;
}

/** The words of a name that could tell this operator apart: brand and place
 *  names, never "Windpark", numbers or the legal form. */
export function unterscheidendeWoerter(name: string): string[] {
  return nameWoerter(name).filter((w) => !GENERISCH.has(w) && !/^\d+$/.test(w) && !/^[ivx]+$/.test(w) && w.length >= 3);
}

/**
 * Is a search hit about this operator at all, before anything is fetched?
 * A relevance filter, not a proof — the imprint still decides. Measured on the
 * first search sample (06.10.2026): without it every hit was fetched, job
 * boards, encyclopaedias and a book publisher included, each one with a
 * browser after the first refusal.
 */
export function trefferRelevant(treffer: { url: string; titel: string }, name: string): boolean {
  const woerter = unterscheidendeWoerter(name);
  if (!woerter.length) return false;
  const text = falten(`${treffer.url} ${treffer.titel}`).replace(/[^a-z0-9]+/g, " ");
  const kompakt = text.replace(/ /g, "");
  return woerter.some((w) => text.includes(` ${w}`) || kompakt.includes(w));
}

/**
 * The name for a quoted search: everything before the legal form, cut at a
 * WORD. Cutting at letters made "Windpark Cottbuser Halde" into "Windpark",
 * because "Cottbuser" starts like "Co. KG" (first search sample, 06.10.2026).
 */
export function zitatName(name: string): string {
  const woerter = name.replace(/＆/g, "&").split(/\s+/);
  const ende = woerter.findIndex((w, i) => i > 0 && /^(?:GmbH|mbH|UG|KG|AG|SE|GbR|eG|oHG|OHG|KGaA|e\.K\.|&|und|Co\.?|\(haftungsbeschränkt\))$/i.test(w));
  const vorne = (ende > 0 ? woerter.slice(0, ende) : woerter).join(" ").trim();
  if (unterscheidendeWoerter(vorne).length) return vorne;
  // "Windpark GmbH & Co. Kisselsheide KG": the distinguishing part comes
  // after the legal form. Then every word that is not legal form.
  return woerter.filter((w) => !/^(?:GmbH|mbH|UG|KG|AG|SE|GbR|eG|oHG|OHG|KGaA|e\.K\.|&|und|Co\.?|\(haftungsbeschränkt\))$/i.test(w)).join(" ").trim();
}

/** The website columns of an operator row: a proven check, or null to withdraw. */
export function websiteFelder(p: { kandidat: Kandidat; beleg: Beleg | null; impressum: { impressum_url: string | null } } | null, heute: string) {
  return {
    website: p ? p.kandidat.domain : null,
    website_quelle: p?.kandidat.quelle ?? null,
    website_beleg: p?.beleg?.wie ?? null,
    website_beleg_url: p?.impressum.impressum_url ?? null,
    website_textstelle: p?.beleg?.textstelle.slice(0, 400) ?? null,
    website_geprueft_am: p ? heute : null,
  };
}

/** The contact columns of an operator row. A new contact needs a new release. */
export function kontaktFelder(k: { email: string; kanal: string; url: string } | null, geprueftAm: string | null) {
  return {
    kontakt_email: k?.email ?? null, kontakt_kanal: k?.kanal ?? null, kontakt_beleg_url: k?.url ?? null,
    kontakt_geprueft_am: k ? geprueftAm : null, kontakt_freigabe_am: null, kontakt_sperrgrund: null,
  };
}

/** Failures of OUR attempt, not of the site. */
const VORUEBERGEHEND = /TIMEOUT|HTTP 5\d\d|fetch failed|ECONNRESET|leere Seite/i;

/**
 * Should a cached fetch be tried again? A timeout, a server error or an empty
 * answer says nothing about the site — cached for good, about 40 operators
 * stood as "unreachable" because of one busy hour (06.10.2026). At most three
 * attempts, an hour apart; a missing domain or a 404 is an answer and stays.
 */
export function abrufWiederholen(i: { text: string | null; startText?: string | null; fehler: string | null; abgerufen_am: string; versuche?: number }, jetzt = Date.now()): boolean {
  return !i.text && !i.startText && !!i.fehler && VORUEBERGEHEND.test(i.fehler) && (i.versuche ?? 1) < 3 && jetzt - Date.parse(i.abgerufen_am) > 3_600_000;
}
