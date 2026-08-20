import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../lib/supabase-server";
import { briefFuerGemeinde, istBriefFehler } from "../../../../lib/kommunen-brief";
import { isOutreachStatus } from "../../../../lib/outreach-status";
import { isAdminSession } from "../../../../lib/admin-guard";

// Admin-Cockpit für den Kommunen-Outreach. Liest/schreibt kommunen_kontakt
// (interne, nicht-öffentliche Tabelle) über den Service-Client. Auth läuft über
// die Session (Cookie) + ADMIN_EMAILS — dasselbe Muster wie /api/admin/status.
// Die Tabelle selbst hat kein anon-Read, deshalb nie der Browser-Client hier.

export const dynamic = "force-dynamic";


const PAGE_SIZE = 50;

// Eine Quelle für das Zeilen-Shape (GET, PATCH, POST liefern dasselbe zurück).
const SELECT =
  "region_id, website, email, kontakt_url, outreach_status, channel, contacted_at, responded_at, notes, draft_subject, draft_body, draft_generated_at, draft_manuell, gruene_pct, linke_pct, spd_pct, kampagne, charge, rollen_email, verantwortlich_funktion, verantwortlich_operativ, verwaltung_domain, thema_solar_url, thema_klima_url, thema_blatt_url, ask_variante, variante_manuell, versendet_variante, widget_anfrage, ref_token, ref_klicks, mastr_regions!inner(name, bezeichnung, population)";

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Atlas-Pfad je Zeile: EINE Abfrage für alle benötigten Slugs statt
  // atlasPathForRegionId je Gemeinde (das wären bis zu 100 Aufrufe pro Seite).
  // Die Hierarchie steckt im Schlüssel: 2 Stellen Bundesland, 5 Landkreis,
  // 8 Gemeinde.
  const zeilen = (data ?? []) as { region_id: string }[];
  const ids = new Set<string>();
  for (const z of zeilen) {
    ids.add(z.region_id.slice(0, 2));
    ids.add(z.region_id.slice(0, 5));
    ids.add(z.region_id);
  }
  const { data: slugRows } = await serviceDb
    .from("mastr_regions")
    .select("region_id, slug")
    .in("region_id", Array.from(ids));
  const slugOf = new Map((slugRows ?? []).map((r) => [r.region_id as string, r.slug as string | null]));
  const atlasPfad = (id: string): string | null => {
    const teile = [slugOf.get(id.slice(0, 2)), slugOf.get(id.slice(0, 5)), slugOf.get(id)];
    return teile.every(Boolean) ? `/solar-atlas/${teile.join("/")}` : null;
  };

  return NextResponse.json({
    rows: zeilen.map((z) => ({ ...z, atlas_path: atlasPfad(z.region_id) })),
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
    ask_variante?: string;
    widget_anfrage?: boolean;
  };
  if (!body.region_id) return NextResponse.json({ error: "region_id fehlt" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.outreach_status !== undefined) {
    if (!isOutreachStatus(body.outreach_status)) {
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
  if (body.draft_body !== undefined) {
    patch.draft_body = body.draft_body;
    // Von Hand gespeichert → überlebt eine spätere Neuerzeugung.
    patch.draft_manuell = true;
  }

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

  // Zusammensetzung des Briefes: lib/kommunen-brief.ts — dieselbe Funktion, die
  // das Versandpaket benutzt. Zwei Zusammensetzungen hießen zwei Fassungen
  // desselben Briefes, und die verschickte wäre die ungeprüfte.
  //
  // MIT der Empfängeradresse, obwohl das Cockpit nicht versendet: Sie bestimmt,
  // welche Quelle die Herkunftsangabe nach Art. 14 nennt. Ohne sie zeigte die
  // Vorschau einen anderen Satz als die Mail — und die Vorschau ist genau die
  // Fassung, die jemand abnimmt.
  const { data: kontakt } = await serviceDb
    .from("kommunen_kontakt")
    .select("rollen_email")
    .eq("region_id", region_id)
    .maybeSingle();
  const gebaut = await briefFuerGemeinde(region_id, kontakt?.rollen_email ?? null);
  if (istBriefFehler(gebaut)) {
    if (gebaut.grund === "gesperrt") {
      return NextResponse.json({ error: "Gemeinde ist gesperrt — kein Anschreiben." }, { status: 403 });
    }
    if (gebaut.grund === "unbekannt") {
      return NextResponse.json({ error: "Gemeinde nicht gefunden" }, { status: 404 });
    }
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }
  const { draft, variante } = gebaut;


  const { data, error } = await serviceDb
    .from("kommunen_kontakt")
    .update({
      draft_subject: draft.subject,
      draft_body: draft.body,
      draft_generated_at: new Date().toISOString(),
      draft_manuell: false,
      ask_variante: variante,
      updated_at: new Date().toISOString(),
    })
    .eq("region_id", region_id)
    .select(SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ row: data, draft });
}
