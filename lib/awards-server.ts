import "server-only";
import { supabase } from "./supabase-server";
import { AWARD_CATEGORY_BY_KEY, type GemeindeStats } from "./awards";
import { bundeslandByAgs } from "./mastr-regions";
import {
  LEVEL_LABEL,
  computePlacements,
  hookText,
  selectHook,
  type HookExample,
  type HookKind,
  type HookSettings,
} from "./award-hook";

// Geteilter Server-Loader für die Award-Ansichten. Die breite Grundtabelle
// mastr_gemeinde_award (~11k Zeilen) + Name/Bezeichnung aus mastr_regions — ms
// statt Sekunden, NIE live über die 562k-Rohzeilen.
//
// Bewusst KEIN unstable_cache: dessen Datencache deckelt bei 2 MB, und die
// Grundtabelle + der Hook-Index liegen darüber (→ Cache scheitert je Request und
// wirft, die Ansicht rechnet jedes Mal neu → „Suche dauert ewig"). Stattdessen
// ein prozess-lokales Memo mit Ablauf: die Zahlen ändern sich nur im Monatslauf.

const TTL_MS = 60 * 60 * 1000;

/** Ein Wert, prozess-lokal gecacht mit Ablauf. */
function memoize<T>(fn: () => Promise<T>): () => Promise<T> {
  let cache: { at: number; val: T } | null = null;
  return async () => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.val;
    const val = await fn();
    cache = { at: Date.now(), val };
    return val;
  };
}

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

export const loadAwardStats = memoize(async (): Promise<GemeindeStats[]> => {
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
});

/** Kreis-Namen (5-stelliger AGS → Anzeigename) für die Anschreiben-Aufhänger. */
export const loadKreisNames = memoize(async (): Promise<Record<string, string>> => {
  const rows = await pageAll("mastr_regions", "region_id, name", (q) => q.eq("level", "landkreis"));
  const out: Record<string, string> = {};
  for (const r of rows) out[r.region_id as string] = r.name as string;
  return out;
});

export type HookIndex = { total: number; dist: Record<HookKind, number>; rows: HookExample[] };

// Prozess-lokales Memo je Einstellungs-Kombination (klein gehalten).
const hookIndexMemo = new Map<string, { at: number; val: HookIndex }>();

/** Für ALLE Gemeinden den fertigen Aufhänger (Betreff/Einstieg) vorberechnen.
 *  Danach ist die Suche in der Ansicht nur ein Filter über dieses Array, nicht
 *  33 Sortierläufe pro Request. */
export async function buildHookIndex(settings: HookSettings): Promise<HookIndex> {
  const key = JSON.stringify(settings);
  const hit = hookIndexMemo.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.val;

  const [stats, kreisNames] = await Promise.all([loadAwardStats(), loadKreisNames()]);
  const placements = computePlacements(stats);
  const dist: Record<HookKind, number> = { sieger: 0, podium: 0, perzentil: 0, neutral: 0 };
  const rows: HookExample[] = stats.map((g) => {
    const hook = selectHook(placements.get(g.regionId), settings);
    dist[hook.kind]++;
    const names = {
      gemeinde: g.name,
      kreis: kreisNames[g.regionId.slice(0, 5)] ?? "Landkreis",
      land: bundeslandByAgs(g.regionId.slice(0, 2))?.name ?? "",
    };
    const t = hookText(hook, names);
    const others = (placements.get(g.regionId) ?? [])
      .filter((p) => p.total >= settings.minTotal && p.rank <= 3)
      .sort((a, b) => a.rank - b.rank || b.total - a.total)
      .slice(0, 4)
      .map((p) => `${AWARD_CATEGORY_BY_KEY[p.categoryKey]?.label} · ${LEVEL_LABEL[p.level]} · Platz ${p.rank}/${p.total}`);
    return {
      regionId: g.regionId,
      name: g.name,
      bl: bundeslandByAgs(g.regionId.slice(0, 2))?.short ?? "",
      population: g.population,
      kind: hook.kind,
      categoryKey: hook.categoryKey,
      level: hook.level,
      scopeId: hook.scopeId,
      betreff: t.betreff,
      einstieg: t.einstieg,
      others,
    };
  });

  const result: HookIndex = { total: stats.length, dist, rows };
  if (hookIndexMemo.size > 16) hookIndexMemo.clear();
  hookIndexMemo.set(key, { at: Date.now(), val: result });
  return result;
}
