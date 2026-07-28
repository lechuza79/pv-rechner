/**
 * The ONE licence statement for our own work — code, short label and the page
 * that spells it out.
 *
 * Why this exists: a licence that is worded slightly differently on three pages
 * is worse than no licence page at all. An editor who finds "frei nutzbar" here
 * and "nur mit Zustimmung" there stops and links somewhere else instead. So the
 * wording lives in exactly one place (app/(site)/lizenz), and every other
 * surface — cite dialog, press page, widget terms — links to it and reuses the
 * constants below rather than re-stating the terms.
 *
 * Scope: this covers OUR depictions, calculations and texts. The underlying
 * data keeps the licence of its source (see lib/data-sources.ts) — that credit
 * is a separate obligation and must stay visible on every chart and export.
 */
export const OWN_WORK_LICENSE = {
  /** Short code as it appears in every visible credit. */
  code: "CC BY 4.0",
  /** Full name, for the one place that spells it out. */
  name: "Creative Commons Namensnennung 4.0 International",
  /** German deed — the human-readable licence text. */
  url: "https://creativecommons.org/licenses/by/4.0/deed.de",
  /** The name a re-user has to credit. */
  attributionName: "solar-check.io",
  /** The page that states the terms. Everything else links here. */
  page: "/lizenz",
} as const;
