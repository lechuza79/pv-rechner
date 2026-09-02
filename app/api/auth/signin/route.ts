import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../../lib/supabase-server-component";
import { rateLimit } from "../../../../lib/rate-limit";
import { fehlerAusMeldung, istEmail, type AuthFehler } from "../../../../lib/auth-regeln";

// ─── Anmeldung mit Passwort — SERVERSEITIG, nicht im Browser ─────────────────
//
// Der Browser-Weg (`signInWithPassword` im Tab) hält für die Dauer des
// Netzaufrufs eine Sperre auf dem Anmelde-Speicher. Sind mehrere Tabs offen,
// stauen sich deren Speicher-Zugriffe dahinter und laufen in ein
// Zehn-Sekunden-Zeitlimit — der Nutzer sieht „Anmeldung fehlgeschlagen",
// obwohl nichts fehlgeschlagen ist. Im Schwesterprojekt live gemessen
// (30.04.2026): ein einzelner Anmeldevorgang löste 14 Sperr-Zyklen aus, ein
// zweiter Tab wartete in 132 ms Haltezeit 28 Mal.
//
// Hier läuft der Netzaufruf auf dem Server, der die Sitzungs-Cookies gleich
// mitschreibt. Der Browser bekommt die Sitzung fertig gereicht und schreibt sie
// nur noch lokal weg — das dauert Bruchteile einer Millisekunde und kann
// niemanden mehr blockieren.
//
// Die Zahl der Versuche je Anschluss ist gedeckelt: ohne Deckel ist ein
// öffentliches Anmeldeformular ein Durchprobier-Automat für geleakte
// Passwortlisten.

export const dynamic = "force-dynamic";

function fehler(kennung: AuthFehler, status: number) {
  return NextResponse.json({ fehler: kennung }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "auth-signin", 10, 60 * 60 * 1000);
  if (limit) return fehler("zu_viele_versuche", 429);

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const passwort = typeof body?.passwort === "string" ? body.passwort : "";
  if (!istEmail(email) || !passwort) return fehler("ungueltige_eingabe", 400);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return fehler("nicht_eingerichtet", 503);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: passwort });

  if (error) {
    const kennung = fehlerAusMeldung(error.message ?? "");
    return fehler(kennung, kennung === "falsche_zugangsdaten" ? 401 : 500);
  }
  if (!data.session) return fehler("fehlgeschlagen", 500);

  // Die Sitzungs-Cookies stehen bereits (der Server-Client schreibt sie über
  // die Cookie-Schnittstelle von Next). Die beiden Schlüssel gehen zusätzlich
  // an den Browser, damit dessen eigener Anmelde-Zustand sofort umspringt und
  // die Kopfzeile nicht erst nach einem Seitenwechsel „angemeldet" zeigt.
  return NextResponse.json(
    {
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
