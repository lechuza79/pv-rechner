import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { load } from "cheerio";
import { contactCandidates, type ContactCandidate } from "../../lib/contact-evidence";

export type OriginalRoleQuote = { url: string; sourceHtmlDigest: string; quote: string };
export type ReviewContact = {
  email: string; url: string; quote: string; sourceHtmlDigest?: string;
  evidenceKind?: "exclusive-card" | "separately-reviewed";
  roleSource?: OriginalRoleQuote;
  associationReason?: string;
};
type SourcePage = { url: string; finalUrl: string; candidates: ContactCandidate[] };

/** Read only an integrity-checked original from this municipality's evidence store. */
function original(directory: string, organizationId: string, url: string, digest: string): string | null {
  if (!/^\d+$/.test(organizationId) || !/^[a-f0-9]{64}$/.test(digest)) return null;
  try {
    if (!["https:", "http:"].includes(new URL(url).protocol)) return null;
    const stem = resolve(directory, "supplemental", organizationId, digest);
    const metadata = JSON.parse(readFileSync(`${stem}.json`, "utf8"));
    const raw = readFileSync(`${stem}.html`);
    if (metadata.htmlDigest !== digest || createHash("sha256").update(raw).digest("hex") !== digest) return null;
    if (metadata.finalUrl !== url || !Number.isFinite(Date.parse(metadata.observedAt))) return null;
    return raw.toString("utf8");
  } catch { return null; }
}

/** Verify the separately cited text, not the reviewer's semantic association.
 * A real heading or paragraph can contain a responsibility while the mailbox is
 * published elsewhere. Neither proximity nor a matching name becomes an auto-role.
 */
function roleQuoteSupported(directory: string, organizationId: string, source: OriginalRoleQuote): boolean {
  if (typeof source?.quote !== "string" || source.quote.trim().length < 20 || source.quote.length > 600) return false;
  const html = original(directory, organizationId, source.url, source.sourceHtmlDigest);
  if (html === null) return false;
  const $ = load(html, { scriptingEnabled: false });
  $("script,style,nav,header,footer,aside,[hidden],[aria-hidden='true']").remove();
  $("[style]").each((_, el) => {
    if (/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:!important)?\s*(?:;|$)/i.test($(el).attr("style") ?? "")) $(el).remove();
  });
  $("br").replaceWith(" ");
  $("h1,h2,h3,h4,h5,h6,p,li,td,address,article,section,div").each((_, el) => { $(el).before(" "); $(el).after(" "); });
  const quote = source.quote.replace(/\s+/g, " ").trim();
  return $("h1,h2,h3,h4,h5,h6,p,li,td,address,article,section,div").toArray().some(el => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    return text.length <= 600 && text.includes(quote);
  });
}

/** Validate source integrity for an explicit contextual review, never suitability.
 * Default evidence remains an exclusive card. A separately reviewed association
 * needs an original published address, a second original quotation and an explicit reviewer
 * explanation. It never changes automatic contact roles or grants dispatch.
 */
export function reviewContactSupported(directory: string, organizationId: string, pages: SourcePage[], contact: ReviewContact): boolean {
  if (typeof contact?.quote !== "string" || contact.quote.trim().length <= 10 || typeof contact.url !== "string") return false;
  const mode = contact.evidenceKind ?? "exclusive-card";
  if (!["exclusive-card", "separately-reviewed"].includes(mode)) return false;
  if (contact.roleSource !== undefined && !roleQuoteSupported(directory, organizationId, contact.roleSource)) return false;
  if (mode === "separately-reviewed" && (!contact.sourceHtmlDigest || !contact.roleSource || contact.quote !== contact.email ||
    typeof contact.associationReason !== "string" || contact.associationReason.trim().length < 40)) return false;
  const supports = (candidates: ContactCandidate[]) => candidates.some(candidate =>
    candidate.email === contact.email && (mode === "separately-reviewed" || [candidate.roleEvidence, ...(candidate.additionalRoleEvidence ?? [])]
      .some(evidence => evidence?.exclusiveAddress && evidence.text.includes(contact.quote))));
  if (contact.sourceHtmlDigest === undefined) {
    return pages.some(page => (page.url === contact.url || page.finalUrl === contact.url) && supports(page.candidates));
  }
  const html = original(directory, organizationId, contact.url, contact.sourceHtmlDigest);
  return html !== null && supports(contactCandidates(html, contact.url, new URL(contact.url).hostname));
}
