import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../lib/supabase-server";

// Admin-Cockpit für den Kommunen-Outreach. Liest/schreibt kommunen_kontakt
// (interne, nicht-öffentliche Tabelle) über den Service-Client. Auth läuft über
// die Session (Cookie) + ADMIN_EMAILS — dasselbe Muster wie /api/admin/status.
// Die Tabelle selbst hat kein anon-Read, deshalb nie der Browser-Client hier.

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function isAdmin(): Promise<boolean> {
  const { createClient } = await import("../../../../lib/supabase-server-component");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && ADMIN_EMAILS.includes(user.email?.toLowerCase() || "");
}

const PAGE_SIZE = 50;
const STATUSES = ["offen", "entwurf", "kontaktiert", "geantwortet", "zu"];

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const sp = req.nextUrl.searchParams;
  const bl = sp.get("bl") ?? ""; // 2-stelliger Bundesland-AGS
  const status = sp.get("status") ?? "";
  const hasLink = sp.get("hasLink") === "1";
  const q = (sp.get("q") ?? "").trim();
  const page = Math.max(0, parseInt(sp.get("page") ?? "0", 10) || 0);

  // Immer inner-join auf mastr_regions (jede Zeile hat per FK eine Gemeinde) —
  // liefert Name/Einwohner und erlaubt die Namenssuche auf Top-Ebene.
  let query = serviceDb
    .from("kommunen_kontakt")
    .select(
      "region_id, website, email, kontakt_url, outreach_status, channel, contacted_at, responded_at, notes, mastr_regions!inner(name, bezeichnung, population)",
      { count: "exact" },
    )
    .order("region_id")
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (bl) query = query.like("region_id", `${bl}%`);
  if (status) query = query.eq("outreach_status", status);
  if (hasLink) query = query.not("kontakt_url", "is", null);
  if (q) query = query.ilike("mastr_regions.name", `%${q}%`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    rows: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}

// Einzelne Gemeinde aktualisieren (Status/Notiz/Kanal). Zeitstempel werden aus
// dem Statuswechsel abgeleitet, nicht vom Client diktiert.
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const body = (await req.json()) as {
    region_id?: string;
    outreach_status?: string;
    notes?: string;
    channel?: string;
  };
  if (!body.region_id) return NextResponse.json({ error: "region_id fehlt" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.outreach_status !== undefined) {
    if (!STATUSES.includes(body.outreach_status)) {
      return NextResponse.json({ error: "unbekannter Status" }, { status: 400 });
    }
    patch.outreach_status = body.outreach_status;
    // Kontakt-/Antwortdatum an den Statuswechsel koppeln (nur setzen, nie leeren).
    if (body.outreach_status === "kontaktiert") patch.contacted_at = new Date().toISOString();
    if (body.outreach_status === "geantwortet") patch.responded_at = new Date().toISOString();
  }
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.channel !== undefined) patch.channel = body.channel || null;

  const { data, error } = await serviceDb
    .from("kommunen_kontakt")
    .update(patch)
    .eq("region_id", body.region_id)
    .select(
      "region_id, website, email, kontakt_url, outreach_status, channel, contacted_at, responded_at, notes, mastr_regions!inner(name, bezeichnung, population)",
    )
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ row: data });
}
