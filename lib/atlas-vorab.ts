/**
 * Atlas pages that are rendered at BUILD time, so that the first reader after a
 * deploy does not wait for a render.
 *
 * WHY (28.09.2026): After every deploy an atlas page is rendered on its first
 * visit. Measured right after one: 4.4 s for a district page, 0.3 s for the
 * visit after it. For a page a newspaper links to, the first click is the one
 * that counts — and we deploy several times a day. Warming pages up after each
 * deploy was rejected by the operator as the wrong answer; the pages belong in
 * the build.
 *
 * WHICH pages: every municipality with a proven publication (someone links to
 * it, so strangers arrive) and its district. The list is read from the
 * publication table, so a new publication brings its pages into the next build
 * without anyone editing a list.
 *
 * WHY THIS IS SAFE — the 27.07.2026 failure must not come back. Then, 17 pages
 * rendered in parallel from the build container, the outbound connections
 * failed and three deploys in a row broke. Three brakes now:
 *   1. The list is capped (VORAB_MAX). Beyond it, pages stay on-demand.
 *   2. next.config.js renders static pages in small batches and retries a page
 *      whose render failed (staticGenerationMaxConcurrency / RetryCount).
 *   3. Reading the list can never break the build: any error returns an empty
 *      list, and the atlas behaves exactly as before.
 * District pages read ONE precomputed package since 25.09.2026, municipality
 * pages a handful of cached reads — far fewer queries per page than in July.
 */
import { atlasPathForRegionId } from "./atlas";
import { withDbTimeout } from "./db-timeout";

/** Upper bound of pages rendered at build time from this list. */
export const VORAB_MAX = 40;

/**
 * Region ids to render ahead: each published municipality and its district,
 * without duplicates, capped. Pure, so the rule is testable without a database.
 */
export function vorabRegionIds(veroeffentlicht: string[], max = VORAB_MAX): string[] {
  const ids: string[] = [];
  for (const id of [...new Set(veroeffentlicht)].sort()) {
    if (!/^\d{8}$/.test(id)) continue;
    for (const r of [id, id.slice(0, 5)]) if (!ids.includes(r)) ids.push(r);
  }
  return ids.slice(0, max);
}

/** Build-time params for the atlas route. Never throws. */
export async function vorabPfade(): Promise<{ pfad: string[] }[]> {
  try {
    const { supabase } = await import("./supabase-server");
    if (!supabase) return [];
    const { data, error } = await withDbTimeout(
      supabase.from("kommunen_veroeffentlichung").select("region_id").eq("noch_online", true).order("region_id"),
      "vorab-veroeffentlichung",
    );
    if (error || !data) return [];
    const pfade = new Map<string, string[]>();
    // One after the other on purpose: this runs inside the build.
    for (const id of vorabRegionIds(data.map((z) => String(z.region_id)))) {
      const pfad = await atlasPathForRegionId(id).catch(() => null);
      if (!pfad) continue;
      const teile = pfad.replace(/^\/solar-atlas\//, "").split("/").filter(Boolean);
      pfade.set(teile.join("/"), teile);
    }
    return [...pfade.values()].map((pfad) => ({ pfad }));
  } catch (e) {
    console.warn("[atlas-vorab] list not readable, rendering on demand:", (e as Error)?.message);
    return [];
  }
}
