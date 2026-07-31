import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../../lib/supabase-server";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { invalidateUtilityBundle } from "../../../../../lib/utilities-server";
import { ZUORDNUNG_QUELLE_LABEL, ZUORDNUNG_ROLLE_LABEL } from "../../../../../lib/utilities";

// Gemeinde ↔ Versorger zuordnen und wieder lösen.
//
// Die Herkunft (`zuordnung_quelle`) ist Pflicht und hat KEINEN stillen
// Standardwert „recherchiert": wer nichts angibt, bekommt „vermutet". Lieber ein
// Aggregat, das ehrlich als unsicher gilt, als eines, das Sicherheit vortäuscht.

export const dynamic = "force-dynamic";

const ROLLEN = Object.keys(ZUORDNUNG_ROLLE_LABEL);
const QUELLEN = Object.keys(ZUORDNUNG_QUELLE_LABEL);

// Gemeinde-Suche für das Zuordnen (Name → Gemeindeschlüssel).
export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ rows: [] });

  const { data, error } = await serviceDb
    .from("mastr_regions")
    .select("region_id, name, bezeichnung, population")
    .eq("level", "gemeinde")
    .ilike("name", `%${q}%`)
    .order("population", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    rows: (data ?? []).map((r) => ({
      regionId: r.region_id as string,
      name: r.name as string,
      bezeichnung: (r.bezeichnung as string) ?? "Gemeinde",
      einwohner: r.population as number,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const body = (await req.json()) as {
    utility_id?: string;
    commune_id?: string;
    rolle?: string;
    zuordnung_quelle?: string;
  };
  if (!body.utility_id || !body.commune_id) {
    return NextResponse.json({ error: "utility_id oder commune_id fehlt" }, { status: 400 });
  }
  if (!/^\d{8}$/.test(body.commune_id)) {
    return NextResponse.json({ error: "commune_id ist kein 8-stelliger Gemeindeschlüssel" }, { status: 400 });
  }

  const rolle = body.rolle && ROLLEN.includes(body.rolle) ? body.rolle : "versorgungsgebiet";
  const quelle = body.zuordnung_quelle && QUELLEN.includes(body.zuordnung_quelle) ? body.zuordnung_quelle : "vermutet";

  const { error } = await serviceDb
    .from("utility_communes")
    .upsert(
      { utility_id: body.utility_id, commune_id: body.commune_id, rolle, zuordnung_quelle: quelle },
      { onConflict: "utility_id,commune_id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateUtilityBundle();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const sp = req.nextUrl.searchParams;
  const utilityId = sp.get("utility_id");
  const communeId = sp.get("commune_id");
  if (!utilityId || !communeId) {
    return NextResponse.json({ error: "utility_id oder commune_id fehlt" }, { status: 400 });
  }

  const { error } = await serviceDb
    .from("utility_communes")
    .delete()
    .eq("utility_id", utilityId)
    .eq("commune_id", communeId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateUtilityBundle();
  return NextResponse.json({ ok: true });
}
