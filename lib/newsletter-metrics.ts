/** Public edition identifiers, shared by every recipient. Never accept arbitrary event names. */
export const NEWSLETTER_CAMPAIGNS = {"september-2026": {label: "September 2026", period: "2026-09", event: "newsletter_september_2026"}} as const;
export type NewsletterCampaign = keyof typeof NEWSLETTER_CAMPAIGNS;
export const NEWSLETTER_VARIANTS = ["kommunal", "allgemein"] as const;
export type NewsletterVariant = typeof NEWSLETTER_VARIANTS[number];
export const NEWSLETTER_ACTIONS = ["bild", "ort", "start"] as const;
export type NewsletterAction = typeof NEWSLETTER_ACTIONS[number];
export type NewsletterContext = {campaign: NewsletterCampaign; variant: NewsletterVariant; placement: "bild" | "ort"};
export const NEWSLETTER_START_EVENT = "sc:newsletter-playback";
export function newsletterEventName(campaign: string, variant: string, action: string): string | null {
  if (!Object.hasOwn(NEWSLETTER_CAMPAIGNS, campaign) || !NEWSLETTER_VARIANTS.includes(variant as NewsletterVariant) || !NEWSLETTER_ACTIONS.includes(action as NewsletterAction)) return null;
  return `${NEWSLETTER_CAMPAIGNS[campaign as NewsletterCampaign].event}_${variant}_${action}`;
}
export function newsletterContext(search: string): NewsletterContext | null {
  const q = new URLSearchParams(search);
  if (q.has("nl_test")) return null;
  for (const key of ["nl", "nlv", "nll"]) if (q.getAll(key).length !== 1) return null;
  const campaign = q.get("nl")!, variant = q.get("nlv")!, placement = q.get("nll")!;
  if (placement !== "bild" && placement !== "ort") return null;
  return newsletterEventName(campaign, variant, placement) ? {campaign: campaign as NewsletterCampaign, variant: variant as NewsletterVariant, placement} : null;
}
export function newsletterLink(raw: string, context: NewsletterContext, test = false): string {
  if (!newsletterEventName(context.campaign, context.variant, context.placement) || context.placement === ("start" as string)) throw new Error("Unknown newsletter link");
  const url = new URL(raw);
  if (url.origin !== "https://solar-check.io" || !(url.pathname === "/solar-atlas" || url.pathname.startsWith("/solar-atlas/"))) throw new Error("Newsletter links must lead directly to the Atlas");
  url.searchParams.set("nl", context.campaign);
  url.searchParams.set("nlv", context.variant);
  url.searchParams.set("nll", context.placement);
  if (test) url.searchParams.set("nl_test", "1"); else url.searchParams.delete("nl_test");
  return url.toString();
}
/** Existing sending log remains the source for accepted mail counts. */
export function newsletterBatch(campaign: string, variant: string): string {
  if (!newsletterEventName(campaign, variant, "ort")) throw new Error("Unknown newsletter edition");
  return `newsletter:${campaign}:${variant}`;
}

/** A later navigation must not inherit the original mail's playback attribution. */
export function matchesNewsletterEntry(path: string, search: string, entryPath: string, entry: NewsletterContext): boolean {
  const current = newsletterContext(search);
  return path === entryPath && current?.campaign === entry.campaign && current.variant === entry.variant && current.placement === entry.placement;
}
