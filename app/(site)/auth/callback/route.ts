import { createClient } from "../../../../lib/supabase-server-component";
import { NextResponse, type NextRequest } from "next/server";
import { safeInternalPath } from "../../../../lib/internal-path";
import { ZIEL_COOKIE } from "../../../../lib/auth-ziel";

// Shared with the "?from=" back link on /kontakt — one rule for "is this a path
// on our own site", so a fix on one side cannot leave the other side open.
function safeNextPath(raw: string | null): string {
  return safeInternalPath(raw) ?? "/";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // Zuerst die Angabe an der Adresse, dann der Rückfall aus dem Cookie: Der
  // Anmeldedienst kann die Angabe abschneiden, und ohne Ziel landet gerade
  // der, der sein Passwort setzen wollte, auf der Startseite (lib/auth-ziel.ts).
  const next = safeNextPath(searchParams.get("next") ?? request.cookies.get(ZIEL_COOKIE)?.value ?? null);

  if (code) {
    // Bewusst der GETEILTE Server-Client statt eines eigenen: Er ist die
    // Stelle, an der die Anmelde-Cookies auf die Browser-Sitzung begrenzt
    // werden (lib/auth-cookies.ts). Eine zweite Fassung hier hätte diese
    // Begrenzung nicht mitbekommen — und das sieht man einem Diff nicht an.
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const antwort = NextResponse.redirect(`${origin}${next}`);
      // Einmal benutzt, dann weg — sonst zieht ein alter Rückfall die nächste
      // Anmeldung auf die Passwort-Seite.
      antwort.cookies.delete(ZIEL_COOKIE);
      return antwort;
    }
  }

  // Kein Code oder Austausch fehlgeschlagen: zurück zur Anmeldung, nicht zur
  // Startseite. Ein abgelaufener Link ist der häufigste Fall — dort steht der
  // Weg, einen neuen anzufordern, auf der Startseite nicht.
  return NextResponse.redirect(`${origin}/login`);
}
