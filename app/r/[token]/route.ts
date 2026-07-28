import { NextResponse } from "next/server";
import { supabase as serviceDb } from "../../../lib/supabase-server";
import { atlasPathForRegionId } from "../../../lib/atlas";

// Zählende Weiterleitung für den Kommunen-Outreach: solar-check.io/r/hoechberg
// zählt einen Klick und leitet auf die Gemeindeseite weiter.
//
// WARUM NICHT `?ref=` DIREKT AUF DER ATLAS-SEITE: Die Gemeindeseiten liegen mit
// s-maxage=3600 im CDN. Ein Zähler auf der Seite selbst sähe die meisten Klicks
// gar nicht — der Ausgeher bekäme den Cache-Treffer und der Server nie einen
// Aufruf. Die Weiterleitung ist dynamisch und sieht jeden einzelnen.
//
// DATENSCHUTZ: gezählt wird ausschließlich „wie oft wurde dieser Link geöffnet".
// Keine IP, kein Cookie, kein Browser-Speicher, keine Verknüpfung mit einer
// Person — der Token gehört einer Gemeinde, nicht einem Menschen.
//
// EHRLICHKEIT DER ZAHL: Sicherheits-Scanner in Mail-Gateways öffnen Links
// automatisch. Die Klickzahl ist damit eine OBERGRENZE, nicht die Zahl echter
// Leser. Offensichtliche Bots werden übersprungen; das Cockpit beschriftet die
// Spalte entsprechend.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BOT = /bot|crawler|spider|preview|scanner|monitor|curl|wget|python-requests|headless/i;

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ziel = new URL("/solar-atlas", req.url);

  if (!serviceDb || !/^[a-z0-9-]{1,64}$/.test(token)) {
    return NextResponse.redirect(ziel, 307);
  }

  const ua = req.headers.get("user-agent") ?? "";
  const istBot = BOT.test(ua);

  // Zählen und Gemeinde in einem Schritt (atomar, siehe kommunen_ref_hit).
  // Bots zählen nicht mit, sollen aber trotzdem korrekt weitergeleitet werden.
  let regionId: string | null = null;
  if (istBot) {
    const { data } = await serviceDb
      .from("kommunen_kontakt")
      .select("region_id")
      .eq("ref_token", token)
      .maybeSingle();
    regionId = data?.region_id ?? null;
  } else {
    const { data, error } = await serviceDb.rpc("kommunen_ref_hit", { p_token: token });
    if (!error) regionId = (data as { region_id: string }[] | null)?.[0]?.region_id ?? null;
  }

  if (!regionId) return NextResponse.redirect(ziel, 307);

  const pfad = await atlasPathForRegionId(regionId);
  return NextResponse.redirect(new URL(pfad ?? "/solar-atlas", req.url), 307);
}
