import "server-only";
import { supabase } from "./supabase-server";
import { withDbTimeout } from "./db-timeout";
import { jahrInBerlin } from "./zeit";
import type { GemeindeStats } from "./awards";
import { kreiseAusRegister, statsAusRollup, type KreisRegisterZeile, type KreisStats, type RollupZeile } from "./kreis-ranking";

// Server reader for the district rankings (pure part: lib/kreis-ranking.ts).
//
// Reads the ROLLUP only — district (5 digits), Land (2 digits) and Bund ("")
// keys — never the Gemeinde rows. Every read is paginated AND ordered by the
// full primary key: Postgres may change row order between two unordered
// queries, and a page boundary then duplicates some rows and drops others.
//
// Size: ~400 districts × energy carrier × segment × year, a few ten thousand
// small rows. Memoised per process for an hour like loadAwardStats — the
// numbers only change with the monthly import. Not meant for a hot page path:
// a page should read a precomputed result (see docs/kreis-ranking-daten.md).

const PAGE = 1000;
const TTL_MS = 60 * 60 * 1000;
const TRAEGER = ["solar", "speicher", "wind", "biomasse"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pageAll(label: string, build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: { message: string } | null }>): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await withDbTimeout(build(from, from + PAGE - 1), `kreis-ranking: ${label} ab ${from}`);
    // Throw instead of returning a partial list: a ranking over half the
    // districts looks exactly like a real one.
    if (error) throw new Error(`kreis-ranking: ${label}: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toRollup = (r: any): RollupZeile => ({
  regionKey: r.region_key as string,
  energietraeger: r.energietraeger as string,
  segment: r.segment as string,
  year: Number(r.year),
  count: Number(r.count ?? 0),
  kwp: Number(r.kwp ?? 0),
  kwh: Number(r.kwh ?? 0),
});

export type KreisRankingDaten = {
  kreise: KreisStats[];
  ausgeschlossen: string[];
  /** Reference stats from the scopes' own rollups: Land id ("07") and "de". */
  scopeStats: Record<string, GemeindeStats>;
  /** Last full year used for the "seit Ende <Jahr>" metrics. */
  ly: number;
};

export async function loadKreisRankingDatenFresh(jetzt: Date = new Date()): Promise<KreisRankingDaten> {
  if (!supabase) throw new Error("kreis-ranking: no database");
  const db = supabase;
  const ly = jahrInBerlin(jetzt) - 1;

  const register = await pageAll("mastr_regions", (from, to) =>
    db.from("mastr_regions")
      .select("region_id, name, bezeichnung, population, slug")
      .eq("level", "landkreis")
      .order("region_id", { ascending: true })
      .range(from, to),
  );
  const parents = await pageAll("mastr_regions parents", (from, to) =>
    db.from("mastr_regions")
      .select("region_id, name, population")
      .in("level", ["bundesland", "de"])
      .order("region_id", { ascending: true })
      .range(from, to),
  );
  const rollup = (
    await pageAll("mastr_region_rollup", (from, to) =>
      db.from("mastr_region_rollup")
        .select("region_key, energietraeger, segment, year, count, kwp, kwh")
        .in("energietraeger", TRAEGER)
        // Bund "", Land "07", Kreis "07335" — never the 8-digit Gemeinde keys.
        .or("region_key.eq.,region_key.like.__,region_key.like._____")
        .order("region_key", { ascending: true })
        .order("energietraeger", { ascending: true })
        .order("segment", { ascending: true })
        .order("year", { ascending: true })
        .range(from, to),
    )
  ).map(toRollup);

  const registerZeilen: KreisRegisterZeile[] = register.map((r) => ({
    regionId: r.region_id as string,
    name: r.name as string,
    bezeichnung: (r.bezeichnung as string | null) ?? null,
    population: r.population == null ? null : Number(r.population),
    slug: (r.slug as string | null) ?? null,
  }));
  const { kreise, ausgeschlossen } = kreiseAusRegister(registerZeilen, rollup, ly);

  const byKey = new Map<string, RollupZeile[]>();
  for (const r of rollup) if (r.regionKey.length < 5) byKey.set(r.regionKey, [...(byKey.get(r.regionKey) ?? []), r]);
  const scopeStats: Record<string, GemeindeStats> = {};
  for (const p of parents) {
    const id = p.region_id as string;
    const key = id === "de" ? "" : id;
    const rows = byKey.get(key);
    if (!rows || !p.population) continue;
    scopeStats[id] = statsAusRollup(rows, { regionId: id, name: p.name as string, bezeichnung: "", population: Number(p.population) }, ly);
  }
  return { kreise, ausgeschlossen, scopeStats, ly };
}

let memo: { at: number; val: KreisRankingDaten } | null = null;

export async function loadKreisRankingDaten(): Promise<KreisRankingDaten> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.val;
  const val = await loadKreisRankingDatenFresh();
  memo = { at: Date.now(), val };
  return val;
}
