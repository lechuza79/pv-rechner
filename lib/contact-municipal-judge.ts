/**
 * Municipal contact judgement, second generation (17.09.2026).
 *
 * Replaces three rules of the first automatic review that blocked almost every
 * municipality (10.741 of 10.747 "unresolved"):
 *  1. Scope: an explicit "Stadt X" in the card was mandatory. Now the municipality's
 *     own website plus its institutional mail domain is enough; shared
 *     administrations are confirmed through the official GV100 membership.
 *  2. Role: the heading above an address was never read. Now the nearest content
 *     heading counts if no other address sits between heading and address.
 *  3. Completion: any unread link or PDF kept a case open forever, and an
 *     unprovable general mailbox blocked every proven improvement. Now a bounded
 *     search ends in a fixed state, and a confirmed general mailbox is kept as
 *     fallback instead of blocking.
 * Mailbox spelling is never proof of a role; it only orders equally proven candidates.
 */
import { evidenceLimitations } from "./contact-quality-evidence";
import type { ContactCandidate } from "./contact-evidence";
import { hasSharedAdministration, type Gemeindeverband } from "./gemeindeverband";
export { headingContext } from "./contact-heading-context";

export type Channel = "energy" | "press";
export type Municipality = { ags: string; name: string; website: string | null; verband?: Gemeindeverband };
export type SourceRef = { url: string; digest: string; valid: boolean; title?: string };
export type Evidence = {
  email: string; url: string; digest: string; block: string; headings: string[];
  reasons: string[]; rawChannels: Channel[]; channels: Channel[]; scope: string;
  /** Own title or function mailbox, as opposed to a person merely listed in a department with that name. */
  strong: boolean;
};

const stripMail = (t: string) => t.replace(/[\w.+%-]+\s*(?:@|\(at\)|\[at\])\s*[\w.-]+/giu, "");
export const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
/** German municipal sites use plain second-level domains; two labels are the registrable part. */
export const siteOf = (h: string) => h.split(".").slice(-2).join(".");
const fold = (t: string) => t.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z]/g, "");

export const ENERGY_TEXT = /klima(?:schutz)?manage?ment|klima(?:schutz)?manager\w*|klimaschutz(?:manage?ment|manager\w*|beauftragte?\w*|koordinat\w*|stelle|referat|leitstelle|büro|agentur)|energie(?:manage?ment|manager\w*|beratung|beauftragte?\w*|agentur)|energie[- ,&und]+klimaschutz|klimaschutz[- ,&und]+energie|(?:koordinationsstelle|leitstelle|stabsstelle|sachgebiet|abteilung|referat)\s+(?:für\s+)?klimaschutz/iu;
export const PRESS_TEXT = /presse(?:stelle|sprecher\w*|referat|arbeit|kontakt|amt|büro|anfragen|auskünfte|abteilung)|öffentlichkeitsarbeit|oeffentlichkeitsarbeit|unternehmenskommunikation|(?:referat|stabsstelle|abteilung|amt|team|fachbereich|fachdienst|sachgebiet)\s+(?:für\s+)?(?:presse|kommunikation)\b|presse[- ,&und]+(?:kommunikation|medien|marketing)/iu;
const LEAD = "(?:(?:ihr(?:e)? )?(?:kontakt|ansprechpartner\\S*)[: ]+(?:zum |zur |für (?:die )?)?)?";
const ENERGY_HEAD = new RegExp(`^${LEAD}(?:klimaschutz\\S*|energie\\S*|klima und energie|umwelt- und klimaschutz|klima- und umweltschutz|(?:koordinationsstelle|leitstelle|stabsstelle|sachgebiet|abteilung|referat|team) (?:für )?klimaschutz\\S*)$`, "iu");
const PRESS_HEAD = new RegExp(`^${LEAD}(?:presse\\S*|pressekontakt|pressestelle|presse und medien|kontakt für presse und medien|öffentlichkeitsarbeit|presse- und öffentlichkeitsarbeit)$`, "iu");
const EXCLUDED = /datenschutzbeauftrag|technische umsetzung|webdesign|dienstleister|agentur für|anzeigenverkauf|gastredner|partnerstadt|hausmeister|gebäudereinigung/iu;
/** Titles that make the role the person's own responsibility. */
const OWN_TITLE = /pressesprecher\w*|leit(?:ung|er\w*)|klima(?:schutz)?manager\w*|energiemanager\w*|beauftragte?\w*|koordinator\w*|referent\w* für (?:presse|öffentlichkeit)/iu;
const HISTORICAL = /ehemalig|nicht (?:mehr )?zuständig|nicht mehr erreichbar|außer dienst|\ba\.\s?d\./iu;
/** A block naming another unit must not inherit a department heading from above. */
const OTHER_UNIT = /bauhof|standesamt|bürgerbüro|buergerbuero|stadtkasse|gemeindekasse|ordnungsamt|bauamt|friedhof|bücherei|bibliothek|schule|kita|notfäll|museum|archiv|theater|volkshochschule|passamt|meldeamt|einwohnermelde|vermietung/iu;

/**
 * A role word counts only as the person's unit or title, not as one item in a
 * longer list of duties or departments. Measured on the full run (18.09.2026):
 * archive, passport office, room letting and a museum were selected as press
 * contacts because "Öffentlichkeitsarbeit" was the fifth item of their duties.
 */
function roleAsOwnUnit(text: string, role: RegExp): "title" | "unit" | false {
  const segments = text.split(/\s*(?:[,;•·|\n]| \/ | – )\s*/u).map(t => t.trim()).filter(t => t.length > 1);
  const hits = segments.map((t, i) => [t, i] as const).filter(([t]) => role.test(t));
  if (!hits.length) return false;
  if (hits.some(([t]) => OWN_TITLE.test(t))) return "title";
  return segments.length < 4 || hits.some(([, i]) => i < 2) ? "unit" : false;
}
const NEWS_PATH = /\/(?:news|aktuelles|nachrichten|pressemitteilung\w*|presseinformation\w*|kalender|veranstaltung\w*|termine)(?:\/|$)/i;
export const GENERAL_MAILBOX = /^(info|kontakt|rathaus|poststelle|post|gemeinde|stadt|stadtverwaltung|gemeindeverwaltung|verwaltung|buergerbuero|buergerservice|zentrale|mail|amt|vg|sg|verbandsgemeinde|samtgemeinde|amtsverwaltung|service|servicecenter|office)$/i;
/** Hard reasons: no fallback use either. */
const HARD = ["source-invalid", "published-address-conflict", "excluded-purpose", "historical-or-negated"];

export function judgeEvidence(c: ContactCandidate, headings: string[], src: SourceRef, m: Municipality, asOf: string): Evidence {
  const reasons: string[] = [];
  const own = siteOf(host(m.website ?? ""));
  if (!src.valid) reasons.push("source-invalid");
  if (!own || siteOf(host(src.url)) !== own) reasons.push("source-not-official-site");
  if (!own || siteOf(c.email.split("@")[1] ?? "") !== own) reasons.push("mailbox-foreign-domain");
  if (c.sourceConflicts?.length) reasons.push("published-address-conflict");
  const blocks = [c.roleEvidence, ...(c.additionalRoleEvidence ?? [])].filter(e => e?.exclusiveAddress).map(e => e!.text);
  const block = blocks.join(" || ");
  const general = GENERAL_MAILBOX.test(c.email.split("@")[0]);
  const near = (t: string) => {
    const i = t.toLowerCase().indexOf(c.email.toLowerCase());
    return i < 0 ? "" : t.slice(Math.max(0, i - 150), i + c.email.length + 150);
  };
  // Role text: exclusive blocks only, sibling-department lists cut off, long blocks only near the address.
  const roleText = stripMail(blocks.map(t => {
    const own = t.split(/(?:zugehörige|übergeordnete|weitere)\s+abteilungen/iu)[0];
    return own.length <= 400 && !general ? own : near(own) || (general ? "" : own.slice(0, 400));
  }).join(" || "));
  // The town hall mailbox sits next to web agency credits in every imprint; only its purpose can exclude it.
  if (c.purpose === "excluded" || (!general && EXCLUDED.test(stripMail(block.length <= 400 ? block : near(block))))) reasons.push("excluded-purpose");
  if (HISTORICAL.test(stripMail(block))) reasons.push("historical-or-negated");
  const limits = evidenceLimitations(block, src.url, { asOf }, c.publishedAt);
  reasons.push(...limits.filter(r => r !== "dated-source-needs-current-confirmation"));
  let path = "";
  try { path = new URL(src.url).pathname; } catch { /* invalid URL already flagged */ }
  const footerish = /impressum/i.test(block) && /datenschutz/i.test(block);
  const usable = general || footerish || NEWS_PATH.test(path) || OTHER_UNIT.test(stripMail(block)) ? [] :
    headings.map(h => h.split(" | ")[0].trim()).filter(h => h.length > 0 && h.length <= 60 && !/\d/.test(h));
  const rawChannels: Channel[] = [];
  // Another unit named in the card (archive, museum, passport office) keeps only an explicit own title.
  const otherUnit = OTHER_UNIT.test(roleText);
  const fromText = (role: RegExp) => { const found = roleAsOwnUnit(roleText, role); return found === "title" || (found === "unit" && !otherUnit); };
  if (!general && (fromText(ENERGY_TEXT) || usable.some(h => ENERGY_HEAD.test(h)))) rawChannels.push("energy");
  if (!general && (fromText(PRESS_TEXT) || usable.some(h => PRESS_HEAD.test(h)))) rawChannels.push("press");
  if (rawChannels.length && limits.includes("dated-source-needs-current-confirmation")) reasons.push("dated-source");
  const local = c.email.split("@")[0];
  const strong = /presse|klima|energie|kommunikation|oeffentlich/i.test(local) || OWN_TITLE.test(roleText) || (usable.length > 0 && !/\|/.test(block));
  return { email: c.email, url: src.url, digest: src.digest, block: block.slice(0, 500), headings: headings.map(h => h.slice(0, 160)),
    reasons, rawChannels, channels: reasons.length ? [] : rawChannels, scope: "municipality", strong };
}

/**
 * Shared administration: the official association's website is accepted when a
 * page title or the domain names the association; its institutional mail domain
 * when three or more distinct addresses use it there, or the domain names the
 * association or the municipality's own site.
 */
export function applyAdministration(evidence: Evidence[], titles: Map<string, string>, m: Municipality): Evidence[] {
  const shared = hasSharedAdministration(m.verband);
  const tokens = shared ? (m.verband!.verbandName ?? "").split(/[\s,()/-]+/).map(fold)
    .filter(w => w.length >= 5 && !/^(verbands|samt|gemeinde|verwaltung|stadt)/.test(w)) : [];
  const own = siteOf(host(m.website ?? ""));
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
  // A county or region publishing on the town's portal is a different authority.
  const otherAuthority = (d: string) => /kreis|region|bezirk|lra|landratsamt/.test(fold(d)) && !tokens.some(w => fold(d).includes(w));
  const ownVariant = (d: string) => ownToken.length >= 4 && new RegExp(`^(?:stadt|gemeinde|markt|flecken)?${ownToken}(?:stadt|gemeinde)?$`).test(fold(d.split(".")[0] ?? ""));
  const institutional = new Set([...perDomain].filter(([d, set]) => !otherAuthority(d) && (set.size >= 3
    || ownVariant(d)
    || tokens.some(w => fold(d).includes(w)))).map(([d]) => d));
  return evidence.map(e => {
    const site = siteOf(host(e.url));
    const domain = siteOf(e.email.split("@")[1] ?? "");
    const reasons = e.reasons.filter(r =>
      !(r === "source-not-official-site" && adminSites.has(site)) &&
      !(r === "mailbox-foreign-domain" && (institutional.has(domain) || (shared && tokens.some(w => fold(domain).includes(w))))));
    const viaAdmin = shared && (adminSites.has(site) || (domain !== own && institutional.has(domain)));
    return { ...e, reasons, channels: reasons.length ? [] : e.rawChannels,
      scope: viaAdmin ? `shared-administration:${m.verband!.verbandName}` : "municipality" };
  });
}

export type Mailbox = { email: string; strong: boolean; channels: Channel[]; general: boolean; confirmedOnSite: boolean; unsuitable: boolean; scope: string; proof: Evidence | null; reasons: string[] };

export function consolidate(evidence: Evidence[]): Mailbox[] {
  const byMail = new Map<string, Evidence[]>();
  for (const e of evidence) byMail.set(e.email, [...(byMail.get(e.email) ?? []), e]);
  return [...byMail].map(([email, list]) => {
    const proof = list.find(e => e.channels.length) ?? null;
    const confirmedOnSite = list.some(e => !e.reasons.some(r => r === "source-not-official-site" || r === "mailbox-foreign-domain" || r === "source-invalid"));
    return {
      email, proof, strong: list.some(e => e.channels.length > 0 && e.strong),
      channels: [...new Set(list.flatMap(e => e.channels))],
      general: GENERAL_MAILBOX.test(email.split("@")[0]),
      confirmedOnSite,
      unsuitable: !proof && list.some(e => e.reasons.some(r => HARD.includes(r) && r !== "source-invalid")),
      scope: (proof ?? list[0]).scope,
      reasons: [...new Set(list.flatMap(e => e.reasons))],
    };
  });
}

export type BaselineStatus = "role" | "general-confirmed" | "fallback-confirmed" | "unsuitable" | "not-attributable" | "not-found";
export type Verdict = "better" | "equivalent" | "worse" | "unresolved";
export type Outcome = "both-channels" | "one-channel" | "general-only" | "unresolved";

/** Preference among equally proven mailboxes: function mailbox, then named person, then others (for example webmaster). */
function preference(email: string): number {
  const local = email.split("@")[0];
  if (/presse|klima|energie|kommunikation|oeffentlich|öffentlich/i.test(local)) return 0;
  if (/^[a-zäöü]+[.-][a-zäöü]+$/i.test(local)) return 1;
  return 2;
}

export function selectAndCompare(mailboxes: Mailbox[], baselineRaw: string[]) {
  const baseline = [...new Set(baselineRaw.map(e => e.trim().toLowerCase()).filter(e => e.includes("@")))];
  const byMail = new Map(mailboxes.map(x => [x.email, x]));
  const baselineStatus = baseline.map(email => {
    const x = byMail.get(email);
    const status: BaselineStatus = !x ? "not-found" : x.channels.length ? "role" : x.unsuitable ? "unsuitable"
      : x.confirmedOnSite ? (x.general ? "general-confirmed" : "fallback-confirmed") : "not-attributable";
    return { email, status, channels: x?.channels ?? [] };
  });
  const pick = (channel: Channel) => mailboxes.filter(x => x.channels.includes(channel))
    .sort((a, b) => Number(b.strong) - Number(a.strong) || preference(a.email) - preference(b.email) || a.email.localeCompare(b.email)).slice(0, 2).map(x => x.email);
  const energy = pick("energy");
  const press = pick("press");
  // A confirmed old contact stays as fallback; it never blocks a proven improvement.
  const keptBaseline = baselineStatus.filter(b => b.status === "general-confirmed" || b.status === "fallback-confirmed").map(b => b.email);
  const general = keptBaseline.length ? keptBaseline
    : mailboxes.filter(x => x.general && x.confirmedOnSite && !x.unsuitable).sort((a, b) => a.email.localeCompare(b.email)).slice(0, 1).map(x => x.email);
  // Proven old role contacts always stay: good existing contacts are never dropped silently.
  const keptRoles = baselineStatus.filter(b => b.status === "role").map(b => b.email);
  const selected = [...new Set([...energy, ...press, ...keptRoles, ...general])];
  const before = new Set(baselineStatus.flatMap(b => b.channels));
  const after = new Set<Channel>([...(energy.length ? ["energy" as const] : []), ...(press.length ? ["press" as const] : [])]);
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
  const outcome: Outcome = energy.length && press.length ? "both-channels" : energy.length || press.length ? "one-channel" : general.length ? "general-only" : "unresolved";
  return { baselineStatus, energy, press, general, selected, verdict, reason, outcome };
}
