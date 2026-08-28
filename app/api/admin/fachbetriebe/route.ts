import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../lib/supabase-server";
import { isAdminSession } from "../../../../lib/admin-guard";
import { istStand } from "../../../../lib/fachbetrieb-stand";

// Ansicht für die erhobenen PV-Fachbetriebe. Liest `fachbetriebe` (interne
// Tabelle ohne öffentlichen Lesezugriff) über den Service-Client — deshalb nie
// der Browser-Client hier. Auth über Session-Cookie plus Admin-Liste, dasselbe
// Muster wie bei den Gemeinden und den Versorgern.
//
// GET liefert die Liste, PATCH ändert AUSSCHLIESSLICH Arbeitsstand und Notiz.
// Alles andere gehört dem Erhebungslauf; würde diese Route Erhebungsfelder
// schreiben, hätte die Tabelle zwei Schreiber mit widersprüchlichen Annahmen.

export const dynamic = "force-dynamic";

const SEITE = 50;

const SPALTEN =
  "domain, firmenname, rechtsform, hr_nummer, hr_gericht, strasse, plz, ort, region_id, kreis_id, " +
  "email, telefon, kontakt_url, kontakt_formular, impressum_url, " +
  "meisterbetrieb, innung, handwerkskammer, installateurverzeichnis, zertifikate, " +
  "gruendungsjahr, bewertung_wert, bewertung_anzahl, bewertung_quelle, " +
  "geschaeftsfelder, art, art_grund, kreise_gesehen, stand, notiz, stand_at, profil_fehler";

export async function GET(req: NextRequest) {
  if (!(await isAdminSession()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const sp = req.nextUrl.searchParams;
  const bl = sp.get("bl") ?? "";
  const stand = sp.get("stand") ?? "";
  const art = sp.get("art") ?? "betrieb";
  const q = (sp.get("q") ?? "").trim();
  const nurKontakt = sp.get("kontakt") === "1";
  const nurMeister = sp.get("meister") === "1";
  const sortieren = sp.get("sort") ?? "";
  const seite = Math.max(0, parseInt(sp.get("page") ?? "0", 10) || 0);

  let query = serviceDb.from("fachbetriebe").select(SPALTEN, { count: "exact" });

  if (art) query = query.eq("art", art);
  if (stand) query = query.eq("stand", stand);
  // Das Bundesland steckt in den ersten beiden Stellen des Kreisschlüssels.
  // Gefiltert wird darüber und nicht über den Ort: Ortsnamen wiederholen sich
  // (Neustadt gibt es ein Dutzend Mal), Schlüssel nicht.
  if (bl) query = query.like("kreis_id", `${bl}%`);
  if (nurMeister) query = query.eq("meisterbetrieb", true);
  if (nurKontakt) {
    // Erreichbar heißt: E-Mail ODER Telefon ODER Formular. Ein Betrieb, der nur
    // ein Formular hat, ist erreichbar — bei den Gemeinden war genau das der
    // Regelfall.
    query = query.or("email.not.is.null,telefon.not.is.null,kontakt_formular.is.true");
  }
  if (q) {
    const sicher = q.replace(/[%,()]/g, " ");
    query = query.or(
      `domain.ilike.%${sicher}%,firmenname.ilike.%${sicher}%,ort.ilike.%${sicher}%`,
    );
  }

  if (sortieren === "gruendung") query = query.order("gruendungsjahr", { ascending: true, nullsFirst: false });
  else if (sortieren === "streuung") query = query.order("kreise_gesehen", { ascending: false });
  else query = query.order("domain");

  query = query.range(seite * SEITE, seite * SEITE + SEITE - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zeilen: data ?? [], gesamt: count ?? 0, seite, proSeite: SEITE });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminSession()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as {
    domain?: string;
    stand?: string;
    notiz?: string | null;
  } | null;
  if (!body?.domain) return NextResponse.json({ error: "domain fehlt" }, { status: 400 });

  // Nur die zwei Felder, die dem Menschen gehören. Eine Erlaubnisliste statt
  // eines Durchreichens des Rumpfs: Sonst könnte ein Tippfehler im Browser eine
  // Erhebungsspalte überschreiben, und der Fehler wäre in der Tabelle nicht
  // mehr von einem echten Fund zu unterscheiden.
  const feld: Record<string, unknown> = { stand_at: new Date().toISOString() };
  if (body.stand !== undefined) {
    if (!istStand(body.stand))
      return NextResponse.json({ error: "unbekannter Stand" }, { status: 400 });
    feld.stand = body.stand;
  }
  if (body.notiz !== undefined) feld.notiz = body.notiz?.slice(0, 2000) || null;

  const { data, error } = await serviceDb
    .from("fachbetriebe")
    .update(feld)
    .eq("domain", body.domain)
    .select(SPALTEN)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zeile: data });
}
