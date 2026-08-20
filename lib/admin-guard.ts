import "server-only";

// Admin-Prüfung an EINER Stelle. Lag vorher als Kopie in jeder Admin-Route und
// jeder Admin-Seite; bei einer Sicherheitsgrenze ist eine zweite Kopie kein
// Duplikat, sondern die Stelle, an der die Prüfung eines Tages fehlt.
//
// Bewusst serverseitig: die Admin-Mail-Liste darf nicht in den Browser wandern.

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Admin-Session ODER der Cron-Schlüssel.
 *
 * Für Endpunkte, die auch ohne Browser angesprochen werden müssen — der
 * Kommunen-Versand läuft als Skript und hat keine Session. Der Schlüssel ist
 * derselbe wie bei den Wächter-Routen und steht nur in der Umgebung; ist er
 * nicht gesetzt, gilt allein die Session (kein stiller Freibrief).
 */
export async function istAdminOderCron(req: { headers: { get(name: string): string | null } }): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return isAdminSession();
}

/** Gehört die aktuelle Session einem Admin? */
export async function isAdminSession(): Promise<boolean> {
  const { createClient } = await import("./supabase-server-component");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && ADMIN_EMAILS.includes(user.email?.toLowerCase() || "");
}
