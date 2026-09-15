import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { contactCandidates, type ContactCandidate } from "../../lib/contact-evidence";

export type ReviewContact = { email: string; url: string; quote: string; sourceHtmlDigest?: string };
type SourcePage = { url: string; finalUrl: string; candidates: ContactCandidate[] };

/** Bind supplemental quotations to original bytes, source identity and a local card.
 * Never trust caller-supplied paths or derived candidate/role fields in metadata.
 */
export function reviewContactSupported(directory: string, organizationId: string, pages: SourcePage[], contact: ReviewContact): boolean {
  if (typeof contact?.quote !== "string" || contact.quote.trim().length <= 10 || typeof contact.url !== "string") return false;
  const supports = (candidates: ContactCandidate[]) => candidates.some(candidate =>
    candidate.email === contact.email && [candidate.roleEvidence, ...(candidate.additionalRoleEvidence ?? [])]
      .some(evidence => evidence?.exclusiveAddress && evidence.text.includes(contact.quote)));
  if (contact.sourceHtmlDigest === undefined) {
    return pages.some(page => (page.url === contact.url || page.finalUrl === contact.url) && supports(page.candidates));
  }
  if (!/^\d+$/.test(organizationId) || !/^[a-f0-9]{64}$/.test(contact.sourceHtmlDigest)) return false;
  try {
    const stem = resolve(directory, "supplemental", organizationId, contact.sourceHtmlDigest);
    const metadata = JSON.parse(readFileSync(`${stem}.json`, "utf8"));
    const raw = readFileSync(`${stem}.html`);
    if (metadata.htmlDigest !== contact.sourceHtmlDigest || createHash("sha256").update(raw).digest("hex") !== contact.sourceHtmlDigest) return false;
    if (metadata.finalUrl !== contact.url || !Number.isFinite(Date.parse(metadata.observedAt))) return false;
    const url = new URL(contact.url);
    if (!["https:", "http:"].includes(url.protocol)) return false;
    return supports(contactCandidates(raw.toString("utf8"), contact.url, url.hostname));
  } catch {
    return false;
  }
}
