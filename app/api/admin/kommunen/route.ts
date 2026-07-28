import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../lib/supabase-server";
import { renderOutreachDraft } from "../../../../lib/kommunen-outreach-draft";
import { buildHookIndex } from "../../../../lib/awards-server";
import { DEFAULT_HOOK_SETTINGS } from "../../../../lib/award-hook";
import { atlasPathForRegionId } from "../../../../lib/atlas";
import { getRegionAtlasData } from "../../../../lib/mastr-data";
import { askVariante, type AskVariante } from "../../../../lib/kommunen-ask";

const SITE_URL = "https://solar-check.io";

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
// „gesperrt" ist ein harter Sperr-Status: keine Entwurf-Erzeugung mehr (nach
// Widerspruch/Unterlassung). Bewusst als Status, damit ein Admin ihn bei Irrtum
// wieder ändern kann — der Schutz sitzt in der Draft-Erzeugung (POST unten).
const STATUSES = ["offen", "entwurf", "kontaktiert", "geantwortet", "zu", "gesperrt"];

// Eine Quelle für das Zeilen-Shape (GET, PATCH, POST liefern dasselbe zurück).
const SELECT =
  "region_id, website, email, kontakt_url, outreach_status, channel, contacted_at, responded_at, notes, draft_subject, draft_body, draft_generated_at, gruene_pct, linke_pct, spd_pct, kampagne, charge, rollen_email, verantwortlich_funktion, verantwortlich_operativ, verwaltung_domain, thema_solar_url, thema_klima_url, thema_blatt_url, ask_variante, variante_manuell, versendet_variante, widget_anfrage, ref_token, ref_klicks, mastr_regions!inner(name, bezeichnung, population)";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const sp = req.nextUrl.searchParams;
  const bl = sp.get("bl") ?? ""; // 2-stelliger Bundesland-AGS
  const status = sp.get("status") ?? "";
  const hasLink = sp.get("hasLink") === "1";
  const q = (sp.get("q") ?? "").trim();
  const sort = sp.get("sort") ?? "";
  const kampagne = sp.get("kampagne") ?? "";
  const charge = sp.get("charge") ?? "";
  const page = Math.max(0, parseInt(sp.get("page") ?? "0", 10) || 0);

  // Immer inner-join auf mastr_regions (jede Zeile hat per FK eine Gemeinde) —
  // liefert Name/Einwohner und erlaubt die Namenssuche auf Top-Ebene.
  let query = serviceDb.from("kommunen_kontakt").select(SELECT, { count: "exact" });

  // Sortierung: nach Grünen-/Linke-Anteil (Outreach-Priorisierung) oder Standard.
  if (sort === "gruen") query = query.order("gruene_pct", { ascending: false, nullsFirst: false });
  else if (sort === "links") query = query.order("linke_pct", { ascending: false, nullsFirst: false });
  else if (kampagne) query = query.order("charge").order("region_id");
  else query = query.order("region_id");

  query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (bl) query = query.like("region_id", `${bl}%`);
  if (status) query = query.eq("outreach_status", status);
  if (hasLink) query = query.not("kontakt_url", "is", null);
  if (kampagne) query = query.eq("kampagne", kampagne);
  if (charge) query = query.eq("charge", parseInt(charge, 10));
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
    draft_subject?: string;
    draft_body?: string;
    ask_variante?: string;
    widget_anfrage?: boolean;
  };
  if (!body.region_id) return NextResponse.json({ error: "region_id fehlt" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.outreach_status !== undefined) {
    if (!STATUSES.includes(body.outreach_status)) {
      return NextResponse.json({ error: "unbekannter Status" }, { status: 400 });
    }
    patch.outreach_status = body.outreach_status;
    // Kontakt-/Antwortdatum an den Statuswechsel koppeln (nur setzen, nie leeren).
    if (body.outreach_status === "kontaktiert") {
      patch.contacted_at = new Date().toISOString();
      // Variante zum VERSANDZEITPUNKT einfrieren. Wer die Zuordnung später
      // ändert, darf die Auswertung nicht rückwirkend kippen — sonst steht am
      // Ende eine Bilanz, die nie verschickt wurde.
      const { data: vorher } = await serviceDb
        .from("kommunen_kontakt")
        .select("ask_variante, versendet_variante")
        .eq("region_id", body.region_id)
        .maybeSingle();
      if (!vorher?.versendet_variante && vorher?.ask_variante) {
        patch.versendet_variante = vorher.ask_variante;
      }
    }
    if (body.outreach_status === "geantwortet") patch.responded_at = new Date().toISOString();
  }
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.channel !== undefined) patch.channel = body.channel || null;
  if (body.ask_variante !== undefined) {
    if (!["nur_meldung", "meldung_plus_widget"].includes(body.ask_variante)) {
      return NextResponse.json({ error: "unbekannte Variante" }, { status: 400 });
    }
    patch.ask_variante = body.ask_variante;
    patch.variante_manuell = true; // von Hand gesetzt → kein Lauf überschreibt sie
  }
  if (body.widget_anfrage !== undefined) patch.widget_anfrage = body.widget_anfrage;
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
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const { region_id } = (await req.json()) as { region_id?: string };
  if (!region_id) return NextResponse.json({ error: "region_id fehlt" }, { status: 400 });

  // Name + Atlas-Pfad + der Anschreiben-Aufhänger aus der Award-Hook-Logik (eine
  // Quelle mit der Vorschau /admin/awards/anschreiben — kein Drift). Der Index ist
  // prozess-lokal memoisiert, der Lookup je Gemeinde damit billig.
  const [{ data: reg }, { data: leadRow }, path, index] = await Promise.all([
    serviceDb.from("mastr_regions").select("name, bezeichnung, population, slug").eq("region_id", region_id).single(),
    serviceDb
      .from("kommunen_kontakt")
      .select("outreach_status, verantwortlich_funktion, verantwortlich_operativ, ask_variante, ref_token")
      .eq("region_id", region_id)
      .maybeSingle(),
    atlasPathForRegionId(region_id),
    buildHookIndex(DEFAULT_HOOK_SETTINGS),
  ]);
  if (!reg) return NextResponse.json({ error: "Gemeinde nicht gefunden" }, { status: 404 });
  // Harte Sperre: für gesperrte Gemeinden nie ein Anschreiben erzeugen.
  if (leadRow?.outreach_status === "gesperrt") {
    return NextResponse.json({ error: "Gemeinde ist gesperrt — kein Anschreiben." }, { status: 403 });
  }

  // Zahlen für die Meldung aus DERSELBEN Quelle wie die Atlas-Seite — sonst
  // steht in der Meldung eine andere Zahl als auf der verlinkten Seite.
  const atlas = await getRegionAtlasData(region_id);
  const hook = index.rows.find((r) => r.regionId === region_id);

  // Der Link im Anschreiben geht über die zählende Weiterleitung, wenn ein
  // Token vergeben ist — sonst direkt auf die Seite.
  const zielUrl = leadRow?.ref_token
    ? `${SITE_URL}/r/${leadRow.ref_token}`
    : path
      ? `${SITE_URL}${path}`
      : null;

  const variante: AskVariante =
    (leadRow?.ask_variante as AskVariante | null) ??
    askVariante({ population: reg.population, operativeStelle: !!leadRow?.verantwortlich_operativ });

  const draft = renderOutreachDraft({
    name: reg.name,
    pageUrl: zielUrl,
    betreff: hook?.betreff ?? `So steht ${reg.name} beim Solar-Ausbau da`,
    einstieg:
      hook?.einstieg ??
      `Wir haben den Solarausbau in ${reg.name} aus den amtlichen Anlagendaten aufbereitet — hier der Überblick für Ihre Gemeinde.`,
    variante,
    // Nur eine OPERATIVE Stelle wird direkt adressiert. Der Bürgermeister steht
    // zwar fast immer im Impressum, betreut die Website aber nicht.
    funktion: leadRow?.verantwortlich_operativ ? leadRow.verantwortlich_funktion : null,
    gattung: reg.bezeichnung,
    wo: hook?.wo ?? "in der Region",
    bestleistung: hook?.bestleistung ?? "einen bemerkenswerten Solar-Ausbau",
    rang: hook?.rank && hook?.total ? { platz: hook.rank, von: hook.total } : null,
    zahlen: {
      anlagen: atlas.solar.total_count,
      leistungKwp: atlas.solar.total_kwp,
      wpProKopf: reg.population ? Math.round((atlas.solar.total_kwp * 1000) / reg.population) : null,
      stand: atlas.data_as_of,
    },
  });

  const { data, error } = await serviceDb
    .from("kommunen_kontakt")
    .update({
      draft_subject: draft.subject,
      draft_body: draft.body,
      draft_generated_at: new Date().toISOString(),
      ask_variante: variante,
      updated_at: new Date().toISOString(),
    })
    .eq("region_id", region_id)
    .select(SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ row: data, draft });
}
