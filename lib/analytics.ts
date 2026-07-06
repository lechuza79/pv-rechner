import { track } from "@vercel/analytics";

/**
 * Thin wrapper around Vercel Web Analytics custom events.
 *
 * Cookieless + aggregated: event names and props must NEVER carry personal
 * data (no PLZ, no e-mail, no free-text input) — only anonymous funnel/action
 * markers. Wrapped in try/catch so analytics can never break the app, and a
 * no-op on the server (track() is client-only).
 */
export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean>,
) {
  try {
    track(name, props);
  } catch {
    /* analytics must never throw into the UI */
  }
}
