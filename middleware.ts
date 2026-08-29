import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { hostAusHerkunft, widgetAusPfad, zaehleEinbettung } from "./lib/embed-herkunft-core";
import {
  herkunftAusVerweis,
  istMaschine,
  pfadFuerZaehlung,
  zaehleSeitenaufruf,
} from "./lib/seiten-herkunft-core";

// Pfade, für die der Anmelde-Zweig laufen MUSS — und nur für die.
//
// DAS IST DIE TEUERSTE ZEILE DIESER DATEI. Seit der Matcher auch die
// gewöhnlichen Seiten erfasst (29.08.2026, für die Herkunftszählung), liefe
// `getUser()` ohne diese Liste bei JEDEM Seitenaufruf — ein Supabase-Aufruf je
// Besuch, auf einer Seite, die ihre Besucher gar nicht kennt. Vorher war die
// Trennung im Matcher; jetzt muss sie hier stehen, weil der Matcher weiter
// gefasst ist als das Bedürfnis.
const AUTH_PFADE = ["/dashboard", "/admin", "/api/calculations", "/auth/callback"];

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const pfad = request.nextUrl.pathname;

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
  if (pfad.startsWith("/embed/")) {
    const widget = widgetAusPfad(pfad);
    // `referer` (die Schreibweise mit einem r ist der Fehler von 1996 und steht
    // so im Standard) trägt beim Laden eines eingebetteten Dokuments die
    // einbettende Seite. Fehlt er, war es ein direkter Aufruf oder eine
    // Einbettung, die ihn unterdrückt — beides ist keine zählbare Einbettung.
    const host = hostAusHerkunft(request.headers.get("referer"));
    if (widget && host) event.waitUntil(zaehleEinbettung(host, widget));
    return NextResponse.next({ request });
  }

  // ─── Seiten-Zweig: zählen, sonst nichts ────────────────────────────────────
  //
  // Alles, was nicht Anmeldung ist. Auch hier: kein `await`, keine Sitzung,
  // keine Verzögerung der Antwort — und die Auslieferung bleibt statisch.
  // Gemessen am 29.08.2026 auf der Produktion: Drei Abrufe derselben Adresse,
  // davon zwei aus dem CDN-Zwischenspeicher (`x-vercel-cache: HIT`), erhöhten
  // den Zähler dreimal. Die Middleware läuft also VOR dem Cache und die Zählung
  // ist vollständig — hätte sie nur Erstaufrufe erfasst, wäre sie verzerrt
  // gewesen statt lückenhaft, und das ist der schlimmere Fall.
  if (!AUTH_PFADE.some((p) => pfad === p || pfad.startsWith(`${p}/`))) {
    // Maschinen werden verworfen, nicht gezählt. Der Kennungs-Kopf wird dafür
    // nur gelesen und sofort vergessen; er landet nirgends. Begründung und die
    // Grenze, an der diese Zählung einwilligungspflichtig würde, stehen in
    // `lib/seiten-herkunft-core.ts`.
    if (!istMaschine(request.headers.get("user-agent"))) {
      const p = pfadFuerZaehlung(pfad);
      if (p) {
        event.waitUntil(zaehleSeitenaufruf(p, herkunftAusVerweis(request.headers.get("referer"))));
      }
    }
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
            supabaseResponse.cookies.set(name, value, options)
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
  // Runs on every page, but does very different things per branch (see above):
  // auth session refresh ONLY for the paths in AUTH_PFADE, plain counting
  // everywhere else. Excluded here are the things that can never be a page
  // view: Next's own asset routes, the API surface, and anything with a file
  // extension. Keeping those out is what keeps middleware invocations — and
  // their cost — proportional to actual visits.
  //
  // /api/calculations is the one API path that DOES need the auth branch, so it
  // is added back explicitly.
  matcher: [
    "/((?!_next/static|_next/image|api/|.*\\.).*)",
    "/api/calculations/:path*",
  ],
};
