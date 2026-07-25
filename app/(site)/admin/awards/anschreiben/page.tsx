import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase-server-component";
import { bundeslandByAgs } from "../../../../../lib/mastr-regions";
import { loadAwardStats, loadKreisNames } from "../../../../../lib/awards-server";
import { AWARD_CATEGORY_BY_KEY, type GemeindeStats } from "../../../../../lib/awards";
import {
  DEFAULT_HOOK_SETTINGS,
  computePlacements,
  hookText,
  selectHook,
  type Hook,
  type HookKind,
  type HookLevel,
  type HookSettings,
  type Placement,
} from "../../../../../lib/award-hook";
import HooksClient, { type HooksPayload, type HookExample } from "./client";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export const metadata = { title: "Award-Anschreiben – Solar Check Admin", robots: { index: false, follow: false } };

const LEVEL_LABEL: Record<HookLevel, string> = { kreis: "Landkreis", land: "Bundesland", bund: "bundesweit" };

export default async function AnschreibenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) redirect("/");

  const sp = await searchParams;
  const settings: HookSettings = {
    minTotal: clampInt(sp.minTotal, DEFAULT_HOOK_SETTINGS.minTotal, 1, 500),
    percentileCut: clampInt(sp.cut, Math.round(DEFAULT_HOOK_SETTINGS.percentileCut * 100), 1, 50) / 100,
    preferBuerger: sp.buerger !== "0",
    preferHigherLevel: sp.hoch !== "0",
  };
  const q = (sp.q ?? "").trim();

  const [stats, kreisNames] = await Promise.all([loadAwardStats(), loadKreisNames()]);
  const placements = computePlacements(stats);

  const namesFor = (g: GemeindeStats) => ({
    gemeinde: g.name,
    kreis: kreisNames[g.regionId.slice(0, 5)] ?? "Landkreis",
    land: bundeslandByAgs(g.regionId.slice(0, 2))?.name ?? "",
  });

  const hookOf = (g: GemeindeStats): Hook => selectHook(placements.get(g.regionId), settings);

  const buildExample = (g: GemeindeStats): HookExample => {
    const hook = hookOf(g);
    const n = namesFor(g);
    const t = hookText(hook, n);
    // Kontext: weitere starke Platzierungen (warum dieser Aufhänger?)
    const others = (placements.get(g.regionId) ?? [])
      .filter((p: Placement) => p.total >= settings.minTotal && p.rank <= 3)
      .sort((a, b) => a.rank - b.rank || b.total - a.total)
      .slice(0, 4)
      .map((p) => `${AWARD_CATEGORY_BY_KEY[p.categoryKey]?.label} · ${LEVEL_LABEL[p.level]} · Platz ${p.rank}/${p.total}`);
    return {
      regionId: g.regionId,
      name: g.name,
      bl: bundeslandByAgs(g.regionId.slice(0, 2))?.short ?? "",
      population: g.population,
      kind: hook.kind,
      betreff: t.betreff,
      einstieg: t.einstieg,
      others,
    };
  };

  // Verteilung über ALLE Gemeinden.
  const dist: Record<HookKind, number> = { sieger: 0, podium: 0, perzentil: 0, neutral: 0 };
  for (const g of stats) dist[hookOf(g).kind]++;

  // Anzeige: Suche ODER je Aufhänger-Art ein prägnantes Beispiel (größere Gemeinde zuerst).
  let rows: HookExample[];
  let mode: "suche" | "beispiele";
  if (q) {
    mode = "suche";
    rows = stats
      .filter((g) => g.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.population - a.population)
      .slice(0, 20)
      .map(buildExample);
  } else {
    mode = "beispiele";
    const byPop = [...stats].sort((a, b) => b.population - a.population);
    const kinds: HookKind[] = ["sieger", "podium", "perzentil", "neutral"];
    rows = [];
    for (const k of kinds) {
      // ein mittelgroßes, erkennbares Beispiel je Art (nicht die Riesenstadt, nicht der Weiler)
      const pool = byPop.filter((g) => g.population >= 3000 && g.population <= 40000 && hookOf(g).kind === k);
      const pick = pool[Math.floor(pool.length / 2)] ?? byPop.find((g) => hookOf(g).kind === k);
      if (pick) rows.push(buildExample(pick));
    }
  }

  const payload: HooksPayload = {
    total: stats.length,
    dist,
    settings: {
      minTotal: settings.minTotal,
      cut: Math.round(settings.percentileCut * 100),
      buerger: settings.preferBuerger,
      hoch: settings.preferHigherLevel,
    },
    q,
    mode,
    rows,
  };
  return <HooksClient payload={payload} />;
}

function clampInt(raw: string | undefined, def: number, min: number, max: number): number {
  const n = parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
}
