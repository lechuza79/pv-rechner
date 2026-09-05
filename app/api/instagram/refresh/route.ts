import { NextRequest, NextResponse } from "next/server";
import { istAdminOderCron } from "../../../../lib/admin-guard";
import { verlaengere } from "../../../../lib/instagram";

// Verlängert den Instagram-Zugang. Läuft wöchentlich als geplanter Aufruf.
//
// WARUM ES DIESE ROUTE GIBT, obwohl die Statusroute dasselbe per POST kann:
// Geplante Aufrufe kommen als GET. Eine Verlängerung, die nur per POST geht,
// bräuchte einen zweiten Weg, sie auszulösen — und der wäre wieder ein Mensch.
//
// UND WARUM ÜBERHAUPT: Der Zugang gilt sechzig Tage und lässt sich verlängern,
// solange er gültig und mindestens einen Tag alt ist. Ohne diesen Lauf liefe er
// aus wie der von LinkedIn, obwohl er es nicht müsste — und die Folge wäre
// dieselbe: Das Veröffentlichen hört still auf. Wöchentlich, weil das mit
// großem Abstand innerhalb der Frist liegt: Selbst wenn drei Läufe hintereinander
// ausfallen, bleiben über sieben Wochen Luft.
//
// EIN „NEIN" IST HIER KEIN FEHLER. Ist der Schlüssel noch keinen Tag alt, lehnt
// Instagram die Verlängerung ab — der Zugang ist trotzdem in Ordnung. Deshalb
// antwortet die Route mit 200 und dem Grund, statt einen roten Lauf zu erzeugen,
// den niemand beheben kann.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await istAdminOderCron(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ergebnis = await verlaengere();
    if ("grund" in ergebnis) return NextResponse.json({ ok: false, ...ergebnis });
    return NextResponse.json({ ok: true, ...ergebnis });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
