import { createServerClient } from "@supabase/ssr";
import { nurFuerDieSitzung } from "./lib/auth-cookies";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { hostAusHerkunft, widgetAusPfad, zaehleEinbettung } from "./lib/embed-herkunft-core";

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  // ─── Embed-Zweig: zählen, sonst nichts ─────────────────────────────────────
  //
  // Läuft VOR dem Auth-Zweig und kehrt sofort zurück. Ein Widget hat keine
  // Sitzung, und `getUser()` hier auszuführen wäre ein Supabase-Aufruf je
  // Widget-Abruf — teuer und zwecklos.
  //
  // Die Seite selbst bleibt statisch: Die Middleware sitzt davor, sie ersetzt
  // die Auslieferung nicht. Gezählt wird ohne `await` über `waitUntil`, damit
  // die Antwort nicht auf die Datenbank wartet — ein Widget darf nie langsamer
  // werden, weil wir mitschreiben.
  if (request.nextUrl.pathname.startsWith("/embed/")) {
    const widget = widgetAusPfad(request.nextUrl.pathname);
    // `referer` (die Schreibweise mit einem r ist der Fehler von 1996 und steht
    // so im Standard) trägt beim Laden eines eingebetteten Dokuments die
    // einbettende Seite. Fehlt er, war es ein direkter Aufruf oder eine
    // Einbettung, die ihn unterdrückt — beides ist keine zählbare Einbettung.
    const host = hostAusHerkunft(request.headers.get("referer"));
    if (widget && host) event.waitUntil(zaehleEinbettung(host, widget));
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, nurFuerDieSitzung(name, options))
          );
        },
      },
    }
  );

  // Refresh session (important for Server Components)
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  // Only run middleware on routes that actually need auth session refresh —
  // plus /embed, where it counts embeddings from the request header (see the
  // embed branch above; that branch does NOT touch Supabase auth).
  // Keeps Vercel middleware-invocations (and Supabase getUser() calls) low.
  //
  // Am 01.09.2026 lief der Matcher kurzzeitig über ALLE Seiten, für eine
  // serverseitige Herkunftszählung. Die ist wieder ausgebaut — warum, steht in
  // CLAUDE.md unter „Was hier NICHT noch einmal gebaut wird".
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/calculations/:path*",
    "/auth/callback",
    "/embed/:path*",
  ],
};
