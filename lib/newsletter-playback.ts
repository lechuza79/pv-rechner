import {NEWSLETTER_START_EVENT} from "./newsletter-metrics";
/** Only the same-origin host collects events; no cross-site message or visitor state. */
export function reportNewsletterPlayback(period: string) {
  try {
    const host = window.parent !== window && window.parent.location.origin === window.location.origin ? window.parent : window;
    host.dispatchEvent(new CustomEvent(NEWSLETTER_START_EVENT, {detail: {period}}));
  } catch { /* External embeds never report newsletter activity. */ }
}
