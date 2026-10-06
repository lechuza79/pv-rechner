/**
 * One organisation, one stock — unless it really has two roles.
 *
 * Every contact stock is collected on its own: Gemeinden from Wikidata,
 * utilities and wind operators from the market master data register,
 * installers and press from our own web searches. Until 06.10.2026 none of
 * them asked the others before writing, and 110 of 3,115 "installers" turned
 * out to be held at the same time by the press catalogue (64) or the utility
 * list (46): newspapers, district portals, directories and Stadtwerke. Their
 * "evidence" was that the word Photovoltaik appeared on the page — which a
 * newspaper and a Stadtwerk satisfy just as well as an installer.
 *
 * The rule here decides such a collision without a person wherever the
 * answer is not a judgement call:
 *
 *  - A stock whose identity comes from an OFFICIAL source (the register, the
 *    municipal record) beats a stock built from our own SEARCH. A domain that
 *    the register names as a Stadtwerk is not an installer because a search
 *    hit said so.
 *  - Some pairs are the same organisation in two roles and may share a domain:
 *    a Stadtwerk or a Gemeinde can operate a wind farm. Those are listed
 *    explicitly; every other pair is a collision.
 *  - Two search-based stocks colliding (press vs. installer) has no automatic
 *    answer: the press catalogue holds installers by mistake as well as the
 *    other way round (measured: LB Solartec, SONNCO). That goes to a person.
 *
 * Domains are compared by their registrable part, so energiemonitor.bayernwerk.de
 * and bayernwerk.de are one organisation — except on shared hosting platforms,
 * where every customer sits under the same registrable domain and only the full
 * host identifies who it is.
 */

import { siteOf } from "./kontakt-suche";

export type Bestand = "gemeinde" | "versorger" | "windbetreiber" | "presse" | "fachbetrieb";

export type Herkunft = "amtlich" | "suche";

/**
 * Where a stock's WEBSITES normally come from. Decides who yields in a
 * collision. It is a default per stock, overridable per entry: a wind operator
 * is official as an identity (the register), but a website we found for it by
 * searching is not — measured trap, see the test on the newspaper domain.
 */
export const HERKUNFT: Record<Bestand, Herkunft> = {
  gemeinde: "amtlich",
  versorger: "amtlich",
  windbetreiber: "amtlich",
  presse: "suche",
  fachbetrieb: "suche",
};

/** The same organisation legitimately in two roles. Order does not matter. */
export const DARF_TEILEN: ReadonlyArray<readonly [Bestand, Bestand]> = [
  ["versorger", "windbetreiber"], // Stadtwerke operate wind farms
  ["gemeinde", "windbetreiber"], // so do Gemeinden, directly or as Gemeindewerke
  // A Gemeinde running its own utility as an Eigenbetrieb publishes it on the
  // Gemeinde's site (measured 06.10.2026: Gemeindewerke Wildeck, Baiersbronn,
  // Gangkofen, Markt Egloffstein and more than 20 others).
  ["gemeinde", "versorger"],
];

/**
 * Hosting platforms that give every customer a subdomain. There the
 * registrable domain names the platform, not the customer, so two unrelated
 * businesses would look like one. The list is of platforms, which change
 * rarely — not of customers.
 */
const GETEILTES_HOSTING = /(?:^|\.)(?:jimdo(?:site)?\.(?:de|com)|wixsite\.com|business\.site|webnode\.(?:de|com|page)|wordpress\.com|blogspot\.(?:de|com)|site123\.me|beepworld\.de|npage\.de|homepage\.t-online\.de|weebly\.com|strikingly\.com|godaddysites\.com|ionos\.space|my\.canva\.site|webador\.de)$/i;

/** The part of a host that identifies the organisation. */
export function organisationsDomain(urlOderHost: string | null | undefined): string | null {
  if (!urlOderHost) return null;
  let h = urlOderHost.trim().toLowerCase();
  if (!h) return null;
  try {
    h = new URL(/^[a-z]+:\/\//.test(h) ? h : `https://${h}`).hostname;
  } catch {
    return null;
  }
  h = h.replace(/^www\./, "").replace(/\.$/, "");
  if (!h.includes(".")) return null;
  return GETEILTES_HOSTING.test(h) ? h : siteOf(h);
}

export type Belegung = { bestand: Bestand; id: string; name?: string | null; herkunft?: Herkunft };

const herkunftVon = (b: { bestand: Bestand; herkunft?: Herkunft }): Herkunft => b.herkunft ?? HERKUNFT[b.bestand];

/** Domain → every stock entry that claims it. */
export type Belegungen = Map<string, Belegung[]>;

export function belegungAufbauen(eintraege: Iterable<Belegung & { website: string | null | undefined }>): Belegungen {
  const m: Belegungen = new Map();
  for (const e of eintraege) {
    const d = organisationsDomain(e.website);
    if (!d) continue;
    const liste = m.get(d) ?? [];
    liste.push({ bestand: e.bestand, id: e.id, name: e.name ?? null, herkunft: e.herkunft });
    m.set(d, liste);
  }
  return m;
}

const darfTeilen = (a: Bestand, b: Bestand) =>
  a === b || DARF_TEILEN.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export type Urteil =
  /** No other stock claims this domain. */
  | { art: "frei" }
  /** Others claim it, but only in a role this organisation may also have. */
  | { art: "geteilt"; mit: Belegung[] }
  /** An official stock claims it; the entry being written yields. */
  | { art: "verdraengt"; durch: Belegung[] }
  /** This entry is official and the others are search-based: they yield. */
  | { art: "vorrang"; gegen: Belegung[] }
  /** Only a person can say which of the two stocks is wrong. */
  | { art: "entscheiden"; mit: Belegung[] };

/**
 * Decide whether an entry of stock `bestand` may hold `domain`.
 *
 * Entries of the same stock never collide with each other: twenty wind
 * project companies sharing their parent's website are one group, not twenty
 * conflicts.
 */
/**
 * A person's decision on a collision two search-based stocks could not settle:
 * which stocks hold this domain WRONGLY. Stored, so the next collection run of
 * either stock cannot undo it (table bestand_entscheidungen).
 */
export type Entscheidung = { falsch: Bestand[]; notiz: string };
export type Entscheidungen = Map<string, Entscheidung>;

export function abgleichen(
  domain: string | null,
  bestand: Bestand,
  belegungen: Belegungen,
  /** Where THIS entry's domain came from, if it differs from the stock's default. */
  optionen: { herkunft?: Herkunft; entscheidungen?: Entscheidungen } = {},
): Urteil {
  if (!domain) return { art: "frei" };
  // A decision by a person beats every rule below — that is what it is for.
  const e = optionen.entscheidungen?.get(domain);
  if (e?.falsch.includes(bestand)) {
    return { art: "verdraengt", durch: [{ bestand, id: "entscheidung", name: `von Hand entschieden: ${e.notiz}`, herkunft: "amtlich" }] };
  }
  const selbst = optionen.herkunft ?? HERKUNFT[bestand];
  // Only the stock decides what is "the same entry". Identifiers are unique
  // within a stock, not across: press and installers both key by domain, and
  // comparing ids across stocks once hid every collision between them
  // (measured 06.10.2026, 8 instead of 52 on the decision list).
  const andere = (belegungen.get(domain) ?? []).filter((b) => b.bestand !== bestand && !e?.falsch.includes(b.bestand));
  if (andere.length === 0) return { art: "frei" };
  const konflikt = andere.filter((b) => !darfTeilen(bestand, b.bestand));
  if (konflikt.length === 0) return { art: "geteilt", mit: andere };
  // The verdict must not depend on who writes first: the same collision seen
  // from either side gives the same answer.
  const amtlich = konflikt.filter((b) => herkunftVon(b) === "amtlich");
  if (selbst === "suche" && amtlich.length > 0) return { art: "verdraengt", durch: amtlich };
  if (selbst === "amtlich" && amtlich.length === 0) return { art: "vorrang", gegen: konflikt };
  return { art: "entscheiden", mit: konflikt };
}

const BESTANDSNAME: Record<Bestand, string> = {
  gemeinde: "Gemeinde",
  versorger: "Versorger",
  windbetreiber: "Windparkbetreiber",
  presse: "Presse",
  fachbetrieb: "Fachbetrieb",
};

/** The reason written next to a demoted entry, so it can be traced later. */
export function verdraengtGrund(u: Extract<Urteil, { art: "verdraengt" }>): string {
  const erster = u.durch[0];
  if (erster.id === "entscheidung") return erster.name ?? "von Hand entschieden";
  const wer = erster.name ? ` (${erster.name})` : "";
  return `steht im Bestand ${BESTANDSNAME[erster.bestand]}${wer} — amtliche Quelle geht vor`;
}
