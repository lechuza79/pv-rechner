import { NextRequest, NextResponse } from "next/server";
import { aboAbmelden } from "../../../../lib/gemeinde-abo";
import { pruefeAbmeldung } from "../../../../lib/abo-token";

// ─── Ein-Klick-Abmeldung (RFC 8058) ──────────────────────────────────────────
//
// Diese Adresse steht in der `List-Unsubscribe`-Kopfzeile jeder Meldungsmail.
// Das Postfach des Empfängers ruft sie SELBST per POST auf, sobald er auf den
// „Abbestellen"-Knopf tippt, den Gmail, Outlook und Apple Mail über der Mail
// einblenden. Der Empfänger sieht dabei keine Seite von uns.
//
// DESHALB DARF HIER NICHTS ZURÜCKFRAGEN. Keine Bestätigungsseite, kein „sind
// Sie sicher", keine Anmeldung. Wer nach dem POST noch eine Rückfrage stellt,
// meldet niemanden ab — und große Anbieter stufen die Mail dann als nicht
// abbestellbar ein, was der Zustellbarkeit mehr schadet als jede Beschwerde.
//
// GET gibt es zusätzlich, weil manche Postfächer die Kopfzeile als gewöhnlichen
// Link anbieten. Dann soll ein Mensch danach etwas sehen — deshalb die
// Weiterleitung auf die Seite, die dasselbe tut und es bestätigt.
//
// Ein unbekanntes oder gefälschtes Token führt NICHT zu einer Fehlermeldung:
// Die Antwort ist immer „abgemeldet". Sonst verrät diese Adresse, welche
// Kennungen es gibt.

export const runtime = "nodejs";

async function abmelden(token: string): Promise<void> {
  const befund = pruefeAbmeldung(token);
  if (!befund.ok) return;
  await aboAbmelden(befund.aboId, new Date().toISOString());
}

export async function POST(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  await abmelden(token);
  // Nackte 200. Das Postfach wertet nur den Statuscode aus.
  return new NextResponse(null, { status: 200 });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  await abmelden(token);
  return NextResponse.redirect(new URL(`/abo/abmelden?t=${encodeURIComponent(token)}`, url.origin));
}
