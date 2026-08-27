import "server-only";

// Ablage der redaktionellen Fassung je Story: der umformulierte Text UND das
// gewählte Farbschema. Regeln und Platzhalter-Logik: lib/social-vorlage.ts
//
// Beides in einer Zeile, nicht in zwei Tabellen: Es ist eine Sache — was der
// Redaktionstisch an dieser Story eingestellt hat. Zwei Ablagen müsste jemand
// zusammenhalten, und die Freigabe hängt ohnehin an beidem gemeinsam.

import { supabase } from "./supabase-server";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";
import { istKartenStil, type KartenStil } from "./social-karten-stil";
import type { GespeicherteFassung } from "./social-posts";

export async function ladeFassungen(): Promise<Record<string, GespeicherteFassung>> {
  if (!supabase) return {};
  try {
    const { data, error } = await withDbTimeout(
      supabase.from("social_vorlagen").select("post_id,vorlage,stil"),
      "social-vorlagen",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error || !data) return {};
    return Object.fromEntries(
      (data as { post_id: string; vorlage: string | null; stil: string | null }[]).map((r) => [
        r.post_id,
        {
          vorlage: r.vorlage ?? undefined,
          stil: istKartenStil(r.stil) ? r.stil : undefined,
        } satisfies GespeicherteFassung,
      ]),
    );
  } catch {
    // Ohne Ablage gilt die eingebaute Vorlage und die Vorgabe der Kategorie. Ein
    // Redaktionstisch, der wegen einer kränkelnden Datenbank gar nichts zeigt,
    // wäre der schlechtere Tausch.
    return {};
  }
}

/**
 * Text und/oder Farbschema speichern.
 *
 * Was nicht übergeben wird, bleibt unangetastet — sonst nähme ein Klick auf den
 * Farbschalter dem Redakteur seinen umformulierten Text weg, und gemerkt hätte
 * er es erst beim nächsten Aufruf der Seite.
 */
export async function speichereFassung(
  postId: string,
  aenderung: { vorlage?: string; stil?: KartenStil },
): Promise<void> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { error } = await supabase
    .from("social_vorlagen")
    .upsert(
      { post_id: postId, ...aenderung, geaendert_am: new Date().toISOString() },
      { onConflict: "post_id" },
    );
  if (error) throw new Error(`social_vorlagen upsert: ${error.message}`);
}

/**
 * Den Text auf die eingebaute Fassung zurücksetzen.
 *
 * Löscht die ZEILE nicht: Das Farbschema ist eine eigene Entscheidung und hat
 * mit der Formulierung nichts zu tun. Wer den Text zurücksetzt, will nicht auch
 * die Farbe zurückgesetzt haben.
 */
export async function setzeVorlageZurueck(postId: string): Promise<void> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { error } = await supabase
    .from("social_vorlagen")
    .update({ vorlage: null, geaendert_am: new Date().toISOString() })
    .eq("post_id", postId);
  if (error) throw new Error(`social_vorlagen update: ${error.message}`);
}
