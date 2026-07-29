import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../lib/supabase-server";
import { renderOutreachDraft } from "../../../../lib/kommunen-outreach-draft";
import { buildHookIndex } from "../../../../lib/awards-server";
import { DEFAULT_HOOK_SETTINGS } from "../../../../lib/award-hook";
import { atlasPathForRegionId } from "../../../../lib/atlas";
import { isOutreachStatus } from "../../../../lib/outreach-status";
import { isAdminSession } from "../../../../lib/admin-guard";

const SITE_URL = "https://solar-check.io";

// Admin-Cockpit für den Kommunen-Outreach. Liest/schreibt kommunen_kontakt
// (interne, nicht-öffentliche Tabelle) über den Service-Client. Auth läuft über
// die Session (Cookie) + ADMIN_EMAILS — dasselbe Muster wie /api/admin/status.
// Die Tabelle selbst hat kein anon-Read, deshalb nie der Browser-Client hier.

export const dynamic = "force-dynamic";


const PAGE_SIZE = 50;

// Eine Quelle für das Zeilen-Shape (GET, PATCH, POST liefern dasselbe zurück).
const SELECT =
  "region_id, website, email, kontakt_url, outreach_status, channel, contacted_at, responded_at, notes, draft_subject, draft_body, draft_generated_at, gruene_pct, linke_pct, spd_pct, mastr_regions!inner(name, bezeichnung, population)";

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const sp = req.nextUrl.searchParams;
  const bl = sp.get("bl") ?? ""; // 2-stelliger Bundesland-AGS
  const status = sp.get("status") ?? "";
  const hasLink = sp.get("hasLink") === "1";
  const q = (sp.get("q") ?? "").trim();
  const sort = sp.get("sort") ?? "";
  const page = Math.max(0, parseInt(sp.get("page") ?? "0", 10) || 0);

  // Immer inner-join auf mastr_regions (jede Zeile hat per FK eine Gemeinde) —
  // liefert Name/Einwohner und erlaubt die Namenssuche auf Top-Ebene.
  let query = serviceDb.from("kommunen_kontakt").select(SELECT, { count: "exact" });

  // Sortierung: nach Grünen-/Linke-Anteil (Outreach-Priorisierung) oder Standard.
  if (sort === "gruen") query = query.order("gruene_pct", { ascending: false, nullsFirst: false });
  else if (sort === "links") query = query.order("linke_pct", { ascending: false, nullsFirst: false });
  else query = query.order("region_id");

  query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

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
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const body = (await req.json()) as {
    region_id?: string;
    outreach_status?: string;
    notes?: string;
    channel?: string;
    draft_subject?: string;
    draft_body?: string;
  };
  if (!body.region_id) return NextResponse.json({ error: "region_id fehlt" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.outreach_status !== undefined) {
    if (!isOutreachStatus(body.outreach_status)) {
      return NextResponse.json({ error: "unbekannter Status" }, { status: 400 });
    }
    patch.outreach_status = body.outreach_status;
    // Kontakt-/Antwortdatum an den Statuswechsel koppeln (nur setzen, nie leeren).
    if (body.outreach_status === "kontaktiert") patch.contacted_at = new Date().toISOString();
    if (body.outreach_status === "geantwortet") patch.responded_at = new Date().toISOString();
  }
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.channel !== undefined) patch.channel = body.channel || null;
  if (body.draft_subject !== undefined) patch.draft_subject = body.draft_subject;
  if (body.draft_body !== undefined) patch.draft_body = body.draft_body;

  const { data, error } = await serviceDb
    .from("kommunen_kontakt")
    .update(patch)
    .eq("region_id", body.region_id)
    .select(SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ row: data });
}

// Anschreiben aus dem Template + echten Solar-Zahlen der Gemeinde generieren und
// als Entwurf speichern. Kein LLM — deterministisch, sofort.
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const { region_id } = (await req.json()) as { region_id?: string };
  if (!region_id) return NextResponse.json({ error: "region_id fehlt" }, { status: 400 });

  // Name + Atlas-Pfad + der Anschreiben-Aufhänger aus der Award-Hook-Logik (eine
  // Quelle mit der Vorschau /admin/awards/anschreiben — kein Drift). Der Index ist
  // prozess-lokal memoisiert, der Lookup je Gemeinde damit billig.
  const [{ data: reg }, { data: leadRow }, path, index] = await Promise.all([
    serviceDb.from("mastr_regions").select("name").eq("region_id", region_id).single(),
    serviceDb.from("kommunen_kontakt").select("outreach_status").eq("region_id", region_id).maybeSingle(),
    atlasPathForRegionId(region_id),
    buildHookIndex(DEFAULT_HOOK_SETTINGS),
  ]);
  if (!reg) return NextResponse.json({ error: "Gemeinde nicht gefunden" }, { status: 404 });
  // Harte Sperre: für gesperrte Gemeinden nie ein Anschreiben erzeugen.
  if (leadRow?.outreach_status === "gesperrt") {
    return NextResponse.json({ error: "Gemeinde ist gesperrt — kein Anschreiben." }, { status: 403 });
  }

  const hook = index.rows.find((r) => r.regionId === region_id);
  const draft = renderOutreachDraft({
    name: reg.name,
    pageUrl: path ? `${SITE_URL}${path}` : null,
    betreff: hook?.betreff ?? `So steht ${reg.name} beim Solar-Ausbau da`,
    einstieg:
      hook?.einstieg ??
      `Wir haben den Solarausbau in ${reg.name} aus den amtlichen Anlagendaten aufbereitet — hier der Überblick für Ihre Gemeinde.`,
  });

  const { data, error } = await serviceDb
    .from("kommunen_kontakt")
    .update({
      draft_subject: draft.subject,
      draft_body: draft.body,
      draft_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("region_id", region_id)
    .select(SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ row: data, draft });
}
