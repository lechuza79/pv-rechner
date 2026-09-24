import "server-only";
import { supabase } from "./supabase-server";
import { SAMMLUNG_TABELLE, type SammlungsZeile } from "./angebot-sammlung";

// Ablage der geprüften Angebote. Die Zeile selbst baut angebot-sammlung.ts —
// rein, ohne Netz und ohne `server-only`, damit sich in einem Test nachweisen
// lässt, dass wirklich nichts Persönliches durchrutscht.

/**
 * Legt die Zeile ab. Scheitert bewusst STILL: Der Nutzer hat sein Ergebnis
 * bereits; dass unsere Statistik eine Zeile verpasst, ist kein Grund, ihm einen
 * Fehler zu zeigen.
 */
export async function merkeBefund(zeile: SammlungsZeile): Promise<void> {
  try {
    if (!supabase) return;
    await supabase.from(SAMMLUNG_TABELLE).insert(zeile);
  } catch {
    // bewusst leer
  }
}
