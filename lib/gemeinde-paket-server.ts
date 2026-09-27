import "server-only";
import type { StoryConcept } from "./story-konzepte";
import { energyYearTitle } from "./story-energy-year-labels";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { brotliDecompressSync } from "node:zlib";
import { GEMEINDE_PAKET_VERSION, type GemeindePaket } from "./gemeinde-paket";
import { DB_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";
import { ATLAS_DATEN_TAG } from "./atlas-revalidate-routen";

/**
 * Read one town's precomputed package (see lib/gemeinde-paket.ts).
 *
 * Two sources, chosen by environment, never mixed within one deployment:
 *   GEMEINDE_PAKET_LOKAL=<dir>  development: the local build output
 *                               (scripts/.cache/gemeinde-pakete/<edition>)
 *   otherwise                   Supabase Storage bucket `gemeinde-pakete`,
 *                               object `<ags>.json.br` (Brotli: ≈55 KB instead
 *                               of ≈370 KB; 11,000 towns are ≈0.6 GB, not 4)
 *
 * Two outcomes that must never be confused:
 *   null   the package does not exist (HTTP 400/404 from the store, or it is
 *          of another version/town) — the page answers 404
 *   throw  the read failed (timeout, network, 5xx) — the render fails and
 *          the CDN keeps serving the last good page. Turned into null, one
 *          storage hiccup would put a 404 into the cache for a day.
 */
export const GEMEINDE_PAKET_BUCKET = "gemeinde-pakete";

function gueltig(p: unknown, ags: string): p is GemeindePaket {
  const x = p as Partial<GemeindePaket> | null;
  return !!x && x.version === GEMEINDE_PAKET_VERSION && x.ags === ags && Array.isArray(x.missing);
}

/** Keep stored annual story titles consistent with their actual energy mix. */
function mitJahrestiteln(data: GemeindePaket): GemeindePaket {
  if (!Array.isArray(data.stories)) return data;
  return {...data, stories: data.stories.map(raw => {
    const story = raw as StoryConcept;
    return story.energyYear ? {...story, title: energyYearTitle(story.energyYear)} : story;
  })};
}

export async function ladeGemeindePaket(ags: string): Promise<GemeindePaket | null> {
  if (!/^\d{8}$/.test(ags)) return null;
  const lokal = process.env.GEMEINDE_PAKET_LOKAL;
  if (lokal) {
    try {
      const data = JSON.parse(await readFile(path.join(lokal, `${ags}.json`), "utf8"));
      return gueltig(data, ags) ? mitJahrestiteln(data) : null;
    } catch {
      return null;
    }
  }
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  // Missing access is a broken deployment, not a missing town.
  if (!url || !key) throw new Error("gemeinde-paket: Supabase-Zugang fehlt");
  try {
    const res = await withDbTimeout(
      fetch(`${url}/storage/v1/object/${GEMEINDE_PAKET_BUCKET}/${ags}.json.br`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        // Cached with the page and dropped with the monthly run's Atlas
        // invalidation (same tag). NOT no-store: on an ISR page a no-store
        // fetch fails the render (DYNAMIC_SERVER_USAGE, measured 22.09.2026).
        next: { revalidate: 86400, tags: [ATLAS_DATEN_TAG] },
      }),
      `gemeinde-paket/${ags}`,
      // The full budget, not the soft one: this read has no fallback — a
      // timeout fails the render, and on a first render (nothing in the CDN
      // yet) the visitor gets a 500. Five such 500s in 24 h on 24.09.2026,
      // each a cold render of a different town, none a storage outage.
      DB_READ_TIMEOUT_MS,
    );
    // Supabase Storage answers a missing object with 400 or 404.
    if (res.status === 400 || res.status === 404) return null;
    if (!res.ok) throw new Error(`gemeinde-paket/${ags}: HTTP ${res.status}`);
    const data = JSON.parse(brotliDecompressSync(Buffer.from(await res.arrayBuffer())).toString("utf8"));
    return gueltig(data, ags) ? mitJahrestiteln(data) : null;
  } catch (e) {
    throw e instanceof Error ? e : new Error(`gemeinde-paket/${ags}: ${String(e)}`);
  }
}
