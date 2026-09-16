import { load } from "cheerio";
import { sameDomain, type ContactCandidate } from "./contact-evidence";

export type MunicipalSource = {
  url: string; finalUrl: string | null; observedAt: string; status: string;
  htmlDigest: string | null; pageIdentity: string; bodyText: string;
  candidates: ContactCandidate[]; error: string | null;
};
export type MunicipalVerdict = {
  email: string; status: "source-supported" | "published-fallback" | "needs-review" | "not-reconfirmed";
  reasons: string[]; role: string | null;
  evidence: {url: string; quote: string; observedAt: string; htmlDigest: string | null}[];
};
export function municipalPageText(html: string) {
  const $ = load(html);
  const pageIdentity = $("title,h1").toArray().map(el=>$(el).text()).join(" ").replace(/\s+/g," ").trim();
  $("script,style,nav,header,footer,aside").remove();
  return {pageIdentity, bodyText: $("body").text().replace(/\s+/g," ").trim()};
}
const cleanName = (s: string) => s.normalize("NFKC").toLowerCase().replace(/^(stadt|gemeinde|markt|flecken)\s+/u, "").replace(/[^\p{L}\p{N}]+/gu," ").trim();
const explicitRoles: [string,RegExp][] = [
  ["communications", /pressestelle|öffentlichkeitsarbeit|oeffentlichkeitsarbeit|pressearbeit|webredaktion|internetredaktion|(?:redaktion|betreuung|administration)\s+(?:des?|der\s+)?\s*(?:amtsblatt|homepage|website)|amtsblattredaktion|social[- ]media/iu],
  ["climate-energy", /klimaschutz(?:manager|management|beauftrag|stelle)|klimaschutz\s*(?:und|&)\s*(?:energie|umwelt)|(?:sachgebiet|abteilung|fachbereich|zuständig\w*|ansprechpartner\w*)\s*[:–-]?\s*(?:für\s+)?(?:klimaschutz|photovoltaik|solar|energieberatung)|energieberatung|energiemanagement/iu],
];
/** Independent acceptance checks: never reuse discovery scores or mailbox-name hints. */
export function verifyMunicipalContacts(input: {
  name: string; website: string | null; emails: string[]; sources: MunicipalSource[];
  asOf: string; heldEmails?: string[];
}): MunicipalVerdict[] {
  let domain = "";
  try { domain = new URL(/^https?:/i.test(input.website ?? "") ? input.website! : `https://${input.website}`).hostname.replace(/^www\./,""); } catch { /* Missing identity stays unresolved. */ }
  const name = cleanName(input.name);
  const year = Number(input.asOf.slice(0,4));
  return [...new Set(input.emails.map(e=>e.toLowerCase()))].sort().map(email => {
    const evidence: MunicipalVerdict["evidence"] = [];
    const reasons = new Set<string>();
    const roles = new Set<string>();
    let published = false;
    let fallback = false;
    for (const source of input.sources) {
      const candidates = source.candidates.filter(c=>c.email===email);
      if (!candidates.length) continue;
      published = true;
      if (source.status !== "read") { reasons.add("source-not-fully-readable"); continue; }
      let official = false;
      try { official = !!domain && sameDomain(new URL(source.finalUrl ?? source.url).hostname.replace(/^www\./,""),domain); } catch { /* Invalid source. */ }
      if (!official) { reasons.add("source-outside-registered-municipal-domain"); continue; }
      const namedPage = name.length > 1 && (` ${cleanName(source.pageIdentity)} `).includes(` ${name} `);
      for (const candidate of candidates) {
        if (candidate.sourceConflicts?.length) { reasons.add('mail-link-label-mismatch'); continue; }
        const blocks = [candidate.roleEvidence,...(candidate.additionalRoleEvidence ?? [])].filter(b=>b?.exclusiveAddress);
        if (!blocks.length) reasons.add("no-exclusive-contact-card");
        for (const block of blocks) {
          const quote = block!.text;
          const roleText = quote.replace(/[\w.+%-]+@[\w-]+(?:\.[\w-]+)+/g,"");
          const namedCard = name.length > 1 && (` ${cleanName(quote)} `).includes(` ${name} `) && /stadt|gemeinde|verwaltung|rathaus/iu.test(quote);
          if (!namedPage && !namedCard) { reasons.add("municipality-not-established-in-page-or-card"); continue; }
          const oldYears = [...(candidate.publishedAt ?? "").matchAll(/\b(20\d{2})\b/g), ...source.url.matchAll(/(?:\/|[-_])(20\d{2})(?:\/|[-_.])/g), ...quote.matchAll(/\b(20\d{2})\b/g)].map(m=>Number(m[1]));
          if (oldYears.some(y=>y < year-1)) { reasons.add("old-source-or-project-period"); continue; }
          if (/datenschutz|widerspruch|widerruf|anzeigenverkauf|bewerbung|partnerstadt|partnergemeinde|gast|dienstleister/iu.test(roleText)) { reasons.add("incompatible-contact-context"); continue; }
          if (/anmeld|einreich|teilnahm/iu.test(roleText) && /veranstaltung|wettbewerb|aktionstag|preis|markt/iu.test(roleText)) { reasons.add("event-specific-context"); continue; }
          // An administrative mailbox on another domain needs a local authority card.
          if (!sameDomain(email.split("@")[1] ?? "",domain) && !namedCard) { reasons.add("external-mailbox-authority-unconfirmed"); continue; }
          const role = explicitRoles.find(([,pattern])=>pattern.test(roleText));
          if (role) roles.add(role[0]);
          else if (/gemeindeverwaltung|stadtverwaltung|rathaus|bürgermeister/iu.test(roleText)) fallback = true;
          else reasons.add("functional-responsibility-not-explicit");
          evidence.push({url:source.finalUrl ?? source.url,quote,observedAt:source.observedAt,htmlDigest:source.htmlDigest});
        }
      }
    }
    if (input.heldEmails?.includes(email)) reasons.add("documented-review-hold");
    const conflict = reasons.has('mail-link-label-mismatch') || reasons.has("documented-review-hold") || reasons.has("incompatible-contact-context") || reasons.has("old-source-or-project-period") || reasons.has("event-specific-context");
    const status: MunicipalVerdict["status"] = !published ? "not-reconfirmed" : roles.size && !conflict ? "source-supported" : fallback && !conflict ? "published-fallback" : "needs-review";
    if (!published) reasons.add(input.sources.some(s=>s.status!=="read") ? "unread-sources-no-negative-conclusion" : "absent-from-checked-sources");
    return {email,status,reasons:[...reasons],role:roles.values().next().value ?? null,evidence};
  });
}
