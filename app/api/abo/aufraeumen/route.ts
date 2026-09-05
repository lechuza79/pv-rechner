import { NextRequest, NextResponse } from "next/server";
import { aboAufraeumen } from "../../../../lib/gemeinde-abo";

// ─── Verfallene Abo-Einträge löschen ─────────────────────────────────────────
//
// DIESE ROUTE HÄLT ZWEI VERÖFFENTLICHTE ZUSAGEN. Sie ist kein Aufräumen zur
// Ordnung, sondern die Umsetzung dessen, was in der Datenschutzerklärung
// (Abschnitt 16) und in der Bestätigungsmail wörtlich steht:
//
//   „Klickst du nicht, wird die Eintragung gelöscht"
//   „Gelöscht wird der Nachweis zum 31. Dezember des dritten Jahres nach dem
//    Jahr, in dem wir dir zuletzt geschrieben haben"
//
// HIER STAND BIS ZUM 01.09.2026 DIE ALTE ZUSAGE („nach zwölf Monaten"), und
// zwar als Zitat — die gefährlichere Form: Wer hier nachliest, glaubt, die
// veröffentlichte Fassung gesehen zu haben. Genau die Fehlerklasse, vor der
// der nächste Absatz warnt.
//
// Läuft sie nicht, sind beide Sätze falsch — und zwar auf der Seite, die für
// die Ehrlichkeit des ganzen Projekts bürgt. Die Fristen selbst stehen im
// Lesemodul, nicht hier: Sie sind die Zusage, diese Route nur ihr Vollzug.
//
// Auslösen: Authorization: Bearer $CRON_SECRET, täglich.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ergebnis = await aboAufraeumen(Date.now());
  return NextResponse.json({ ok: true, ...ergebnis });
}
