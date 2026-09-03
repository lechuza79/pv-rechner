import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../../lib/supabase-server-component";
import { rateLimit } from "../../../../lib/rate-limit";
import { istEmail, type AuthFehler } from "../../../../lib/auth-regeln";
import { ZIEL_COOKIE, ZIEL_COOKIE_SEKUNDEN } from "../../../../lib/auth-ziel";

// ─── Passwort setzen oder zurücksetzen ───────────────────────────────────────
//
// Ein Weg für zwei Fälle, und der zweite ist der eigentliche Anlass: Die
// bestehenden Konten wurden ohne Passwort angelegt (Anmeldung lief bis 09/2026
// über einen Link in der Mail). Sie brauchen keinen eigenen Sonderweg — wer nie
// ein Passwort hatte, „setzt" es hier, wer seins vergessen hat, ersetzt es. Der
// Dienst dahinter unterscheidet das nicht, und die Oberfläche soll es auch
// nicht: Ein zweiter Knopf „ich hatte noch nie ein Passwort" würde eine
// Unterscheidung behaupten, die für den Nutzer keine Folge hat.
//
// Die Antwort ist IMMER die gleiche — auch wenn es die Adresse gar nicht gibt.
// Ein „diese Adresse kennen wir nicht" wäre eine Auskunft darüber, wer hier ein
// Konto hat, und die gehört niemandem außer dem Kontoinhaber.

export const dynamic = "force-dynamic";

function fehler(kennung: AuthFehler, status: number) {
  return NextResponse.json({ fehler: kennung }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "auth-reset", 5, 60 * 60 * 1000);
  if (limit) return fehler("zu_viele_versuche", 429);

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!istEmail(email)) return fehler("ungueltige_eingabe", 400);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return fehler("nicht_eingerichtet", 503);
  }

  const supabase = await createClient();
  // Der Link führt über dieselbe Rückkehr-Adresse wie jede andere Anmeldung und
  // landet danach auf der Seite, auf der das neue Passwort vergeben wird.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${request.nextUrl.origin}/auth/callback?next=${encodeURIComponent("/passwort-setzen")}`,
  });

  // Das Ziel reist am Link mit — und zusätzlich hier, als Rückfall für den
  // Fall, dass der Anmeldedienst die Angabe an der Rückkehr-Adresse
  // abschneidet (siehe lib/auth-ziel.ts). Ohne diesen Rückfall landet man
  // angemeldet auf der Startseite und sieht das Passwort-Formular nie.
  const antwort = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  antwort.cookies.set(ZIEL_COOKIE, "/passwort-setzen", {
    path: "/",
    maxAge: ZIEL_COOKIE_SEKUNDEN,
    sameSite: "lax",
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
  });
  return antwort;
}
