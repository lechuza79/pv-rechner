import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../../lib/supabase-server";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { AREA_ROLLEN, type ZuordnungRolle } from "../../../../../lib/utilities";
import { bundeslandByAgs } from "../../../../../lib/mastr-regions";

// Arbeitsliste für die Erfassung: die größten Gemeinden zuerst, mit ihrer
// Website und dem Hinweis, ob dort schon ein Versorger hängt.
//
// Warum von Hand und nicht automatisch: Es gibt kein öffentliches
// Stadtwerke-Register. Das Stadtwerk steht meist auf der Gemeinde-Website
// verlinkt — ein Mensch findet es in Sekunden, ein Scraper bräuchte
// Sonderregeln je Seite und läge bei den Zweifelsfällen (Netzbetreiber vs.
// Grundversorger) falsch, ohne es zu merken.

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(sp.get("limit") ?? "", 10) || DEFAULT_LIMIT));
  const nurOffene = sp.get("offen") === "1";

  const { data: regions, error } = await serviceDb
    .from("mastr_regions")
    .select("region_id, name, population")
    .eq("level", "gemeinde")
    .order("population", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (regions ?? []).map((r) => r.region_id as string);

  const [kontaktRes, linkRes] = await Promise.all([
    serviceDb.from("kommunen_kontakt").select("region_id, website, kontakt_url").in("region_id", ids),
    serviceDb
      .from("utility_communes")
      .select("commune_id, rolle, utilities(id, name)")
      .in("commune_id", ids),
  ]);
  if (kontaktRes.error) return NextResponse.json({ error: kontaktRes.error.message }, { status: 500 });
  if (linkRes.error) return NextResponse.json({ error: linkRes.error.message }, { status: 500 });

  const kontakt = new Map((kontaktRes.data ?? []).map((r) => [r.region_id as string, r]));
  const versorgerJeGemeinde = new Map<string, { id: string; name: string }[]>();
  for (const l of linkRes.data ?? []) {
    if (!AREA_ROLLEN.includes(l.rolle as ZuordnungRolle)) continue;
    // Supabase liefert die verknüpfte Zeile je nach Beziehung als Objekt oder Liste.
    const u = Array.isArray(l.utilities) ? l.utilities[0] : l.utilities;
    if (!u) continue;
    const key = l.commune_id as string;
    const arr = versorgerJeGemeinde.get(key) ?? [];
    arr.push({ id: u.id as string, name: u.name as string });
    versorgerJeGemeinde.set(key, arr);
  }

  let rows = (regions ?? []).map((r) => {
    const id = r.region_id as string;
    const k = kontakt.get(id);
    return {
      regionId: id,
      name: r.name as string,
      einwohner: r.population as number,
      bundesland: bundeslandByAgs(id.slice(0, 2))?.short ?? "",
      website: (k?.website as string) ?? null,
      kontaktUrl: (k?.kontakt_url as string) ?? null,
      versorger: versorgerJeGemeinde.get(id) ?? [],
    };
  });
  if (nurOffene) rows = rows.filter((r) => r.versorger.length === 0);

  return NextResponse.json({
    rows,
    offen: rows.filter((r) => r.versorger.length === 0).length,
    total: rows.length,
  });
}
