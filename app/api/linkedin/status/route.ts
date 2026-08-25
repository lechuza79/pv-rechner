import { NextRequest, NextResponse } from "next/server";
import { istAdminOderCron } from "../../../../lib/admin-guard";
import { ablaufBefund, ladeKonto } from "../../../../lib/social-konten";
import { linkedinKonfiguriert, posteText } from "../../../../lib/linkedin";

// Zustand des LinkedIn-Zugangs (GET) und Testbeitrag (POST).
//
// Der Zugangsschlüssel selbst wird NIE zurückgegeben — auch nicht gekürzt.
// Eine Auskunftsroute, die ein Geheimnis anzeigt, ist eine Lücke, kein Komfort.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await istAdminOderCron(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const konto = await ladeKonto("linkedin");
  if (!konto) {
    return NextResponse.json({
      konfiguriert: linkedinKonfiguriert(),
      angemeldet: false,
      hinweis: "Noch kein Konto verknüpft. Als Admin /api/linkedin/start aufrufen.",
    });
  }
  const befund = ablaufBefund(konto, new Date());
  return NextResponse.json({
    konfiguriert: linkedinKonfiguriert(),
    angemeldet: true,
    konto: konto.anzeigename,
    scopes: konto.scopes,
    gueltig_bis: konto.gueltig_bis,
    tage_bis_ablauf: befund.tageBisAblauf,
    abgelaufen: befund.abgelaufen,
    warnung: befund.warnung,
  });
}

export async function POST(req: NextRequest) {
  if (!(await istAdminOderCron(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Kein Text übergeben" }, { status: 400 });
  }
  try {
    const ergebnis = await posteText(text);
    return NextResponse.json({ ok: true, ...ergebnis });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
