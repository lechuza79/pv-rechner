import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { createClient } from "../../../../lib/supabase-server-component";
import { supabase } from "../../../../lib/supabase-server";
import { bundeslandByAgs } from "../../../../lib/mastr-regions";
import {
  AWARD_CATEGORIES,
  categoryHasData,
  rankByScope,
  scopeWinners,
  type GemeindeStats,
  type MetricFormat,
} from "../../../../lib/awards";
import AwardsClient, { type AwardsPayload, type CategoryView, type AwardRow } from "./client";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const metadata = {
  title: "Kommunen-Awards – Solar Check Admin",
  robots: { index: false, follow: false },
};

// Backend-Prototyp: die Award-Rangliste sichtbar machen, bevor irgendwas visuell
// wird. Hier zurren wir Kategorien und Einwohner-Schwelle fest.

/** Alle bewohnten Gemeinden mit ihren Solar-Kennzahlen aus dem schmalen Rollup
 *  (~11k Zeilen, ms statt Sekunden — NIE live über mastr_aggregates_gem, das hat
 *  die DB am 2026-07-21 lahmgelegt). Paginiert (PostgREST deckelt bei 1000) und
 *  eine Stunde gecacht: die Zahlen ändern sich nur im Monatslauf. */
const loadAllGemeindeStats = unstable_cache(
  async (): Promise<GemeindeStats[]> => {
    if (!supabase) return [];
    const pageSize = 1000;
    const rows: GemeindeStats[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("mastr_gemeinde_solar")
        .select("region_id, population, kwp_alle, kwp_dach")
        .order("region_id", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error || !data || data.length === 0) break;
      for (const r of data) {
        rows.push({
          regionId: r.region_id as string,
          population: r.population as number,
          kwpAlle: Number(r.kwp_alle),
          kwpDach: Number(r.kwp_dach),
        });
      }
      if (data.length < pageSize) break;
    }
    return rows;
  },
  ["admin-awards-gemeinde-stats"],
  { revalidate: 3600 },
);

/** Namen der angezeigten Gemeinden nachladen (nur die ~130 Sieger/Top-Zeilen,
 *  nicht alle 11k) — Namen stehen in mastr_regions, nicht im Rollup. */
async function loadNames(regionIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!supabase || regionIds.length === 0) return map;
  const { data } = await supabase
    .from("mastr_regions")
    .select("region_id, name")
    .in("region_id", regionIds);
  for (const r of data ?? []) map.set(r.region_id as string, r.name as string);
  return map;
}

const DE_TOP_N = 10;

export default async function AwardsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ minPop?: string }>;
}) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    redirect("/");
  }

  const sp = await searchParams;
  const parsed = parseInt(sp.minPop ?? "", 10);
  const minPop = Number.isFinite(parsed) && parsed >= 0 ? parsed : 2000;
  const opts = { minPopulation: minPop };

  const stats = await loadAllGemeindeStats();

  // Erst rechnen (nur region_ids), dann Namen für die angezeigten Zeilen holen.
  type Raw = { key: string; deTop: { regionId: string; value: number; population: number; rank: number }[]; blWinners: { regionId: string; value: number; population: number }[]; eligibleTotal: number; hasData: boolean; format: MetricFormat };
  const raw: Raw[] = AWARD_CATEGORIES.map((cat) => {
    const hasData = categoryHasData(stats, cat);
    if (!hasData) {
      return { key: cat.key, deTop: [], blWinners: [], eligibleTotal: 0, hasData, format: cat.format };
    }
    const deScope = rankByScope(stats, cat, "de", opts)[0];
    const deTop = (deScope?.entries ?? []).slice(0, DE_TOP_N).map((e) => ({
      regionId: e.regionId,
      value: e.value,
      population: e.population,
      rank: e.rank,
    }));
    const blWinners = scopeWinners(stats, cat, "bundesland", opts)
      .map((w) => ({ regionId: w.winner.regionId, value: w.winner.value, population: w.winner.population }))
      .sort((a, b) => b.value - a.value);
    return { key: cat.key, deTop, blWinners, eligibleTotal: deScope?.total ?? 0, hasData, format: cat.format };
  });

  const ids = Array.from(
    new Set(raw.flatMap((r) => [...r.deTop.map((x) => x.regionId), ...r.blWinners.map((x) => x.regionId)])),
  );
  const names = await loadNames(ids);

  const rowOf = (x: { regionId: string; value: number; population: number; rank?: number }): AwardRow => ({
    regionId: x.regionId,
    name: names.get(x.regionId) ?? x.regionId,
    blShort: bundeslandByAgs(x.regionId.slice(0, 2))?.short ?? x.regionId.slice(0, 2),
    value: x.value,
    population: x.population,
    rank: x.rank ?? 0,
  });

  const categories: CategoryView[] = AWARD_CATEGORIES.map((cat) => {
    const r = raw.find((x) => x.key === cat.key)!;
    return {
      key: cat.key,
      label: cat.label,
      merit: cat.merit,
      format: cat.format,
      perCapita: cat.perCapita,
      minPopulation: cat.minPopulation,
      hasData: r.hasData,
      eligibleTotal: r.eligibleTotal,
      deTop: r.deTop.map(rowOf),
      blWinners: r.blWinners.map(rowOf),
    };
  });

  const payload: AwardsPayload = {
    minPop,
    totalGemeinden: stats.length,
    categories,
  };

  return <AwardsClient payload={payload} />;
}
