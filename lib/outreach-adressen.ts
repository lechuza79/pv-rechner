/**
 * Atlas page address of a contacted place, built from the parent chain — the
 * same rule as in lib/atlas.ts. Shared by the click evaluation
 * (scripts/outreach-klicks.ts) and the per-sending figures
 * (lib/aussand-kennzahlen-server.ts); one copy, not two.
 *
 * Without a slug anywhere in the chain there is no address; such places are
 * counted and named by the callers instead of being skipped silently.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type RegionZeile = { region_id: string; name: string; slug: string | null; parent_region_id: string | null };

/**
 * Address per region id. Municipalities have three slugs (land/kreis/gemeinde);
 * with `mitKreisen` a district (two slugs) gets its district page as well.
 */
export function adressen(
  regionen: Map<string, RegionZeile>,
  ids: string[],
  { mitKreisen = false }: { mitKreisen?: boolean } = {},
): Map<string, string> {
  const raus = new Map<string, string>();
  for (const id of ids) {
    const teile: string[] = [];
    let cursor: string | null = id;
    let vollstaendig = true;
    while (cursor && cursor !== "de") {
      const r: RegionZeile | undefined = regionen.get(cursor);
      if (!r?.slug) {
        vollstaendig = false;
        break;
      }
      teile.unshift(r.slug);
      cursor = r.parent_region_id;
    }
    if (vollstaendig && (teile.length === 3 || (mitKreisen && teile.length === 2))) {
      raus.set(id, `/solar-atlas/${teile.join("/")}`);
    }
  }
  return raus;
}

/**
 * All regions with name, slug and parent. PAGED AND SORTED: a read without a
 * range silently returns only the first 1,000 rows — with ~11,000 regions
 * nearly every place would then have "no address", which looks like a finding
 * instead of a truncated read.
 */
export async function ladeRegionen(db: SupabaseClient): Promise<Map<string, RegionZeile>> {
  const regionen = new Map<string, RegionZeile>();
  for (let von = 0; ; von += 1000) {
    const { data, error } = await db
      .from("mastr_regions")
      .select("region_id, name, slug, parent_region_id")
      .order("region_id")
      .range(von, von + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const r of data as RegionZeile[]) regionen.set(r.region_id, r);
    if (data.length < 1000) break;
  }
  return regionen;
}
