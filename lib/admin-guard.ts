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

/** Gehört die aktuelle Session einem Admin? */
export async function isAdminSession(): Promise<boolean> {
  const { createClient } = await import("./supabase-server-component");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && ADMIN_EMAILS.includes(user.email?.toLowerCase() || "");
}
