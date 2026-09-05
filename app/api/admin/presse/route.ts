import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../lib/supabase-server";
import { isAdminSession } from "../../../../lib/admin-guard";
import { istStand } from "../../../../lib/presse-stand";
import { alsCsv, type KontaktZeile, type MediumZeile } from "../../../../lib/presse-katalog";

// Ansicht für den Presse- und Creator-Katalog. Liest die internen Tabellen ohne
// öffentlichen Lesezugriff über den Dienst-Client — deshalb nie der
// Browser-Client hier. Auth über Session-Cookie plus Admin-Liste, dasselbe
// Muster wie bei Gemeinden, Versorgern und Fachbetrieben.
//
// GET liefert die Liste (oder den CSV-Abzug), PATCH ändert AUSSCHLIESSLICH
// Arbeitsstand und Notiz eines Kontakts. Alles andere gehört dem
// Erhebungslauf; würde diese Route Erhebungsfelder schreiben, hätte die Tabelle
// zwei Schreiber mit widersprüchlichen Annahmen.

export const dynamic = "force-dynamic";

/**
 * Eine Zeile der Liste ist ein MEDIUM, nicht ein Kontakt.
 *
 * Der Arbeitsstand hängt trotzdem am Kontakt — aufgeklappt bekommt jeder Mensch
 * seinen eigenen. Der Grund für den Schnitt: Ein Fachtitel trägt bis zu
 * dreißig Kontakte; eine Liste, in der pv magazine dreißig Zeilen belegt, lässt
 * sich weder überfliegen noch blättern. Gefiltert wird deshalb über das Medium,
 * und die Kontakte kommen als eingebettete Menge mit.
 */
const MEDIUM_SPALTEN =
  "domain, saat_name, saat_typ, saat_schwerpunkt, saat_gebiet, gruppe, paket, notiz, " +
  "titel, medientyp, themen, geschichten, reichweite, reichweite_quelle, ist_medium, " +
  "medium_grund, medium_merkmale, seiten, formular_url, impressum_url, prioritaet, " +
  "aufhaenger, gattung, gattung_hand, woerter, hinweis, eignung, eignung_grund, profil_at, fehler";

const KONTAKT_SPALTEN =
  "domain, schluessel, name, funktion, rang, mail, mail_art, formular_url, quelle_url, " +
  "seitenart, anker, fundstelle, geprueft_am, stand, notiz, stand_at";

type Filter = {
  eignung: string;
  gattung: string;
  paket: string;
  prio: string;
  geschichte: string;
  medium: string;
  kontaktart: string;
  stand: string;
  q: string;
  nurPerson: boolean;
};

function filterAus(sp: URLSearchParams): Filter {
  return {
    // VOREINSTELLUNG „fach". Der Betreiber am 04.09.2026: „ZEIT und COMPUTER
    // BILD brauche ich nicht anschreiben." Publikumsmedien bleiben im Bestand
    // — gelöscht wird nichts —, aber sie stehen nicht mehr zwischen den
    // Titeln, mit denen tatsächlich zu arbeiten ist.
    eignung: sp.get("eignung") ?? "",
    gattung: sp.get("gattung") ?? "fach",
    paket: sp.get("paket") ?? "",
    prio: sp.get("prio") ?? "",
    geschichte: sp.get("geschichte") ?? "",
    medium: sp.get("medium") ?? "medium",
    kontaktart: sp.get("kontaktart") ?? "",
    stand: sp.get("stand") ?? "",
    q: (sp.get("q") ?? "").trim(),
    nurPerson: sp.get("person") === "1",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function medienAbfrage(db: any, f: Filter, zaehlen: boolean) {
  let q = db
    .from("presse_medien")
    .select(MEDIUM_SPALTEN, zaehlen ? { count: "exact" } : undefined);
  // GEFILTERT WIRD AUF DIE EFFEKTIVE EINORDNUNG: Wo eine Handentscheidung
  // steht, gilt sie; sonst die Messung. Nur auf die Messung zu filtern hieße,
  // dass eine Korrektur von Hand in der Ansicht folgenlos bleibt — die Zeile
  // stünde weiter unter der alten Einordnung.
  if (f.gattung) {
    q = q.or(`gattung_hand.eq.${f.gattung},and(gattung_hand.is.null,gattung.eq.${f.gattung})`);
  }
  if (f.eignung) q = q.eq("eignung", f.eignung);
  if (f.paket) q = q.eq("paket", Number(f.paket));
  if (f.prio) q = q.eq("prioritaet", f.prio);
  if (f.medium) q = q.eq("ist_medium", f.medium);
  // „geschichten" ist eine Textliste — ein Medium trägt regelmäßig mehrere.
  if (f.geschichte) q = q.contains("geschichten", [f.geschichte]);
  if (f.q) {
    // Prozent- und Klammerzeichen zerlegen den PostgREST-Ausdruck, deshalb raus.
    const sicher = f.q.replace(/[%,()]/g, " ");
    q = q.or(`domain.ilike.%${sicher}%,titel.ilike.%${sicher}%,saat_name.ilike.%${sicher}%,saat_gebiet.ilike.%${sicher}%`);
  }
  return q;
}

export async function GET(req: NextRequest) {
  if (!(await isAdminSession()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const sp = req.nextUrl.searchParams;
  const f = filterAus(sp);
  const alsDatei = sp.get("format") === "csv";

  // KEINE SEITENAUFTEILUNG — und das ist eine Entscheidung, keine Bequemlichkeit.
  //
  // Die Tabelle des internen Bereichs sortiert im Browser. Mit Seitenaufteilung
  // sortierte ein Klick auf den Spaltenkopf nur die gerade sichtbaren fünfzig
  // Zeilen und zeigte damit etwas anderes an, als die Überschrift verspricht —
  // genau die Falle, die in der Fachbetriebe-Route ausgeschrieben steht. Der
  // Bestand ist mit knapp vierhundert Medien klein genug, dass die Alternative
  // nichts kostet.
  //
  // Wächst er in eine Größenordnung, in der das nicht mehr stimmt, ist die
  // Antwort eine Sortierung in der Datenbank UND eine Tabelle, die nicht selbst
  // sortiert — nicht beides nebeneinander.
  const query = medienAbfrage(serviceDb, f, true)
    .order("prioritaet", { ascending: true, nullsFirst: false })
    .order("titel", { ascending: true, nullsFirst: false })
    .order("domain");

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const medien = (data ?? []) as unknown as MediumZeile[];

  // Kontakte in einem Zug für die gezeigten Medien. Ein Aufruf je Medium wären
  // fünfzig Rundreisen zur Datenbank — dieselbe Rechnung wie im Atlas, wo genau
  // das die Seiten an die Notbremse gebracht hat.
  const domains = medien.map((m) => m.domain);
  let kontakte: KontaktZeile[] = [];
  if (domains.length) {
    let kq = serviceDb.from("presse_kontakte").select(KONTAKT_SPALTEN).in("domain", domains);
    if (f.kontaktart) kq = kq.eq("mail_art", f.kontaktart);
    if (f.stand) kq = kq.eq("stand", f.stand);
    if (f.nurPerson) kq = kq.not("name", "is", null);
    const { data: kd, error: kerr } = await kq.order("rang", { ascending: false });
    if (kerr) return NextResponse.json({ error: kerr.message }, { status: 500 });
    kontakte = (kd ?? []) as unknown as KontaktZeile[];
  }

  if (alsDatei) {
    const csv = alsCsv(medien, kontakte);
    return new NextResponse("﻿" + csv, {
      headers: {
        // Byte-Reihenfolge-Marke voran, sonst zeigt Excel unter Windows aus
        // „Förderung" ein „FÃ¶rderung". Kostet nichts und spart die Rückfrage.
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="presse-katalog-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // Der Bestand OHNE jeden Filter — als Bezugsgröße für die Ansicht. Eine Zahl
  // ohne ihren Nenner behauptet sonst etwas anderes, als sie misst: 23 gezeigte
  // Medien sehen wie ein kleiner Bestand aus, nicht wie ein gesetzter Filter.
  const { count: bestand } = await serviceDb
    .from("presse_medien")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({ medien, kontakte, gesamt: count ?? 0, bestand: bestand ?? 0 });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminSession()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as {
    domain?: string;
    schluessel?: string;
    stand?: string;
    notiz?: string | null;
    gattungHand?: string | null;
    eignung?: string;
    eignungGrund?: string | null;
  } | null;
  if (!body?.domain) return NextResponse.json({ error: "domain fehlt" }, { status: 400 });

  // Die Einordnung von Hand hängt am MEDIUM, nicht am Kontakt — deshalb ein
  // eigener Zweig. Sie schreibt ausschließlich die Handspalte; die gemessene
  // bleibt stehen, damit der Vergleich „was hat die Messung gesagt" möglich
  // bleibt.
  // Das Handurteil über das MEDIUM — eigener Zweig, weil es nicht am Kontakt
  // hängt. Der Erhebungslauf schreibt diese Spalten nie.
  if (body.eignung !== undefined || body.eignungGrund !== undefined) {
    const feld: Record<string, unknown> = { eignung_at: new Date().toISOString() };
    if (body.eignung !== undefined) {
      if (!istStand(body.eignung))
        return NextResponse.json({ error: "unbekannter Stand" }, { status: 400 });
      feld.eignung = body.eignung;
    }
    if (body.eignungGrund !== undefined) feld.eignung_grund = body.eignungGrund?.slice(0, 500) || null;
    const { data, error } = await serviceDb
      .from("presse_medien")
      .update(feld)
      .eq("domain", body.domain)
      .select(MEDIUM_SPALTEN)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ medium: data });
  }

  if (body.gattungHand !== undefined) {
    const wert = body.gattungHand;
    if (wert !== null && wert !== "fach" && wert !== "publikum") {
      return NextResponse.json({ error: "unbekannte Einordnung" }, { status: 400 });
    }
    const { data, error } = await serviceDb
      .from("presse_medien")
      .update({ gattung_hand: wert })
      .eq("domain", body.domain)
      .select(MEDIUM_SPALTEN)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ medium: data });
  }

  if (!body?.schluessel)
    return NextResponse.json({ error: "schluessel fehlt" }, { status: 400 });

  // Nur die zwei Felder, die dem Menschen gehören. Eine Erlaubnisliste statt
  // eines Durchreichens des Rumpfs: Sonst könnte ein Tippfehler im Browser eine
  // Erhebungsspalte überschreiben, und der Fehler wäre in der Tabelle nicht mehr
  // von einem echten Fund zu unterscheiden.
  const feld: Record<string, unknown> = { stand_at: new Date().toISOString() };
  if (body.stand !== undefined) {
    if (!istStand(body.stand))
      return NextResponse.json({ error: "unbekannter Stand" }, { status: 400 });
    feld.stand = body.stand;
  }
  if (body.notiz !== undefined) feld.notiz = body.notiz?.slice(0, 2000) || null;

  const { data, error } = await serviceDb
    .from("presse_kontakte")
    .update(feld)
    .eq("domain", body.domain)
    .eq("schluessel", body.schluessel)
    .select(KONTAKT_SPALTEN)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kontakt: data });
}
