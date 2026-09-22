import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { GEMEINDE_PAKET_VERSION, type GemeindePaket } from "./gemeinde-paket";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";

/**
 * Read one town's precomputed package (see lib/gemeinde-paket.ts).
 *
 * Two sources, chosen by environment, never mixed within one deployment:
 *   GEMEINDE_PAKET_LOKAL=<dir>  development: the local build output
 *                               (scripts/.cache/gemeinde-pakete/<edition>)
 *   otherwise                   Supabase Storage bucket `gemeinde-pakete`,
 *                               object `<ags>.json` of the published edition
 *
 * A missing, unreadable or wrong-version package returns null: the page then
 * shows the town without the new sections rather than half a package. The
 * read carries the soft budget — the page has a complete fallback.
 */
export const GEMEINDE_PAKET_BUCKET = "gemeinde-pakete";

function gueltig(p: unknown, ags: string): p is GemeindePaket {
  const x = p as Partial<GemeindePaket> | null;
  return !!x && x.version === GEMEINDE_PAKET_VERSION && x.ags === ags && Array.isArray(x.missing);
}

export async function ladeGemeindePaket(ags: string): Promise<GemeindePaket | null> {
  if (!/^\d{8}$/.test(ags)) return null;
  const lokal = process.env.GEMEINDE_PAKET_LOKAL;
  if (lokal) {
    try {
      const data = JSON.parse(await readFile(path.join(lokal, `${ags}.json`), "utf8"));
      return gueltig(data, ags) ? data : null;
    } catch {
      return null;
    }
  }
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  try {
    const res = await withDbTimeout(
      fetch(`${url}/storage/v1/object/${GEMEINDE_PAKET_BUCKET}/${ags}.json`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        // The page itself is ISR; the package changes with the monthly run and
        // is revalidated together with the page (lib/atlas-revalidate-routen.ts).
        cache: "no-store",
      }),
      `gemeinde-paket/${ags}`,
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return gueltig(data, ags) ? data : null;
  } catch {
    return null;
  }
}
