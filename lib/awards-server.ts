import "server-only";
import { unstable_cache } from "next/cache";
import { supabase } from "./supabase-server";
import type { GemeindeStats } from "./awards";

// Geteilter Server-Loader für die Award-Ansichten. Die breite Grundtabelle
// mastr_gemeinde_award (~11k Zeilen) + Name/Bezeichnung aus mastr_regions — ms
// statt Sekunden, NIE live über die 562k-Rohzeilen. Eine Stunde gecacht.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pageAll(table: string, select: string, refine?: (q: any) => any): Promise<any[]> {
  if (!supabase) return [];
  const size = 1000;
  const out: unknown[] = [];
  for (let from = 0; ; from += size) {
    let q = supabase.from(table).select(select).order("region_id", { ascending: true }).range(from, from + size - 1);
    if (refine) q = refine(q);
    const { data, error } = await q;
    if (error || !data || data.length === 0) break;
    out.push(...data);
    if (data.length < size) break;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return out as any[];
}

export const loadAwardStats = unstable_cache(
  async (): Promise<GemeindeStats[]> => {
    if (!supabase) return [];
    const stats = await pageAll("mastr_gemeinde_award", "*");
    const regions = await pageAll("mastr_regions", "region_id, name, bezeichnung", (q) => q.eq("level", "gemeinde"));
    const meta = new Map(regions.map((r) => [r.region_id as string, r]));
    return stats.map((r) => {
      const m = meta.get(r.region_id as string);
      return {
        regionId: r.region_id as string,
        name: (m?.name as string) ?? (r.region_id as string),
        bezeichnung: (m?.bezeichnung as string) ?? "Gemeinde",
        population: r.population as number,
        privatDachKwp: Number(r.privat_dach_kwp),
        gewerbeDachKwp: Number(r.gewerbe_dach_kwp),
        freiflaecheKwp: Number(r.freiflaeche_kwp),
        balkonCount: Number(r.balkon_count),
        balkonKwp: Number(r.balkon_kwp),
        batteriePrivatKwh: Number(r.batterie_privat_kwh),
        batterieGewerbeKwh: Number(r.batterie_gewerbe_kwh),
        windKwp: Number(r.wind_kwp),
        biomasseKwp: Number(r.biomasse_kwp),
        wasserKwp: Number(r.wasser_kwp),
        solarZubauKwp: Number(r.solar_zubau_kwp),
      };
    });
  },
  ["admin-awards-stats-v2"],
  { revalidate: 3600 },
);

/** Kreis-Namen (5-stelliger AGS → Anzeigename) für die Anschreiben-Aufhänger. */
export const loadKreisNames = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const rows = await pageAll("mastr_regions", "region_id, name", (q) => q.eq("level", "landkreis"));
    const out: Record<string, string> = {};
    for (const r of rows) out[r.region_id as string] = r.name as string;
    return out;
  },
  ["admin-awards-kreis-names"],
  { revalidate: 3600 },
);
