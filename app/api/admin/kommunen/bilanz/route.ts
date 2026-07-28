import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../../lib/supabase-server";
import { bilanziere } from "../../../../../lib/kommunen-ask";

// Auswertung je Ask-Variante. Zweck: nach einem Durchgang wissen, ob das Widget
// überhaupt nachgefragt wird — oder ob die fertige Meldung allein reicht.
//
// Gezählt wird nur, was VERSENDET wurde (`versendet_variante`), nicht die
// aktuelle Zuordnung: Wer die Variante später ändert, darf die Bilanz nicht
// rückwirkend verschieben.

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function isAdmin(): Promise<boolean> {
  const { createClient } = await import("../../../../../lib/supabase-server-component");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && ADMIN_EMAILS.includes(user.email?.toLowerCase() || "");
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceDb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const kampagne = req.nextUrl.searchParams.get("kampagne") ?? "testballon";

  const { data, error } = await serviceDb
    .from("kommunen_kontakt")
    .select("versendet_variante, ref_klicks, responded_at, widget_anfrage, ask_variante, outreach_status")
    .eq("kampagne", kampagne);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const zeilen = data ?? [];
  return NextResponse.json({
    kampagne,
    bilanz: bilanziere(zeilen),
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
