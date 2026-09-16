import { evidenceLimitations, officialMunicipalContact, type ContactAssessmentOptions } from "./contact-quality-evidence";
import { contactDepartments, contactPurpose, type ContactCandidate } from "./contact-evidence";
import type { ContactDataset } from "./contact-discovery";

export type ContactRole = "climate-environment" | "energy" | "communications" | "editorial" | "management" | "commercial" | "general" | "network-service" | "customer-service" | "advertising" | "privacy" | "unknown";
export type AssessedContact = {
  email: string; role: ContactRole; suitability: "role-indicated" | "general-fallback" | "not-target-role" | "needs-review";
  attribution: "same-domain" | "official-source" | "unconfirmed"; reviewReasons: string[]; evidence: { sourceUrl: string; text: string }[];
};
const wanted: Record<ContactDataset, ContactRole[]> = {
  kommunen: ["climate-environment", "energy", "communications"],
  fachbetriebe: ["management", "commercial"],
  presse: ["editorial"],
  versorger: ["communications", "commercial", "management"],
};

/** Relevance is separate from identity and reachability. No automatic sending. */
export function assessContacts(candidates: ContactCandidate[], dataset: ContactDataset, options: ContactAssessmentOptions = {}): AssessedContact[] {
  const grouped = new Map<string, ContactCandidate[]>();
  for (const c of candidates) grouped.set(c.email, [...(grouped.get(c.email) ?? []), c]);
  return [...grouped].map(([email, observations]) => {
    const sourceConflict = observations.some(c => c.sourceConflicts?.length);
    const evidence = observations.flatMap(c => [c.roleEvidence, ...(c.additionalRoleEvidence ?? [])]
      .filter(e => e?.exclusiveAddress).map(e => ({sourceUrl:c.sourceUrl, text:e!.text, publishedAt:c.publishedAt})));
    const limitations = evidence.flatMap(e=>evidenceLimitations(e.text,e.sourceUrl,options,e.publishedAt));
    const usableEvidence = evidence.filter(e=>!evidenceLimitations(e.text,e.sourceUrl,options,e.publishedAt).length);
    const usableObservations = observations.filter(c=>!evidenceLimitations(c.roleEvidence?.text ?? c.context,c.sourceUrl,options,c.publishedAt).length);
    const roles = new Set<ContactRole>();
    for (const e of usableEvidence) {
      for (const department of contactDepartments(e.text)) {
        // Regulatory communication is not public relations. A statutory
        // representative in an imprint does not establish mailbox ownership.
        if (department === "communications" && /regulierung|bundesnetzagentur/iu.test(e.text)) continue;
        if (department === "management" && /impressum|imprint/i.test(new URL(e.sourceUrl).pathname)) continue;
        roles.add(department as ContactRole);
      }
      if (dataset === "presse" && /pressemitteilungen|redaktionelle (?:beiträge|inhalte)|redaktioneller kontakt/iu.test(e.text)) roles.add("editorial");
      if (/anzeigen(?:verkauf|beratung|leitung|abteilung)?|media(?:beratung|verkauf)|ad sales/iu.test(e.text)) roles.add("advertising");
      if (/vertrieb|sales|marketing/iu.test(e.text)) roles.add("commercial");
      if (/datenschutzbeauftrag|data protection officer/iu.test(e.text)) roles.add("privacy");
    }
    // Mailbox names may establish a function, but never turn press relations
    // into a newsroom, or advertising sales into an editorial contact.
    // Negative responsibilities remain visible even on old evidence.
    for (const e of evidence) {
      if (/datenschutzbeauftrag|data protection officer/iu.test(e.text)) roles.add("privacy");
      if (/anzeigen(?:verkauf|beratung|leitung|abteilung)|ad sales/iu.test(e.text)) roles.add("advertising");
    }
    const purpose = contactPurpose(email);
    if (purpose === "excluded") roles.add("privacy");
    if (usableObservations.length && /^(redaktion|newsroom)([._-]|@)/i.test(email)) roles.add("editorial");
    if (usableObservations.length && /^(presse|pressestelle|kommunikation)([._-]|@)/i.test(email)) roles.add("communications");
    if (usableObservations.length && /^(klimaschutz|umwelt)([._-]|@)/i.test(email)) roles.add("climate-environment");
    if (usableObservations.length && purpose === "sales") roles.add("commercial");
    const attribution: AssessedContact["attribution"] = observations.some(c => c.relation === "same-domain") ? "same-domain" : dataset === "kommunen" && observations.some(c=>officialMunicipalContact(c,options)) ? "official-source" : "unconfirmed";
    const excluded = ["privacy", "advertising", "network-service", "customer-service"] as const;
    const negative = excluded.find(role => roles.has(role));
    const positive = wanted[dataset].find(role => roles.has(role));
    // Conflicting roles remain reviewable, including a shared contact card.
    const role: ContactRole = negative ?? positive ?? [...roles][0] ?? (purpose === "general" ? "general" : "unknown");
    const suitability: AssessedContact["suitability"] = sourceConflict ? "needs-review" : negative && positive ? "needs-review" : negative ? "not-target-role" :
      attribution === "unconfirmed" ? "needs-review" : positive ? "role-indicated" : (role === "general" || attribution === "official-source") ? "general-fallback" : "needs-review";
    const sources = evidence.length ? evidence : observations.map(c => ({ sourceUrl: c.sourceUrl, text: c.email }));
    return { email, role, suitability, attribution, reviewReasons: [...new Set([...limitations, ...(sourceConflict ? ['mail-link-label-mismatch'] : [])])], evidence: sources.filter((e, i) => sources.findIndex(other => other.sourceUrl === e.sourceUrl && other.text === e.text) === i) };
  }).sort((a,b) => {
    const rank = { "role-indicated": 0, "general-fallback": 1, "needs-review": 2, "not-target-role": 3 };
    return rank[a.suitability] - rank[b.suitability] ||
      (wanted[dataset].indexOf(a.role) < 0 ? 99 : wanted[dataset].indexOf(a.role)) - (wanted[dataset].indexOf(b.role) < 0 ? 99 : wanted[dataset].indexOf(b.role)) || a.email.localeCompare(b.email);
  });
}

export function contactQuality(candidates: ContactCandidate[], dataset: ContactDataset, gaps: string[] = [], options: ContactAssessmentOptions = {}) {
  const contacts = assessContacts(candidates, dataset, options);
  return {
    contacts,
    status: contacts.some(c => c.suitability === "role-indicated") ? "role-indicated" : contacts.some(c => c.suitability === "general-fallback") ? "general-only" : contacts.length ? "review-required" : "no-contact-observed",
    gaps: [...new Set([...gaps, ...(!contacts.some(c => c.suitability === "role-indicated") ? ["target-role-not-established"] : []),
      ...(contacts.some(c => c.attribution === "unconfirmed") ? ["external-organization-attribution"] : [])])],
    // Reading every scheduled source does not prove that all public sources or
    // contacts were found. Syntax and source evidence cannot prove delivery.
    responsibilityVerification: "review-required" as const,
    completeness: "not-proven" as const,
    deliverability: "not-tested" as const,
  };
}
