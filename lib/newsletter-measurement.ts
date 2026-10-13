import {NEWSLETTER_CAMPAIGNS, type NewsletterContext, type NewsletterAction} from "./newsletter-metrics";

/** One counter per action and page load. No persistent IDs, storage or person-level funnel. */
export function createNewsletterMeasurement(context: NewsletterContext, ready: () => boolean, emit: (action: NewsletterAction) => void) {
  const pending = new Set<NewsletterAction>([context.placement]);
  const sent = new Set<NewsletterAction>();
  return {
    flush() {
      if (!ready()) return;
      for (const action of pending) {
        if (!sent.has(action)) { sent.add(action); emit(action); }
        pending.delete(action);
      }
    },
    started(period: unknown) {
      if (context.placement === "bild" && period === NEWSLETTER_CAMPAIGNS[context.campaign].period && !sent.has("start")) pending.add("start");
    },
  };
}
