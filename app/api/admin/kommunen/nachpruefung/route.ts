import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../../lib/supabase-server";
import { briefFuerGemeinde, istBriefFehler } from "../../../../../lib/kommunen-brief";
import { istAdminOderCron } from "../../../../../lib/admin-guard";
import { SCHUEBE, AKTUELLER_SCHUB } from "../../../../../lib/kommunen-testballon";

// Die BEREITS VERSCHICKTEN Briefe, damit sie nachgeprüft werden können.
//
// DIE LÜCKE, DIE DAS SCHLIESST: Vor dem Versand hält die Vorabprüfung jeden
// Brief gegen die Seite, die er verlinkt — sagt die Meldung „Platz 1 von 5",
// muss die Rangliste das hergeben. Diese Prüfung zieht ihre Briefe aus dem
// Versandpaket, und das überspringt jede Gemeinde, die schon angeschrieben
// wurde. Sobald ein Brief draußen war, konnte ihn also niemand mehr prüfen.
//
// Das ist keine Formalie: Die Zahlen auf den Seiten werden mit jedem Lauf der
// Anlagendaten neu gerechnet, die Briefe stehen fest. Eine Aussage, die beim
// Versand stimmte, kann später von unserer eigenen verlinkten Seite widerlegt
// werden — und der Empfänger sieht das mit einem Klick, womöglich Wochen
// später, wenn er die Meldung veröffentlichen will. Genau davor schützt die
// Regel „ein Brief darf nicht behaupten, was die verlinkte Seite widerlegt".
//
// WAS DIESE ROUTE BEWUSST NICHT LIEFERT: die Empfängeradresse. Sie ist keine
// zweite Fassung des Versandpakets und darf nie eine werden — ohne Adresse
// kann kein Versandweg sie benutzen, auch nicht versehentlich. Wer hier je
// einen Empfänger ergänzt, baut einen zweiten Sendepfad an der Sperre vorbei,
// die verhindert, dass eine Gemeinde zweimal denselben Brief bekommt.
//
// Zurückgegeben wird der GESPEICHERTE Text — der, den die Gemeinde bekommen
// hat —, nicht ein heute neu gebauter. Ein neu gebauter Brief würde gegen die
// heutige Seite natürlich passen und die Prüfung wertlos machen.
//
// GET /api/admin/kommunen/nachpruefung?schub=…

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!(await istAdminOderCron(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const sp = req.nextUrl.searchParams;
  const schluessel = sp.get("schub") ?? AKTUELLER_SCHUB;
  // „alle" prüft jeden verschickten Brief, egal aus welchem Schub — der
  // Normalfall für einen wiederkehrenden Lauf. Ein Schub-Name grenzt ein.
  const alle = schluessel === "alle";
  if (!alle && !SCHUEBE[schluessel]) {
    return NextResponse.json({ error: `Unbekannter Schub „${schluessel}"` }, { status: 400 });
  }

  type Zeile = {
    region_id: string;
    kampagne: string | null;
    charge: number | null;
    contacted_at: string | null;
    draft_subject: string | null;
    draft_body: string | null;
    mastr_regions: { name: string } | { name: string }[];
  };
  const zeilen: Zeile[] = [];
  for (let von = 0; ; von += 1000) {
    let q = serviceDb
      .from("kommunen_kontakt")
      .select("region_id, kampagne, charge, contacted_at, draft_subject, draft_body, mastr_regions!inner(name)")
      .not("contacted_at", "is", null)
      .order("region_id")
      .range(von, von + 999);
    if (!alle) q = q.eq("kampagne", schluessel);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) break;
    zeilen.push(...(data as unknown as Zeile[]));
    if (data.length < 1000) break;
  }

  const briefe: {
    region_id: string;
    name: string;
    kampagne: string | null;
    charge: number | null;
    contacted_at: string | null;
    subject: string;
    body: string;
    seite_url: string | null;
    rangliste_url: string | null;
    stand: string | null;
  }[] = [];
  const ohneText: { region_id: string; name: string; grund: string }[] = [];

  for (const z of zeilen) {
    const reg = Array.isArray(z.mastr_regions) ? z.mastr_regions[0] : z.mastr_regions;
    const name = reg?.name ?? z.region_id;
    if (!z.draft_body) {
      // Ein verschickter Brief ohne gespeicherten Text ist selbst ein Befund:
      // Was dort stand, lässt sich nicht mehr nachprüfen. Stillschweigend
      // überspringen hieße, die Lücke ein zweites Mal zu bauen.
      ohneText.push({ region_id: z.region_id, name, grund: "kein gespeicherter Brieftext" });
      continue;
    }
    // Die beiden Adressen kommen aus dem Aufhänger-Rechenkern, weil nur er
    // weiß, auf welche Rangliste sich die Meldung bezieht. Der TEXT kommt
    // dagegen aus der Datenbank — sonst prüfte man einen heute gebauten Brief.
    const gebaut = await briefFuerGemeinde(z.region_id);
    const fehler = istBriefFehler(gebaut);
    briefe.push({
      region_id: z.region_id,
      name,
      kampagne: z.kampagne,
      charge: z.charge,
      contacted_at: z.contacted_at,
      subject: z.draft_subject ?? "",
      body: z.draft_body,
      seite_url: fehler ? null : gebaut.seiteUrl,
      rangliste_url: fehler ? null : gebaut.ranglisteUrl,
      stand: fehler ? null : gebaut.stand,
    });
  }

  return NextResponse.json({ schub: schluessel, anzahl: briefe.length, briefe, ohneText });
}
