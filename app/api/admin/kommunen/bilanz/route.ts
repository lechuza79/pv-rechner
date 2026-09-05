import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../../lib/supabase-server";
import { verteile } from "../../../../../lib/kommunen-ask";
import { werteAus, type OutreachZeile } from "../../../../../lib/kommunen-auswertung";
import { zaehleAbos, type AboZeile } from "../../../../../lib/kommunen-abo-spiegel";
import { aboZeilenFuerAuswertung } from "../../../../../lib/gemeinde-abo";
import { isAdminSession } from "../../../../../lib/admin-guard";

// Auswertung des Outreach: was hinausging und was daraus wurde.
//
// ZWEI TEILE, weil sie zwei Fragen beantworten:
//
//   1. Die WIRKUNG über alle Schübe — verschickt, Antworten, Veröffentlichungen,
//      Eintragungen ins Gemeinde-Abo. Das ist die Auswertung, die man wirklich
//      liest. Sie kam bis zum 01.09.2026 gar nicht vor.
//   2. Die Verteilung je Anschreiben-Fassung, für EINE Kampagne. Kein
//      Vergleich — die Fassung hängt an der Gemeindegröße, die beiden Gruppen
//      unterscheiden sich also nicht im Text, sondern in der Größe der
//      Verwaltung. Begründung bei `VariantenVerteilung`.
//
// DER FEHLER, DEN DAS BEHEBT: Der zweite Teil hing an einer fest eingetragenen
// Kampagne („testballon"), und die gibt es seit dem Umbenennen nicht mehr. Die
// Kachelreihe war dauerhaft leer und sah dabei nicht wie ein Fehler aus — eine
// Auswertung, die schweigt, ist von einer ohne Ergebnisse nicht zu
// unterscheiden. Der Vorgabewert ist deshalb jetzt der laufende Schub.
//
// Gezählt wird für die Verteilung nur, was VERSENDET wurde
// (`versendet_variante`), nicht die aktuelle Zuordnung: Wer die Fassung später
// ändert, darf die Zahlen nicht rückwirkend verschieben.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  // ─── Teil 1: Wirkung über alle Schübe ──────────────────────────────────────
  type Zeile = OutreachZeile & {
    region_id: string;
    versendet_variante: string | null;
    ask_variante: string | null;
    widget_anfrage: boolean | null;
  };
  const alle: Zeile[] = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await serviceDb
      .from("kommunen_kontakt")
      .select("region_id, kampagne, contacted_at, responded_at, outreach_status, widget_anfrage, versendet_variante, ask_variante")
      .not("kampagne", "is", null)
      .order("region_id")
      .range(von, von + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) break;
    alle.push(...(data as unknown as Zeile[]));
    if (data.length < 1000) break;
  }

  // Eintragungen: nur die Zahlen, nie die Adressen (lib/kommunen-abo-spiegel).
  // Fällt die Abfrage aus, bleiben die Abo-Spalten leer — eine Zusatzangabe
  // darf die Auswertung nicht mitnehmen.
  const spiegel = zaehleAbos((await aboZeilenFuerAuswertung()) as AboZeile[]);

  const { gesamt, jeKampagne, jeTag } = werteAus(alle, spiegel);

  // ─── Teil 2: Verteilung der Anschreiben-Fassungen einer Kampagne ───────────
  //
  // Vorgabe ist der Schub mit den meisten verschickten Briefen, nicht ein fest
  // eingetragener Name: So zeigt die Reihe immer etwas, solange überhaupt etwas
  // verschickt wurde.
  const vorgabe = jeKampagne.find((k) => k.verschickt > 0)?.kampagne ?? jeKampagne[0]?.kampagne ?? "";
  const kampagne = req.nextUrl.searchParams.get("kampagne") ?? vorgabe;
  const zeilen = alle.filter((z) => z.kampagne === kampagne);

  return NextResponse.json({
    kampagne,
    wirkung: { gesamt, jeKampagne, jeTag },
    verteilung: verteile(zeilen),
    // Was noch aussteht — sonst liest sich „0 Antworten" wie ein Ergebnis,
    // obwohl schlicht noch nichts raus ist.
    offen: {
      zugeordnet: zeilen.length,
      nochNichtVersendet: zeilen.filter((z) => !z.versendet_variante).length,
      geplantNurMeldung: zeilen.filter((z) => !z.versendet_variante && z.ask_variante === "nur_meldung").length,
      geplantMitWidget: zeilen.filter((z) => !z.versendet_variante && z.ask_variante === "meldung_plus_widget").length,
    },
  });
}
