import "server-only";

/**
 * Durable "last good" copy of the Energy-Charts responses.
 *
 * The energy routes already kept a stale fallback, but only in the memory of a
 * single serverless instance. On 05.10.2026 Energy-Charts' data service was
 * down for hours (HTTP 503 from their load balancer, website itself up); every
 * fresh instance had nothing to fall back to, and /strommix-deutschland showed
 * three empty boxes. A copy that dies with the instance is not a fallback.
 *
 * What this stores is the response exactly as we last served it. Nothing is
 * recomputed or relabelled — the data points carry their own timestamps, so a
 * fallback can only ever show an older moment, never pretend it is "now". The
 * routes mark such a response with `stale: true`; the page says so next to the
 * numbers.
 *
 * Only a small, fixed set of keys is persisted (`darfDauerhaftSpeichern`). The
 * routes accept arbitrary `hours` and date ranges; persisting every variant
 * would let anyone grow the table by enumerating parameters.
 *
 * Every database access runs through the soft time budget: the caller has a
 * complete fallback (the error response it would have sent anyway), so waiting
 * longer than that only delays the visitor.
 */

import { supabase } from "./supabase-server";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";

export const LETZTER_STAND_TABELLE = "energy_letzter_stand";

/** Rolling windows the site actually requests (strommix tabs, live radial, OG image). */
const ROLLENDE_STUNDEN = new Set([24, 26, 168, 720, 8760]);

/**
 * Decide whether a route's cache key may be written durably.
 *
 * Accepted forms (built by the generation and nuclear-import routes):
 * - `<country>-<hours>` / `<country>-<hours>-raw` / `nuclear-<hours>` for the
 *   rolling windows above
 * - full calendar years `…-YYYY-01-01-YYYY-12-31` (year view below the weekly
 *   threshold or before the weekly table has rows)
 */
export function darfDauerhaftSpeichern(scope: "generation" | "nuclear-import", key: string): boolean {
  const prefix = scope === "generation" ? "[a-z]{2}" : "nuclear";
  const rolling = new RegExp(`^${prefix}-(\\d{1,4})(-raw)?$`).exec(key);
  if (rolling) {
    if (scope === "nuclear-import" && rolling[2]) return false;
    return ROLLENDE_STUNDEN.has(Number(rolling[1]));
  }
  const year = new RegExp(`^${prefix}-(\\d{4})-01-01-(\\d{4})-12-31$`).exec(key);
  return year !== null && year[1] === year[2];
}

function zeile(scope: string, key: string): string {
  return `${scope}:${key}`;
}

/** Last stored copy, or null (none stored, table missing, DB slow or down). */
export async function ladeLetztenStand<T>(scope: "generation" | "nuclear-import", key: string): Promise<T | null> {
  if (!supabase || !darfDauerhaftSpeichern(scope, key)) return null;
  try {
    const { data, error } = await withDbTimeout(
      supabase.from(LETZTER_STAND_TABELLE).select("payload").eq("key", zeile(scope, key)).maybeSingle(),
      `letzter Stand ${scope}`,
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error || !data) return null;
    return (data as { payload: T }).payload ?? null;
  } catch {
    return null;
  }
}

/**
 * Store a fresh upstream response. Errors are logged, never thrown: a failed
 * write must not turn a successful response into a failed one.
 */
export async function speichereLetztenStand(
  scope: "generation" | "nuclear-import",
  key: string,
  payload: unknown,
): Promise<void> {
  if (!supabase || !darfDauerhaftSpeichern(scope, key)) return;
  try {
    const { error } = await withDbTimeout(
      supabase.from(LETZTER_STAND_TABELLE).upsert(
        { key: zeile(scope, key), payload, gespeichert_am: new Date().toISOString() },
        { onConflict: "key" },
      ),
      `letzter Stand speichern ${scope}`,
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error) console.error(`${LETZTER_STAND_TABELLE} upsert error:`, error.message);
  } catch (e) {
    console.error(`${LETZTER_STAND_TABELLE} upsert failed:`, e instanceof Error ? e.message : e);
  }
}
