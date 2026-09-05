import { createServerClient } from "@supabase/ssr";
import { nurFuerDieSitzung, BLEIBEN_COOKIE, bleibenGilt } from "./lib/auth-cookies";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { hostAusHerkunft, widgetAusPfad, zaehleEinbettung } from "./lib/embed-herkunft-core";
import { traegtRechnung } from "./lib/share-keys";

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
  // ─── Rechner-Weiche: nur mit Rechnung im Gepaeck an den Server ─────────────
  //
  // Die nackte Rechner-Adresse ist fuer alle gleich und wird statisch
  // ausgeliefert. Steht ein Parameter dabei — ein geteiltes Ergebnis oder eine
  // Vorbefuellung von einer Foerderseite, dem Klimarechner, der Simulation oder
  // dem Empfehlungs-Flow —, muss die Seite am Server gebaut werden; die
  // Umschreibung schickt sie auf die dynamische Zwillingsroute.
  //
  // UMSCHREIBEN, NICHT WEITERLEITEN: Die Adresse im Browser bleibt exakt, wie
  // sie geteilt wurde. Jeder Link, der heute existiert, funktioniert
  // unveraendert weiter — und der Teilen-Knopf im Rechner baut seinen Link
  // weiterhin aus dem Pfad der Seite, auf der er steht.
  //
  // Dass eine Middleware davor die statische Auslieferung NICHT ersetzt, ist in
  // diesem Repo schon belegt: Der Embed-Zweig unten sitzt seit Monaten vor
  // Seiten, die aus dem Zwischenspeicher kommen.
  if (request.nextUrl.pathname === "/photovoltaik-rechner" && traegtRechnung(request.nextUrl.searchParams)) {
    const ziel = request.nextUrl.clone();
    ziel.pathname = "/photovoltaik-rechner/ergebnis";
    return NextResponse.rewrite(ziel);
  }

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

  const bleiben = bleibenGilt(request.cookies.get(BLEIBEN_COOKIE)?.value);
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
            supabaseResponse.cookies.set(name, value, nurFuerDieSitzung(name, options, bleiben))
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
    // Nur die nackte Adresse, nicht der Zwilling darunter: Sonst schriebe die
    // Weiche die umgeschriebene Anfrage ein zweites Mal um.
    "/photovoltaik-rechner",
  ],
};
