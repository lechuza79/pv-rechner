import {newsletterLink, newsletterBatch, type NewsletterCampaign, type NewsletterVariant} from "./newsletter-metrics";
export type NewsletterMail = {campaign: NewsletterCampaign; variant: NewsletterVariant};
/** Only explicit link markers are rewritten. Sources, unsubscribe and account links stay untouched. */
export function prepareNewsletterMail(html: string, text: string, info: NewsletterMail, test: boolean) {
  const batch = newsletterBatch(info.campaign, info.variant);
  const found = new Set<string>();
  const replacements = new Map<string, string>();
  const output = html.replace(/<a\b[^>]*>/gi, tag => {
    const marker = tag.match(/data-newsletter-link="(bild|ort)"/);
    if (!marker) return tag;
    const href = tag.match(/href="([^"]+)"/);
    if (!href) throw new Error("Newsletter link is missing its destination");
    const raw = href[1].replace(/&amp;/g, "&");
    const url = newsletterLink(raw, {...info, placement: marker[1] as "bild" | "ort"}, test);
    found.add(marker[1]);
    replacements.set(raw, url);
    return tag.replace(href[0], `href="${url.replace(/&/g, "&amp;")}"`);
  });
  if (!found.has("bild") || !found.has("ort")) throw new Error("Newsletter needs explicitly marked image and municipality links");
  // One pass prevents a shorter municipality URL from rewriting an already marked image URL.
  text = text.replace(/https:\/\/solar-check\.io\/[^\s<>"']+/g, raw => replacements.get(raw) ?? raw);
  return {html: output, text, batch};
}
