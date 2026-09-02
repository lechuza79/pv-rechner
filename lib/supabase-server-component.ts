import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { nurFuerDieSitzung, BLEIBEN_COOKIE, bleibenGilt } from "./auth-cookies";

/**
 * @param bleibenErzwingen Beim ANMELDEN muss die Entscheidung ausdrücklich
 * hereingereicht werden: Der Merker steht zu diesem Zeitpunkt noch nicht beim
 * Nutzer — er entsteht ja erst mit dieser Anmeldung. Läse der Client ihn nur
 * aus den eingehenden Cookies, bekäme das Anmelde-Cookie beim ersten Mal keine
 * Lebensdauer, und der Nutzer wäre trotz Häkchen nach dem Schließen des
 * Browsers wieder abgemeldet. Gemessen, bevor es so gebaut wurde.
 */
export async function createClient(bleibenErzwingen?: boolean) {
  const cookieStore = await cookies();
  // Hat der Nutzer „Angemeldet bleiben" angehakt? Steht als eigener Merker
  // beim ihm — siehe lib/auth-cookies.ts.
  const bleiben = bleibenErzwingen ?? bleibenGilt(cookieStore.get(BLEIBEN_COOKIE)?.value);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, nurFuerDieSitzung(name, options, bleiben))
            );
          } catch {
            // Ignore - this is called from Server Components where cookies can't be set
          }
        },
      },
    }
  );
}
