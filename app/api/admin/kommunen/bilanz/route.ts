import { NextRequest, NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../../../lib/supabase-server";
import { verteile } from "../../../../../lib/kommunen-ask";

// Verteilung je Ask-Variante: wie viele Briefe welcher Fassung hinausgegangen
// sind. KEIN Vergleich — die Variante hängt an der Gemeindegröße, die beiden
// Gruppen unterscheiden sich also nicht im Text, sondern in der Größe der
// Verwaltung. Die Begründung steht bei `VariantenVerteilung`.
//
// Gezählt wird nur, was VERSENDET wurde (`versendet_variante`), nicht die
// aktuelle Zuordnung: Wer die Variante später ändert, darf die Zahlen nicht
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
    .select("versendet_variante, responded_at, widget_anfrage, ask_variante, outreach_status")
    .eq("kampagne", kampagne);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const zeilen = data ?? [];
  return NextResponse.json({
    kampagne,
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
