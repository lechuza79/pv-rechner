import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "../../../../lib/db-timeout";
import { heizungsfoerderungKreis } from "../../../../lib/kfw-foerderdaten";
import { rateLimit } from "../../../../lib/rate-limit";

/**
 * Zusagen der Bundes-Heizungsförderung in EINEM Landkreis.
 *
 *   /api/kfw/kreis?ags=08115003   →  { kreis: "Landkreis Böblingen", jahr, zusagen }
 *
 * Der Rechner kennt nach der Postleitzahl den achtstelligen Gemeindeschlüssel;
 * die ersten fünf Stellen sind der Kreis. Umgerechnet wird hier und nicht im
 * Browser, damit die Regel an einer Stelle steht.
 *
 * WAS DIESE ROUTE BEWUSST NICHT KANN: mehrere Kreise auf einmal. Eine Liste
 * über viele Kreise wäre die flächendeckende Tabelle, die wir aus dieser Quelle
 * nicht ausweisen — und der Baustein, aus dem sich unterdrückte Zellen über
 * Differenzen zurückrechnen ließen. Wer eine Karte daraus bauen will, trifft
 * diese Entscheidung neu, statt sie über einen zweiten Parameter zu umgehen.
 *
 * Eine unterdrückte Zahl kommt als `zusagen: null` heraus und wird nirgends
 * ergänzt oder geschätzt.
 */

const headers = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "kfw-kreis");
  if (limited) return limited;

  const ags = (req.nextUrl.searchParams.get("ags") ?? "").trim();
  if (!/^\d{5,8}$/.test(ags)) {
    return NextResponse.json({ error: "ags fehlt oder ist ungültig" }, { status: 400 });
  }
  const regionId = ags.slice(0, 5);

  const zelle = await heizungsfoerderungKreis(regionId);
  if (!zelle) return NextResponse.json({ kreis: null }, { headers });

  let name: string | null = null;
  if (supabase) {
    try {
      const { data } = await withDbTimeout(
        supabase.from("mastr_regions").select("name").eq("region_id", regionId).limit(1),
        "kfw kreisname",
        DB_SOFT_READ_TIMEOUT_MS,
      );
      name = (data?.[0] as { name: string } | undefined)?.name ?? null;
    } catch {
      name = null;
    }
  }
  // Ohne Namen keine Aussage: „In deinem Landkreis waren es 1.245" ohne den
  // Namen ist eine Zahl, die der Leser nicht einordnen kann — und wir wüssten
  // nicht, ob wir den richtigen Kreis erwischt haben.
  if (!name) return NextResponse.json({ kreis: null }, { headers });

  return NextResponse.json(
    { kreis: name, jahr: zelle.jahr, zusagen: zelle.zusagen },
    { headers },
  );
}
