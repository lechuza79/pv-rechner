import { NextRequest, NextResponse } from "next/server";
import { istAdminOderCron } from "../../../../lib/admin-guard";
import { ablaufBefund, ladeKonto } from "../../../../lib/social-konten";
import {
  instagramKonfiguriert,
  rueckrufAdresse,
  verlaengere,
  veroeffentlichungsGrenze,
} from "../../../../lib/instagram";

// Zustand des Instagram-Zugangs (GET) und Verlängerung (POST).
//
// Der Zugangsschlüssel selbst wird NIE zurückgegeben — auch nicht gekürzt.
// Eine Auskunftsroute, die ein Geheimnis anzeigt, ist eine Lücke, kein Komfort.
//
// KEIN TESTBEITRAG wie bei LinkedIn: Instagram kennt keinen reinen Textbeitrag,
// ein Test bräuchte also ein echtes Bild an einer öffentlich erreichbaren
// Adresse. Ein „Test", der dafür ein Platzhalterbild veröffentlicht, stünde
// hinterher im Profil.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await istAdminOderCron(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Die Rückrufadresse steht MIT in der Auskunft. Sie ist kein Geheimnis, aber
  // die häufigste Fehlerquelle: Instagram vergleicht sie zeichengleich mit der
  // im Portal hinterlegten und meldet dann nur, dass sie nicht übereinstimmt —
  // ohne zu sagen, welche es gesehen hat. Ohne diese Zeile bleibt Raten.
  const rueckruf = rueckrufAdresse(new URL(req.url).origin);

  const konto = await ladeKonto("instagram");
  if (!konto) {
    return NextResponse.json({
      konfiguriert: instagramKonfiguriert(),
      rueckrufadresse: rueckruf,
      angemeldet: false,
      hinweis: "Noch kein Konto verknüpft. Als Admin /api/instagram/start aufrufen.",
    });
  }
  const befund = ablaufBefund(konto, new Date());
  return NextResponse.json({
    konfiguriert: instagramKonfiguriert(),
    rueckrufadresse: rueckruf,
    angemeldet: true,
    konto: konto.anzeigename,
    scopes: konto.scopes,
    gueltig_bis: konto.gueltig_bis,
    tage_bis_ablauf: befund.tageBisAblauf,
    abgelaufen: befund.abgelaufen,
    warnung: befund.warnung,
    grenze: await veroeffentlichungsGrenze(),
  });
}

export async function POST(req: NextRequest) {
  if (!(await istAdminOderCron(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ergebnis = await verlaengere();
    if ("grund" in ergebnis) {
      return NextResponse.json({ ok: false, ...ergebnis });
    }
    return NextResponse.json({ ok: true, ...ergebnis });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
