import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../../lib/supabase-server-component";
import { rateLimit } from "../../../../lib/rate-limit";
import { safeInternalPath } from "../../../../lib/internal-path";
import { fehlerAusMeldung, istEmail, passwortOk, type AuthFehler } from "../../../../lib/auth-regeln";

// ─── Konto anlegen ───────────────────────────────────────────────────────────
//
// Serverseitig aus demselben Grund wie die Anmeldung (siehe dort) und weil
// dieser Weg eine Mail auslöst: Ein ungedeckelter Endpunkt, der auf Zuruf an
// eine beliebige Adresse schreibt, ist ein Werkzeug, um fremde Postfächer
// zuzuschütten. Der Deckel je Anschluss ist deshalb enger als bei der
// Anmeldung.
//
// Die Antwort verrät NICHT, ob es die Adresse schon gibt — sonst wäre das
// Formular ein Abfragedienst dafür, wer hier ein Konto hat. Supabase meldet
// eine vergebene Adresse ohnehin nur, wenn diese Auskunft in den
// Projekteinstellungen zugelassen ist; wir fangen den Fall trotzdem ab, damit
// die Antwort nicht von einer Einstellung außerhalb des Codes abhängt.

export const dynamic = "force-dynamic";

function fehler(kennung: AuthFehler, status: number) {
  return NextResponse.json({ fehler: kennung }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "auth-signup", 5, 60 * 60 * 1000);
  if (limit) return fehler("zu_viele_versuche", 429);

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const passwort = typeof body?.passwort === "string" ? body.passwort : "";
  const next = safeInternalPath(typeof body?.next === "string" ? body.next : null) ?? "/dashboard";

  if (!istEmail(email) || !passwort) return fehler("ungueltige_eingabe", 400);
  if (!passwortOk(passwort)) return fehler("passwort_zu_kurz", 400);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return fehler("nicht_eingerichtet", 503);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password: passwort,
    options: { emailRedirectTo: `${request.nextUrl.origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    const kennung = fehlerAusMeldung(error.message ?? "");
    if (kennung === "email_vergeben") return fehler("email_vergeben", 409);
    return fehler(kennung, kennung === "passwort_zu_kurz" ? 400 : 500);
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
