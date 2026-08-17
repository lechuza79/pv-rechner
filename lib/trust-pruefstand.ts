// Server-seitiger Read für den Prüf-Punkt der Vertrauens-Leiste (siehe
// lib/trust-signals.ts).
//
// Die Leiste sitzt im (site)-Layout, steht also unter JEDER Seite. Ein DB-Read
// pro Aufruf wäre damit der teuerste Read im Projekt — deshalb dasselbe Muster
// wie beim Theming-Overlay: unstable_cache mit großzügigem Fenster. Die statische
// Auslieferung bleibt erhalten, die Datenbank sieht höchstens einen Abruf pro
// Fenster.
//
// Sechs Stunden Cache sind bewusst grob: Das Ergebnis ist ein DATUM, kein
// Zeitstempel. Ein Wächter-Lauf um 09:00 steht spätestens um 15:00 in der
// Leiste — für "zuletzt geprüft am TT.MM." ist das ohne Belang, und es hält die
// Zahl der Reads bei ein paar pro Tag statt bei einem pro Besucher.

import "server-only";
import { unstable_cache } from "next/cache";
import { supabase } from "./supabase-server";

const CACHE_TAG = "trust-pruefstand";

/**
 * Zeitpunkt des jüngsten abgelegten Wächter-Laufs, oder `null`.
 *
 * Gelesen wird `waechter_reports` — die Ablage, in der JEDER Lauf landet, auch
 * der stumme (siehe lib/waechter-reports.ts). Genau deshalb taugt sie hier: Ein
 * Lauf ohne Befund ist trotzdem eine stattgefundene Prüfung, und würden nur die
 * zugestellten Berichte zählen, sähe ein ruhiger Monat wie ein Ausfall aus.
 *
 * Fällt die Datenbank aus oder fehlt die Tabelle, kommt `null` zurück und der
 * Prüf-Punkt entfällt ersatzlos. Kein Fallback auf ein geschätztes Datum — eine
 * behauptete Prüfung ohne Protokoll ist der Fehler, den dieser Punkt vermeiden
 * soll.
 */
async function readLetztePruefung(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("waechter_reports")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return typeof data.created_at === "string" ? data.created_at : null;
  } catch {
    return null;
  }
}

export const getLetztePruefung = unstable_cache(readLetztePruefung, ["trust-pruefstand"], {
  tags: [CACHE_TAG],
  revalidate: 21_600, // 6 h — das Ergebnis ist ein Datum, keine Uhrzeit
});
