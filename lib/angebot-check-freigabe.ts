// ─── Is the offer check reachable at all? ─────────────────────────────────────
//
// The offer check (/api/angebot-check) sends up to twelve uploaded files per
// call to a paid reading service in the United States. As of 28.09.2026 the
// feature is built into NO page, yet the route was publicly reachable with only
// a per-instance in-memory rate limit — i.e. anyone could spend our API budget
// by scripting requests against it, and every cold start reset the counter.
//
// Until it is integrated, the route answers 404 unless this flag is set.
// BEFORE ENABLING: add a GLOBAL daily cap (shared across instances, e.g. a
// counter in the database), not just the per-IP in-memory limit — the
// in-memory map lives per function instance and is gone after a cold start.

export const ANGEBOT_CHECK_FLAG = "ANGEBOT_CHECK_AKTIV";

/** Only the exact value "1" enables the route; anything else keeps it closed. */
export function angebotCheckAktiv(env: Record<string, string | undefined> = process.env): boolean {
  return env[ANGEBOT_CHECK_FLAG] === "1";
}
