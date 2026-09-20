/**
 * The municipal configuration of the general contact search (lib/kontakt-suche.ts).
 *
 * The engine there decides scope, role and comparison; this file says what
 * "role" means for a municipality (climate protection / energy management and
 * press / public relations), which surroundings disqualify a block, and how a
 * shared administration is recognised.
 *
 * It replaced three rules of the first automatic review that blocked almost
 * every municipality (10.741 of 10.747 "unresolved"):
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
import type { ContactCandidate } from "./contact-evidence";
import { hasSharedAdministration, type Gemeindeverband } from "./gemeindeverband";
import {
  applyScope, consolidate as consolidateAllgemein, fold, judgeEvidence as judgeAllgemein,
  selectAndCompare as selectAllgemein, type Evidence, type Mailbox, type Rollenwerk, type ScopeRegeln, type SourceRef,
} from "./kontakt-suche";

export { headingContext, host, roleAsOwnUnit, siteOf } from "./kontakt-suche";
export type { BaselineStatus, Evidence, Mailbox, SourceRef, Verdict } from "./kontakt-suche";

export type Channel = "energy" | "press";
export type Outcome = "both-channels" | "one-channel" | "general-only" | "unresolved";
export type Municipality = { ags: string; name: string; website: string | null; verband?: Gemeindeverband };

export const ENERGY_TEXT = /klima(?:schutz)?manage?ment|klima(?:schutz)?manager\w*|klimaschutz(?:manage?ment|manager\w*|beauftragte?\w*|koordinat\w*|stelle|referat|leitstelle|büro|agentur)|energie(?:manage?ment|manager\w*|beratung|beauftragte?\w*|agentur)|energie[- ,&und]+klimaschutz|klimaschutz[- ,&und]+energie|(?:koordinationsstelle|leitstelle|stabsstelle|sachgebiet|abteilung|referat)\s+(?:für\s+)?klimaschutz/iu;
export const PRESS_TEXT = /presse(?:stelle|sprecher\w*|referat|arbeit|kontakt|amt|büro|anfragen|auskünfte|abteilung)|öffentlichkeitsarbeit|oeffentlichkeitsarbeit|unternehmenskommunikation|(?:referat|stabsstelle|abteilung|amt|team|fachbereich|fachdienst|sachgebiet)\s+(?:für\s+)?(?:presse|kommunikation)\b|presse[- ,&und]+(?:kommunikation|medien|marketing)/iu;
const LEAD = "(?:(?:ihr(?:e)? )?(?:kontakt|ansprechpartner\\S*)[: ]+(?:zum |zur |für (?:die )?)?)?";
const ENERGY_HEAD = new RegExp(`^${LEAD}(?:klimaschutz\\S*|energie\\S*|klima und energie|umwelt- und klimaschutz|klima- und umweltschutz|(?:koordinationsstelle|leitstelle|stabsstelle|sachgebiet|abteilung|referat|team) (?:für )?klimaschutz\\S*)$`, "iu");
const PRESS_HEAD = new RegExp(`^${LEAD}(?:presse\\S*|pressekontakt|pressestelle|presse und medien|kontakt für presse und medien|öffentlichkeitsarbeit|presse- und öffentlichkeitsarbeit)$`, "iu");
export const GENERAL_MAILBOX = /^(info|kontakt|rathaus|poststelle|post|gemeinde|stadt|stadtverwaltung|gemeindeverwaltung|verwaltung|buergerbuero|buergerservice|zentrale|mail|amt|vg|sg|verbandsgemeinde|samtgemeinde|amtsverwaltung|service|servicecenter|office)$/i;

/** What a role, an exclusion and a general mailbox mean in a municipal administration. */
export const KOMMUNEN_ROLLENWERK: Rollenwerk = {
  rollen: [
    { kanal: "energy", text: ENERGY_TEXT, heading: ENERGY_HEAD },
    { kanal: "press", text: PRESS_TEXT, heading: PRESS_HEAD },
  ],
  eigenerTitel: /pressesprecher\w*|leit(?:ung|er\w*)|klima(?:schutz)?manager\w*|energiemanager\w*|beauftragte?\w*|koordinator\w*|referent\w* für (?:presse|öffentlichkeit)/iu,
  ausgeschlossen: /datenschutzbeauftrag|technische umsetzung|webdesign|dienstleister|agentur für|anzeigenverkauf|gastredner|partnerstadt|hausmeister|gebäudereinigung/iu,
  fremdeEinheit: /bauhof|standesamt|bürgerbüro|buergerbuero|stadtkasse|gemeindekasse|ordnungsamt|bauamt|friedhof|bücherei|bibliothek|schule|kita|notfäll|museum|archiv|theater|volkshochschule|passamt|meldeamt|einwohnermelde|vermietung|haustechnik/iu,
  // Elected council members publish mailboxes on the town site with their committee
  // "Referat: Energie und Klimaschutz" — a political office, not the administration
  // (Wolfertschwenden, found in the hand review of 19.09.2026).
  nichtDieVerwaltung: {
    text: /fraktion|wählergruppe|waehlergruppe|ortsverband|ratsmitglied|gemeinderatsmitglied|stadtratsmitglied|\bbündnis 90\b|\b(?:cdu|csu|spd|fdp|afd)\b|freie wähler/iu,
    pfad: /\/(?:gemeinderat|stadtrat|ortsgemeinderat|fraktionen?)(?:\/|$)/i,
  },
  allgemein: GENERAL_MAILBOX,
  starkesPostfach: /presse|klima|energie|kommunikation|oeffentlich|öffentlich/i,
};

export const KOMMUNEN_SCOPE: ScopeRegeln = {
  // A county or region publishing on the town's portal is a different authority.
  fremdeBehoerde: /kreis|region|bezirk|lra|landratsamt/,
  // Municipal companies carry the town name but are not the administration (hameln-tourismus.de).
  eigenbetrieb: /touris|marketing|stadtwerk|werke|gmbh|messe|hafen|kultur|verkehrsverein|wirtschaftsfoerder/,
  namensvarianten: /stadt|gemeinde|markt|flecken/,
};

export function judgeEvidence(c: ContactCandidate, headings: string[], src: SourceRef, m: Municipality, asOf: string): Evidence {
  const e = judgeAllgemein(c, headings, src, { id: m.ags, name: m.name, website: m.website }, asOf, KOMMUNEN_ROLLENWERK);
  return { ...e, scope: "municipality" };
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
  const verbund = shared ? { name: m.verband!.verbandName ?? "", tokens } : null;
  return applyScope(evidence, titles, { id: m.ags, name: m.name, website: m.website }, verbund, KOMMUNEN_SCOPE)
    .map(e => ({ ...e, scope: e.scope === "organisation" ? "municipality" : e.scope }));
}

export function consolidate(evidence: Evidence[]): Mailbox[] {
  return consolidateAllgemein(evidence, KOMMUNEN_ROLLENWERK);
}

export function selectAndCompare(mailboxes: Mailbox[], baselineRaw: string[]) {
  const r = selectAllgemein(mailboxes, baselineRaw, KOMMUNEN_ROLLENWERK);
  const energy = r.proKanal.get("energy") ?? [];
  const press = r.proKanal.get("press") ?? [];
  // The municipal names stay: the stored results and the contact list use them.
  const outcome: Outcome = r.outcome === "all-channels" ? "both-channels" : r.outcome === "some-channels" ? "one-channel" : r.outcome;
  return { baselineStatus: r.baselineStatus, energy, press, general: r.general, selected: r.selected, verdict: r.verdict, reason: r.reason, outcome };
}
