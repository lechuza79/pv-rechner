/**
 * Finding and proving contacts on an organisation's own website — the general
 * engine behind the municipal contact search (19.09.2026).
 *
 * What it does, independent of who is searched:
 *  - SCOPE: an address counts when it is published on the organisation's own
 *    site and uses its own (or a proven institutional) mail domain.
 *  - ROLE: a role counts when the published block names it as the person's own
 *    unit or title — never as one item in a long list of duties, never from a
 *    heading when the block names a different unit, never from a mailbox name.
 *  - PROOF: every accepted contact carries the page, the text block and the
 *    page digest it came from.
 *  - COMPARISON: the previously known contacts are graded against the findings,
 *    and a confirmed old contact is kept as fallback instead of blocking.
 *
 * What differs per population is passed in as a `Rollenwerk`: which roles are
 * searched, which surroundings disqualify a block, and which mailbox names are
 * general. The municipal configuration lives in lib/contact-municipal-judge.ts.
 */
import { evidenceLimitations } from "./contact-quality-evidence";
import type { ContactCandidate } from "./contact-evidence";
export { headingContext } from "./contact-heading-context";

export type Rolle = {
  /** Stored with the contact, e.g. "energy" or "press". */
  kanal: string;
  /** Matches the role in the published block (own unit or title). */
  text: RegExp;
  /** Matches a heading above the block. Must be anchored (^…$). */
  heading: RegExp;
};

export type Rollenwerk = {
  rollen: Rolle[];
  /** Titles that make the role the person's own responsibility. */
  eigenerTitel: RegExp;
  /** Purposes that disqualify a block (web agency, data protection officer …). */
  ausgeschlossen: RegExp;
  /** Another unit named in the block: it keeps only an explicit own title. */
  fremdeEinheit: RegExp;
  /** Blocks that are not the administration/organisation itself (elected members …). */
  nichtDieVerwaltung?: { text: RegExp; pfad: RegExp };
  /** Mailbox names that are general contact points, never a role. */
  allgemein: RegExp;
  /** Mailbox names that make an equally proven candidate the stronger one. */
  starkesPostfach: RegExp;
  /**
   * Eine SEITE kann die Rolle tragen, nicht nur der Textblock: Bei einem
   * redaktionellen Angebot muss das Impressum eine verantwortliche Person mit
   * Adresse nennen (§ 5 DDG, § 18 Abs. 2 MStV) — dort steht die Rolle im
   * Seitenzweck, nicht neben der Adresse. Gibt die Funktion einen Kanal
   * zurück, zählt eine nicht ausgeschlossene Adresse dieser Seite dafür.
   * Bei Gemeinden ist das bewusst NICHT gesetzt: dort steht im Impressum das
   * allgemeine Rathaus-Postfach neben der Webagentur.
   */
  seitenRolle?: (pfad: string) => string | null;
};

export type Organisation = { id: string; name: string; website: string | null };
export type SourceRef = { url: string; digest: string; valid: boolean; title?: string };
export type Evidence = {
  email: string; url: string; digest: string; block: string; headings: string[];
  reasons: string[]; rawChannels: string[]; channels: string[]; scope: string;
  /** Own title or function mailbox, as opposed to a person merely listed in a department with that name. */
  strong: boolean;
};

const stripMail = (t: string) => t.replace(/[\w.+%-]+\s*(?:@|\(at\)|\[at\])\s*[\w.-]+/giu, "");
export const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
/** German sites use plain second-level domains; two labels are the registrable part. */
/** Zwei Labels sind der registrierbare Teil; Großschreibung ist bedeutungslos (Name@Blog.TV). */
export const siteOf = (h: string) => h.toLowerCase().split(".").slice(-2).join(".");
const pathOf = (u: string) => { try { return new URL(u).pathname; } catch { return ""; } };
export const fold = (t: string) => t.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z]/g, "");

const HISTORICAL = /ehemalig|nicht (?:mehr )?zuständig|nicht mehr erreichbar|außer dienst|\ba\.\s?d\./iu;
const NEWS_PATH = /\/(?:news|aktuelles|nachrichten|pressemitteilung\w*|presseinformation\w*|kalender|veranstaltung\w*|termine)(?:\/|$)/i;
/** Hard reasons: no fallback use either. */
const HARD = ["source-invalid", "published-address-conflict", "excluded-purpose", "historical-or-negated"];

/**
 * A role word counts only as the person's unit or title, not as one item in a
 * longer list of duties or departments. Measured on the full municipal run
 * (18.09.2026): archive, passport office, room letting and a museum were
 * selected as press contacts because the role was the fifth item of their duties.
 */
export function roleAsOwnUnit(text: string, role: RegExp, eigenerTitel: RegExp): "title" | "unit" | false {
  const segments = text.split(/\s*(?:[,;•·|\n]| \/ | – )\s*/u).map(t => t.trim()).filter(t => t.length > 1);
  const hits = segments.map((t, i) => [t, i] as const).filter(([t]) => role.test(t));
  if (!hits.length) return false;
  if (hits.some(([t]) => eigenerTitel.test(t))) return "title";
  return segments.length < 4 || hits.some(([, i]) => i < 2) ? "unit" : false;
}

export function judgeEvidence(c: ContactCandidate, headings: string[], src: SourceRef, o: Organisation, asOf: string, w: Rollenwerk): Evidence {
  const reasons: string[] = [];
  const own = siteOf(host(o.website ?? ""));
  if (!src.valid) reasons.push("source-invalid");
  if (!own || siteOf(host(src.url)) !== own) reasons.push("source-not-official-site");
  if (!own || siteOf(c.email.split("@")[1] ?? "") !== own) reasons.push("mailbox-foreign-domain");
  if (c.sourceConflicts?.length) reasons.push("published-address-conflict");
  const blocks = [c.roleEvidence, ...(c.additionalRoleEvidence ?? [])].filter(e => e?.exclusiveAddress).map(e => e!.text);
  const block = blocks.join(" || ");
  const general = w.allgemein.test(c.email.split("@")[0]);
  const near = (t: string) => {
    const i = t.toLowerCase().indexOf(c.email.toLowerCase());
    return i < 0 ? "" : t.slice(Math.max(0, i - 150), i + c.email.length + 150);
  };
  // Role text: exclusive blocks only, sibling-department lists cut off, long blocks only near the address.
  const roleText = stripMail(blocks.map(t => {
    const eigen = t.split(/(?:zugehörige|übergeordnete|weitere)\s+abteilungen/iu)[0];
    return eigen.length <= 400 && !general ? eigen : near(eigen) || (general ? "" : eigen.slice(0, 400));
  }).join(" || "));
  // The general mailbox sits next to web agency credits in every imprint; only its purpose can exclude it.
  if (c.purpose === "excluded" || (!general && w.ausgeschlossen.test(stripMail(block.length <= 400 ? block : near(block))))) reasons.push("excluded-purpose");
  if (HISTORICAL.test(stripMail(block))) reasons.push("historical-or-negated");
  let path = "";
  try { path = new URL(src.url).pathname; } catch { /* invalid URL already flagged */ }
  if (!general && w.nichtDieVerwaltung && (w.nichtDieVerwaltung.text.test(stripMail(block)) || (path && w.nichtDieVerwaltung.pfad.test(path)))) reasons.push("council-member");
  const limits = evidenceLimitations(block, src.url, { asOf }, c.publishedAt);
  reasons.push(...limits.filter(r => r !== "dated-source-needs-current-confirmation"));
  const footerish = /impressum/i.test(block) && /datenschutz/i.test(block);
  const usable = general || footerish || NEWS_PATH.test(path) || w.fremdeEinheit.test(stripMail(block)) ? [] :
    headings.map(h => h.split(" | ")[0].trim()).filter(h => h.length > 0 && h.length <= 60 && !/\d/.test(h));
  const rawChannels: string[] = [];
  // Another unit named in the card (archive, museum, passport office) keeps only an explicit own title.
  const otherUnit = w.fremdeEinheit.test(roleText);
  const fromText = (role: RegExp) => { const found = roleAsOwnUnit(roleText, role, w.eigenerTitel); return found === "title" || (found === "unit" && !otherUnit); };
  for (const rolle of w.rollen) {
    if (!general && (fromText(rolle.text) || usable.some(h => rolle.heading.test(h)))) rawChannels.push(rolle.kanal);
  }
  // Die Seite selbst trägt die Rolle (Impressum eines redaktionellen Angebots).
  const ausSeite = !general && path ? w.seitenRolle?.(path) ?? null : null;
  if (ausSeite && !rawChannels.includes(ausSeite) && !reasons.includes("excluded-purpose")) rawChannels.push(ausSeite);
  // Ein altes Datum IM Text spricht gegen eine Rolle, die aus diesem Text
  // stammt — nicht gegen eine Pflichtangabe der Seite: Ein Impressum trägt
  // regelmäßig das Jahr seiner letzten Überarbeitung und muss trotzdem aktuell
  // sein. Deshalb gilt der Vorbehalt nur für aus Text oder Überschrift
  // abgeleitete Rollen.
  if (rawChannels.some(k => k !== ausSeite) && limits.includes("dated-source-needs-current-confirmation")) reasons.push("dated-source");
  const local = c.email.split("@")[0];
  const strong = w.starkesPostfach.test(local) || w.eigenerTitel.test(roleText) || !!ausSeite || (usable.length > 0 && !/\|/.test(block));
  return { email: c.email, url: src.url, digest: src.digest, block: block.slice(0, 500), headings: headings.map(h => h.slice(0, 160)),
    reasons, rawChannels, channels: reasons.length ? [] : rawChannels, scope: "organisation", strong };
}

/**
 * Shared administration / joint office: a second site and mail domain may belong
 * to the same organisation. The caller names it (`verbund`); this decides which
 * of the found sites and domains it really covers.
 *
 * A site counts when a page title or the domain carries one of the association's
 * words; a mail domain counts when three or more distinct addresses use it there,
 * when it is a spelling variant of the organisation's own domain, or when it
 * carries one of those words. Foreign authorities and municipal companies are
 * excluded — they carry the same name and are not the administration.
 */
export type Verbund = { name: string; tokens: string[] };
export type ScopeRegeln = {
  /** Domains of a different authority publishing on the same portal. */
  fremdeBehoerde: RegExp;
  /** Companies that carry the organisation's name but are not the organisation. */
  eigenbetrieb: RegExp;
  /** Prefixes/suffixes a domain may add around the own name ("stadt…", "…gemeinde"). */
  namensvarianten: RegExp;
  /**
   * Pages of the own site whose addresses belong to the organisation whatever
   * their mail domain. A small business publishes its web.de or t-online
   * mailbox in its legally required imprint; rejecting it as a foreign domain
   * lost the only address of such businesses (measured 21.09.2026). Left unset
   * for administrations, where a foreign mailbox on the own site is usually
   * another body's.
   */
  eigeneAdresseAuf?: (pfad: string) => boolean;
};

export function applyScope(evidence: Evidence[], titles: Map<string, string>, o: Organisation, verbund: Verbund | null, r: ScopeRegeln): Evidence[] {
  const tokens = verbund?.tokens ?? [];
  const own = siteOf(host(o.website ?? ""));
  const ownToken = fold(own.split(".")[0] ?? "");
  const adminSites = new Set<string>();
  for (const [url, title] of titles) {
    const site = siteOf(host(url));
    if (tokens.some(w => fold(title).includes(w) || fold(site).includes(w))) adminSites.add(site);
  }
  const perDomain = new Map<string, Set<string>>();
  for (const e of evidence) {
    const site = siteOf(host(e.url));
    if (site !== own && !adminSites.has(site)) continue;
    const d = siteOf(e.email.split("@")[1] ?? "");
    perDomain.set(d, (perDomain.get(d) ?? new Set()).add(e.email));
  }
  const otherAuthority = (d: string) => r.fremdeBehoerde.test(fold(d)) && !tokens.some(w => fold(d).includes(w));
  const ownVariant = (d: string) => ownToken.length >= 4 && new RegExp(`^(?:${r.namensvarianten.source})?${ownToken}(?:${r.namensvarianten.source})?$`).test(fold(d.split(".")[0] ?? ""));
  const company = (d: string) => r.eigenbetrieb.test(fold(d));
  const institutional = new Set([...perDomain].filter(([d, set]) => !otherAuthority(d) && !company(d) && (set.size >= 3
    || ownVariant(d)
    || tokens.some(w => fold(d).includes(w)))).map(([d]) => d));
  return evidence.map(e => {
    const site = siteOf(host(e.url));
    const domain = siteOf(e.email.split("@")[1] ?? "");
    const publishedAsOwn = site === own && !otherAuthority(domain) && !company(domain) && !!r.eigeneAdresseAuf?.(pathOf(e.url));
    const reasons = e.reasons.filter(rr =>
      !(rr === "source-not-official-site" && adminSites.has(site)) &&
      !(rr === "mailbox-foreign-domain" && (publishedAsOwn || institutional.has(domain) || (verbund && tokens.some(w => fold(domain).includes(w))))));
    const viaAdmin = !!verbund && (adminSites.has(site) || (domain !== own && institutional.has(domain)));
    return { ...e, reasons, channels: reasons.length ? [] : e.rawChannels,
      scope: viaAdmin ? `shared-administration:${verbund!.name}` : "organisation" };
  });
}

export type Mailbox = { email: string; strong: boolean; channels: string[]; general: boolean; confirmedOnSite: boolean; unsuitable: boolean; scope: string; proof: Evidence | null; reasons: string[] };

export function consolidate(evidence: Evidence[], w: Rollenwerk): Mailbox[] {
  const byMail = new Map<string, Evidence[]>();
  for (const e of evidence) byMail.set(e.email, [...(byMail.get(e.email) ?? []), e]);
  return [...byMail].map(([email, list]) => {
    const proof = list.find(e => e.channels.length) ?? null;
    const confirmedOnSite = list.some(e => !e.reasons.some(r => r === "source-not-official-site" || r === "mailbox-foreign-domain" || r === "source-invalid"));
    return {
      email, proof, strong: list.some(e => e.channels.length > 0 && e.strong),
      channels: [...new Set(list.flatMap(e => e.channels))],
      general: w.allgemein.test(email.split("@")[0]),
      confirmedOnSite,
      unsuitable: !proof && list.some(e => e.reasons.some(r => HARD.includes(r) && r !== "source-invalid")),
      scope: (proof ?? list[0]).scope,
      reasons: [...new Set(list.flatMap(e => e.reasons))],
    };
  });
}

export type BaselineStatus = "role" | "general-confirmed" | "fallback-confirmed" | "unsuitable" | "not-attributable" | "not-found";
export type Verdict = "better" | "equivalent" | "worse" | "unresolved";
export type Outcome = "all-channels" | "some-channels" | "general-only" | "unresolved";

/** Preference among equally proven mailboxes: function mailbox, then named person, then others (for example webmaster). */
function preference(email: string, starkesPostfach: RegExp): number {
  const local = email.split("@")[0];
  if (starkesPostfach.test(local)) return 0;
  if (/^[a-zäöü]+[.-][a-zäöü]+$/i.test(local)) return 1;
  return 2;
}

/**
 * Grades the findings against the contacts already known. Never drops a proven
 * old contact silently, and keeps a confirmed old mailbox as fallback.
 */
export function selectAndCompare(mailboxes: Mailbox[], baselineRaw: string[], w: Rollenwerk) {
  const kanaele = w.rollen.map(r => r.kanal);
  const baseline = [...new Set(baselineRaw.map(e => e.trim().toLowerCase()).filter(e => e.includes("@")))];
  const byMail = new Map(mailboxes.map(x => [x.email, x]));
  const baselineStatus = baseline.map(email => {
    const x = byMail.get(email);
    const status: BaselineStatus = !x ? "not-found" : x.channels.length ? "role" : x.unsuitable ? "unsuitable"
      : x.confirmedOnSite ? (x.general ? "general-confirmed" : "fallback-confirmed") : "not-attributable";
    return { email, status, channels: x?.channels ?? [] };
  });
  const pick = (channel: string) => mailboxes.filter(x => x.channels.includes(channel))
    .sort((a, b) => Number(b.strong) - Number(a.strong) || preference(a.email, w.starkesPostfach) - preference(b.email, w.starkesPostfach) || a.email.localeCompare(b.email)).slice(0, 2).map(x => x.email);
  const proKanal = new Map(kanaele.map(k => [k, pick(k)]));
  // A confirmed old contact stays as fallback; it never blocks a proven improvement.
  const keptBaseline = baselineStatus.filter(b => b.status === "general-confirmed" || b.status === "fallback-confirmed").map(b => b.email);
  const general = keptBaseline.length ? keptBaseline
    : mailboxes.filter(x => x.general && x.confirmedOnSite && !x.unsuitable).sort((a, b) => a.email.localeCompare(b.email)).slice(0, 1).map(x => x.email);
  // Proven old role contacts always stay: good existing contacts are never dropped silently.
  const keptRoles = baselineStatus.filter(b => b.status === "role").map(b => b.email);
  const selected = [...new Set([...kanaele.flatMap(k => proKanal.get(k)!), ...keptRoles, ...general])];
  const before = new Set(baselineStatus.flatMap(b => b.channels));
  const after = new Set(kanaele.filter(k => proKanal.get(k)!.length));
  const lost = baselineStatus.filter(b => b.status === "role" && !selected.includes(b.email)
    && !b.channels.every(ch => after.has(ch))).map(b => b.email);
  const gainedChannels = [...after].filter(ch => !before.has(ch));
  let verdict: Verdict;
  let reason: string;
  if (lost.length) { verdict = "worse"; reason = `proven old contact dropped: ${lost.join(", ")}`; }
  else if (gainedChannels.length) { verdict = "better"; reason = `newly proven: ${gainedChannels.join("+")}`; }
  else if (after.size) { verdict = "equivalent"; reason = "same proven channels"; }
  else if (general.length && keptBaseline.length) { verdict = "equivalent"; reason = "general contact confirmed"; }
  else if (general.length) { verdict = baseline.length ? "unresolved" : "better"; reason = baseline.length ? "old contact not confirmed, new general contact found" : "first general contact"; }
  else if (!baseline.length) { verdict = "unresolved"; reason = mailboxes.length ? "no proven contact among found addresses" : "no contact in checked sources"; }
  else { verdict = "unresolved"; reason = "old contact not found in checked sources"; }
  const outcome: Outcome = after.size === kanaele.length ? "all-channels" : after.size ? "some-channels" : general.length ? "general-only" : "unresolved";
  return { baselineStatus, proKanal, general, selected, verdict, reason, outcome };
}
