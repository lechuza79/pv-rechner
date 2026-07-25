import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { createClient } from "../../../../lib/supabase-server-component";
import { supabase } from "../../../../lib/supabase-server";
import { bundeslandByAgs, BUNDESLAENDER } from "../../../../lib/mastr-regions";
import {
  AWARD_CATEGORIES,
  AWARD_CATEGORY_BY_KEY,
  ROLE_LABELS,
  SIZE_LABELS,
  computeWinners,
  populationTertiles,
  type AwardScopeLevel,
  type GemeindeStats,
} from "../../../../lib/awards";
import AwardsClient, { type AwardsPayload, type WinnerRow } from "./client";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const metadata = {
  title: "Kommunen-Awards – Solar Check Admin",
  robots: { index: false, follow: false },
};

/** Breite Award-Grundtabelle (~11k Zeilen, ms) — NIE live über die Rohzeilen. */
const loadAwardStats = unstable_cache(
  async (): Promise<GemeindeStats[]> => {
    if (!supabase) return [];
    // Kennzahlen aus dem Rollup, Name + Bezeichnung (für die Rolle) aus mastr_regions.
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
  return out as any[];
}

export default async function AwardsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    redirect("/");
  }

  const sp = await searchParams;
  const catKey = AWARD_CATEGORY_BY_KEY[sp.cat ?? ""] ? sp.cat! : AWARD_CATEGORIES[0].key;
  const cat = AWARD_CATEGORY_BY_KEY[catKey];
  const level: AwardScopeLevel = (["de", "bundesland", "landkreis"] as const).includes(sp.level as AwardScopeLevel)
    ? (sp.level as AwardScopeLevel)
    : "bundesland";
  const splitByRole = sp.role === "1";
  const splitBySize = sp.size === "1";
  const bl = /^\d{2}$/.test(sp.bl ?? "") ? sp.bl! : "";
  const parsedFloor = parseInt(sp.minPop ?? "", 10);
  const minPop = Number.isFinite(parsedFloor) && parsedFloor >= 0 ? parsedFloor : 0;

  const stats = await loadAwardStats();
  const nameOf = new Map(stats.map((s) => [s.regionId, s.name]));

  const groups = computeWinners(stats, cat, { level, splitByRole, splitBySize, minPopulation: minPop });

  // Kreis-Namen für die Landkreis-Ebene: nur die angezeigten nachschlagen wäre
  // ein Extra-Read; die Kreis-AGS haben keinen Gemeinde-Namen im Lookup. Für die
  // Verifikation reicht die Kreis-AGS als Label plus der Siegername.
  let rows: WinnerRow[] = groups.map((grp) => ({
    scopeId: grp.scopeId,
    scopeLabel:
      level === "de"
        ? "Deutschland"
        : level === "bundesland"
          ? bundeslandByAgs(grp.scopeId)?.name ?? grp.scopeId
          : `Kreis ${grp.scopeId}`,
    roleLabel: grp.role ? ROLE_LABELS[grp.role] : null,
    sizeLabel: grp.sizeBand ? SIZE_LABELS[grp.sizeBand] : null,
    winnerName: nameOf.get(grp.winner.regionId) ?? grp.winner.regionId,
    winnerBl: bundeslandByAgs(grp.winner.regionId.slice(0, 2))?.short ?? "",
    value: grp.winner.value,
    population: grp.winner.population,
    total: grp.total,
  }));

  if (bl && level !== "de") rows = rows.filter((r) => r.scopeId.slice(0, 2) === bl);

  rows.sort(
    (a, b) =>
      a.scopeId.localeCompare(b.scopeId) ||
      (a.sizeLabel ?? "").localeCompare(b.sizeLabel ?? "") ||
      (a.roleLabel ?? "").localeCompare(b.roleLabel ?? ""),
  );

  // Terzil-Grenzen zur Info (nur wenn Größen-Split aktiv).
  let tertiles: { c1: number; c2: number } | null = null;
  if (splitBySize) {
    const pool = stats.filter((s) => {
      const m = cat.metric(s);
      return m != null && m > 0 && s.population >= minPop;
    });
    tertiles = populationTertiles(pool);
  }

  const payload: AwardsPayload = {
    categories: AWARD_CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      merit: c.merit,
      traeger: c.traeger,
      messart: c.messart,
    })),
    bundeslaender: BUNDESLAENDER.map((b) => ({ ags: b.ags, name: b.name })),
    selection: { cat: catKey, level, splitByRole, splitBySize, bl, minPop },
    activeCategory: { key: cat.key, label: cat.label, merit: cat.merit, format: cat.format, messart: cat.messart },
    tertiles,
    totalGemeinden: stats.length,
    rows,
  };

  return <AwardsClient payload={payload} />;
}
