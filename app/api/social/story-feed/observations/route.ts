import { NextRequest, NextResponse } from "next/server";
import { istAdminOderCron } from "../../../../../lib/admin-guard";
import { loadAwardStats } from "../../../../../lib/awards-server";
import { computePlacements } from "../../../../../lib/award-hook";
import { supabase } from "../../../../../lib/supabase-server";

export const maxDuration = 120;

/** Called after a completed register refresh, never as part of a page read. */
export async function POST(req: NextRequest) {
  if (!(await istAdminOderCron(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: "Datenbank nicht konfiguriert" }, { status: 503 });
  try {
    const meta = await supabase.from("mastr_meta").select("imported_at").eq("id", 1).single();
    if (meta.error || !meta.data?.imported_at) throw new Error("Geprüfter Datenstand fehlt");
    const stats = await loadAwardStats();
    if (!stats.length) throw new Error("Keine Rangdaten vorhanden");
    const groups = new Map<string, object[]>();
    for (const [regionId, placements] of computePlacements(stats)) {
      for (const p of placements) {
        const key = [p.categoryKey, p.level, p.scopeId, p.klasseSlug].join("|");
        const list = groups.get(key) ?? [];
        list.push({ regionId, rank: p.rank, value: p.value, spike: p.spike, duenn: p.duenn, total: p.total });
        groups.set(key, list);
      }
    }
    const after = await supabase.from("mastr_meta").select("imported_at").eq("id", 1).single();
    if (after.error || after.data?.imported_at !== meta.data.imported_at) throw new Error("Datenstand hat sich während der Berechnung geändert");
    const edition = { sourceDate: String(meta.data.imported_at).slice(0, 10), rules: "award-hook-v1", stats };
    // Bounded writes avoid sending the entire national ranking in one request.
    // A complete manifest is written last; incomplete runs cannot be consumed.
    const rows = [...groups].map(([key, ranks]) => ({
      group_key: key, source_date: edition.sourceDate, rules_version: edition.rules,
      payload: { ranks },
    }));
    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await supabase.from("municipality_rank_observations")
        .upsert(rows.slice(i, i + 50), { onConflict: "group_key,source_date,rules_version", ignoreDuplicates: true });
      if (error) throw new Error(`Ranggruppen nicht gespeichert (${error.code ?? "Datenbankfehler"})`);
    }
    const { error } = await supabase.from("municipality_rank_observations").upsert({
      group_key: "all", source_date: edition.sourceDate, rules_version: edition.rules,
      payload: { ...edition, complete: true, groups: [...groups.keys()] },
    }, { onConflict: "group_key,source_date,rules_version", ignoreDuplicates: true });
    if (error) throw new Error(`Abschluss nicht gespeichert (${error.code ?? "Datenbankfehler"})`);
    return NextResponse.json({ ok: true, sourceDate: edition.sourceDate, groups: groups.size, municipalities: stats.length });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
