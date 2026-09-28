import { createHmac } from "node:crypto";

// ─── The ID of an installer partner page (/fuer/<kennung>) ───────────────────
//
// Deliberately WITHOUT `server-only`: the page resolver (`lib/fachbetrieb-seite.ts`)
// and the CLI that prints the links to send (`scripts/fachbetrieb-link.ts`) must
// compute exactly the same ID. They used to carry two copies of the recipe, held
// together only by a test; now both import this one.
//
// ── Why a derived key and not CRON_SECRET itself ──────────────────────────
// CRON_SECRET authenticates our cron and admin routes. Using the same bytes as
// the HMAC key for public IDs mixes two purposes on one secret. Without adding
// a new environment variable (a missing one only shows up in production when a
// link leads nowhere), we derive a dedicated key: HMAC(CRON_SECRET, purpose
// label). The label is versioned so a future change is explicit.
//
// ── ROTATING CRON_SECRET CHANGES EVERY PARTNER ID ──────────────────────────
// The IDs are not stored anywhere; they are recomputed from the secret. Rotate
// CRON_SECRET and every partner link ever sent answers 404 — silently. Before
// rotating it once links are out: either keep the old value for this purpose
// or re-send the links.

const KENNUNG_ZWECK = "solar-check:fachbetrieb-seite:v1";

/** Length of the ID in hex characters (64 bits — not guessable by trying). */
export const KENNUNG_LAENGE = 16;

/** Shape check for an incoming ID, matching `KENNUNG_LAENGE`. */
export const KENNUNG_MUSTER = /^[0-9a-f]{16}$/;

/** The dedicated key for partner-page IDs, derived from CRON_SECRET. */
export function kennungsSchluessel(cronSecret: string): Buffer {
  return createHmac("sha256", cronSecret).update(KENNUNG_ZWECK).digest();
}

/** The partner-page ID of a domain. Stable, not guessable, no database column. */
export function kennungAusGeheimnis(domain: string, cronSecret: string): string {
  return createHmac("sha256", kennungsSchluessel(cronSecret))
    .update(`fachbetrieb:${domain.toLowerCase()}`)
    .digest("hex")
    .slice(0, KENNUNG_LAENGE);
}
