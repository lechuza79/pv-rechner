import { readSupplementalSource } from "./contact-source-record";
import { pdfRegionSupported } from "./contact-pdf-region";
import { load } from "cheerio";
import { contactCandidates, type ContactCandidate } from "../../lib/contact-evidence";

export type OriginalRoleQuote = { url: string; sourceHtmlDigest: string; observationDigest?: string; quote: string };
export type ReviewContact = {
  email: string; url: string; quote: string; sourceHtmlDigest?: string;
  evidenceKind?: "exclusive-card" | "separately-reviewed" | "pdf-region";
  observationDigest?: string;
  sourcePdfDigest?: string;
  page?: number;
  region?: [number,number,number,number];
  roleSource?: OriginalRoleQuote;
  associationReason?: string;
};
type SourcePage = { url: string; finalUrl: string; candidates: ContactCandidate[] };

/** Read only an integrity-checked original from this municipality's evidence store. */
function original(directory: string, organizationId: string, url: string, digest: string, observationDigest?: string): string | null {
  return readSupplementalSource(directory, organizationId, url, digest, 'html', observationDigest)?.toString('utf8') ?? null;
}

/** Verify the separately cited text, not the reviewer's semantic association.
 * A real heading or paragraph can contain a responsibility while the mailbox is
 * published elsewhere. Neither proximity nor a matching name becomes an auto-role.
 */
function roleQuoteSupported(directory: string, organizationId: string, source: OriginalRoleQuote): boolean {
  if (typeof source?.quote !== "string" || source.quote.trim().length < 20 || source.quote.length > 600) return false;
  const html = original(directory, organizationId, source.url, source.sourceHtmlDigest, source.observationDigest);
  if (html === null) return false;
  const $ = load(html, { scriptingEnabled: false });
  $("script,style,nav,header,footer,aside,[hidden],[aria-hidden='true']").remove();
  $("[style]").each((_, el) => {
    if (/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:!important)?\s*(?:;|$)/i.test($(el).attr("style") ?? "")) $(el).remove();
  });
  $("br").replaceWith(" ");
  $("h1,h2,h3,h4,h5,h6,p,li,td,address,article,section,div").each((_, el) => { $(el).before(" "); $(el).after(" "); });
  const quote = source.quote.replace(/\s+/g, " ").trim();
  // Validate the cited publication, not the publisher's choice of HTML wrapper.
  // Legacy CMS pages may place their entire imprint inside a span or body text.
  // The association to the mailbox remains the explicit reviewer's decision.
  return $("body").text().replace(/\s+/g, " ").trim().includes(quote);
}

/** Validate source integrity for an explicit contextual review, never suitability.
 * Default evidence remains an exclusive card. A separately reviewed association
 * needs an original published address, a second original quotation and an explicit reviewer
 * explanation. It never changes automatic contact roles or grants dispatch.
 */
export function reviewContactSupported(directory: string, organizationId: string, pages: SourcePage[], contact: ReviewContact): boolean {
  if (typeof contact?.quote !== "string" || contact.quote.trim().length <= 10 || typeof contact.url !== "string") return false;
  const mode = contact.evidenceKind ?? "exclusive-card";
  if (mode === 'pdf-region') {
    if (!contact.sourcePdfDigest || contact.page === undefined || !contact.region || contact.sourceHtmlDigest || contact.roleSource) return false;
    return pdfRegionSupported(directory, organizationId, { ...contact, sourcePdfDigest: contact.sourcePdfDigest, page: contact.page, region: contact.region });
  }
  if (contact.sourcePdfDigest || contact.page !== undefined || contact.region !== undefined) return false;
  if (!["exclusive-card", "separately-reviewed"].includes(mode)) return false;
  if (contact.roleSource !== undefined && !roleQuoteSupported(directory, organizationId, contact.roleSource)) return false;
  if (mode === "separately-reviewed" && (!contact.sourceHtmlDigest || !contact.roleSource || contact.quote !== contact.email ||
    typeof contact.associationReason !== "string" || contact.associationReason.trim().length < 40)) return false;
  const supports = (candidates: ContactCandidate[]) => candidates.some(candidate =>
    candidate.email === contact.email && !candidate.sourceConflicts?.length && (mode === "separately-reviewed" || [candidate.roleEvidence, ...(candidate.additionalRoleEvidence ?? [])]
      .some(evidence => evidence?.exclusiveAddress && evidence.text.includes(contact.quote))));
  if (contact.sourceHtmlDigest === undefined) {
    return pages.some(page => (page.url === contact.url || page.finalUrl === contact.url) && supports(page.candidates));
  }
  const html = original(directory, organizationId, contact.url, contact.sourceHtmlDigest, contact.observationDigest);
  return html !== null && supports(contactCandidates(html, contact.url, new URL(contact.url).hostname));
}
