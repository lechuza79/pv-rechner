import { contactUrl } from "./contact-discovery";
import type { ContactCandidate } from "./contact-evidence";

export type ContactRun = {
  dataset: string; organization_id?: string; id: string; partition?: string;
  status?: string; candidates: ContactCandidate[]; requests?: number;
  pages: { status: string }[];
};
export type ContactReference = {
  dataset: string; organization_id: string;
  // Positive anchors are deliberately not a claim to know every valid contact.
  contacts: { email: string; sourceUrls: string[]; department: string }[];
  rejectedEmails?: string[];
};
const key = (r: { dataset: string; organization_id?: string; id?: string }) => `${r.dataset}:${r.organization_id ?? r.id}`;
const emails = (r: ContactRun) => new Set(r.candidates.map(c => c.email.toLowerCase()));
const hit = (run: ContactRun, reference: ContactReference["contacts"][number]) => run.candidates.some(c =>
  c.email.toLowerCase() === reference.email.toLowerCase() && reference.sourceUrls.some(url => contactUrl(url) === contactUrl(c.sourceUrl)));

/** Paired comparisons only; unknown contacts never become false positives or verified gains. */
export function compareContactRuns(before: ContactRun[], after: ContactRun[], references: ContactReference[]) {
  const index = (runs: ContactRun[]) => {
    const map = new Map<string, ContactRun>();
    for (const run of runs) {
      if (map.has(key(run))) throw Error(`Duplicate organization: ${key(run)}. Select one run per organization.`);
      map.set(key(run), run);
    }
    return map;
  };
  const left = index(before), right = index(after);
  const refs = new Map<string, ContactReference>();
  for (const reference of references) {
    if (refs.has(key(reference))) throw Error(`Duplicate reference: ${key(reference)}`);
    for (const contact of reference.contacts) {
      if (!contact.email || !contact.department || !contact.sourceUrls.length || contact.sourceUrls.some(url => !contactUrl(url))) throw Error("Reference requires an email, department and public source URLs");
    }
    refs.set(key(reference), reference);
  }
  const cases = [...left].filter(([k]) => right.has(k)).map(([k, a]) => {
    const b = right.get(k)!; const ref = refs.get(k);
    const oldEmails = emails(a), newEmails = emails(b);
    const anchors = (ref?.contacts ?? []).map(c => ({ ...c, before: hit(a, c), after: hit(b, c) }));
    const rejected = (ref?.rejectedEmails ?? []).map(email => ({ email, before: oldEmails.has(email.toLowerCase()), after: newEmails.has(email.toLowerCase()) }));
    return { dataset: a.dataset, organization_id: a.organization_id ?? a.id, partition: a.partition ?? "unspecified",
      beforeHasCandidates: oldEmails.size > 0, afterHasCandidates: newEmails.size > 0,
      addedUnreviewed: [...newEmails].filter(email => !oldEmails.has(email) && !anchors.some(c => c.email.toLowerCase() === email && c.after)),
      removed: [...oldEmails].filter(email => !newEmails.has(email)), anchors, rejected,
      beforeRequests: a.requests ?? a.pages.length, afterRequests: b.requests ?? b.pages.length,
      afterStatus: b.status ?? "unspecified", afterFailedPages: b.pages.filter(p => p.status !== "read").length };
  });
  return { paired: cases.length, beforeOnly: [...left.keys()].filter(k => !right.has(k)), afterOnly: [...right.keys()].filter(k => !left.has(k)),
    referenceScope: "Manually checked positive anchors only; not full contact recall or precision",
    anchors: cases.flatMap(c => c.anchors).length,
    beforeAnchorHits: cases.flatMap(c => c.anchors).filter(c => c.before).length,
    afterAnchorHits: cases.flatMap(c => c.anchors).filter(c => c.after).length,
    lostAnchors: cases.flatMap(c => c.anchors).filter(c => c.before && !c.after).length,
    beforeRejectedHits: cases.flatMap(c => c.rejected).filter(c => c.before).length,
    afterRejectedHits: cases.flatMap(c => c.rejected).filter(c => c.after).length,
    cases };
}
