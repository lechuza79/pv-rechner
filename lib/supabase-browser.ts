import { createBrowserClient } from "@supabase/ssr";
import { browserCookies } from "./auth-cookies";

/**
 * Browser-Client für die Anmeldung.
 *
 * Gibt `null` zurück, wenn die Zugangsdaten fehlen, statt zu werfen. Grund:
 * Der Aufruf sitzt im Header, also auf JEDER Seite. Eine geworfene Ausnahme
 * dort reißt den gesamten Seitenaufbau mit — aus einem fehlenden Anmeldedienst
 * wird eine weiße Seite mit Laufzeitfehler, obwohl die Seite selbst
 * vollständig gerendert ist und nichts davon Anmeldung braucht.
 *
 * Getroffen hat das jede Arbeitskopie ohne eigene Umgebungsdatei: Der Inhalt
 * kam serverseitig sauber, im Browser blieb nur die Fehlermeldung. In
 * Produktion sind die Werte gesetzt, dort ändert sich nichts.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  // Eigene Cookie-Behandlung, damit die Anmeldung mit dem Browser endet.
  // Warum das nötig ist und was die Alternative wäre: lib/auth-cookies.ts.
  return createBrowserClient(url, key, { cookies: browserCookies });
}
