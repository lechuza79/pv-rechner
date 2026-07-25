import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase-server-component";
import { buildHookIndex } from "../../../../../lib/awards-server";
import { DEFAULT_HOOK_SETTINGS, type HookExample, type HookKind, type HookSettings } from "../../../../../lib/award-hook";
import HooksClient, { type HooksPayload } from "./client";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export const metadata = { title: "Award-Anschreiben – Solar Check Admin", robots: { index: false, follow: false } };

export default async function AnschreibenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) redirect("/");

  const sp = await searchParams;
  // Mind.-Teilnehmer bleibt intern fix (Glaubwürdigkeit) — kein UI-Regler.
  const settings: HookSettings = {
    minTotal: DEFAULT_HOOK_SETTINGS.minTotal,
    percentileCut: clampInt(sp.cut, Math.round(DEFAULT_HOOK_SETTINGS.percentileCut * 100), 1, 50) / 100,
    preferBuerger: sp.buerger !== "0",
    preferHigherLevel: sp.hoch !== "0",
  };
  const q = (sp.q ?? "").trim();

  const index = await buildHookIndex(settings);

  let rows: HookExample[];
  let mode: "suche" | "beispiele";
  if (q) {
    mode = "suche";
    rows = index.rows
      .filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.population - a.population)
      .slice(0, 25);
  } else {
    mode = "beispiele";
    const kinds: HookKind[] = ["sieger", "podium", "perzentil", "neutral"];
    rows = [];
    for (const k of kinds) {
      const pool = index.rows.filter((r) => r.population >= 3000 && r.population <= 40000 && r.kind === k);
      const pick = pool[Math.floor(pool.length / 2)] ?? index.rows.find((r) => r.kind === k);
      if (pick) rows.push(pick);
    }
  }

  const payload: HooksPayload = {
    total: index.total,
    dist: index.dist,
    settings: {
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
