import "server-only";

// Datenbank-Schicht der Prüfstufe. Regeln und Typen: lib/social-pruefung-kern.ts

import { supabase } from "./supabase-server";
import { textAbdruck, urteil, type PruefUrteil, type Pruefung } from "./social-pruefung-kern";

export type { PruefArt, Pruefung, PruefUrteil } from "./social-pruefung-kern";
export { NOETIGE_PRUEFUNGEN, SOCIAL_PRUEFUNG_DDL, textAbdruck, urteil } from "./social-pruefung-kern";

export async function ladePruefungen(postId: string): Promise<Pruefung[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("social_pruefungen").select("*").eq("post_id", postId);
  if (error || !data) return [];
  return data as Pruefung[];
}

export async function speicherePruefung(p: Omit<Pruefung, "geprueft_am">): Promise<void> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { error } = await supabase
    .from("social_pruefungen")
    .upsert({ ...p, geprueft_am: new Date().toISOString() }, { onConflict: "post_id,art,text_fingerabdruck" });
  if (error) throw new Error(`social_pruefungen upsert: ${error.message}`);
}

/**
 * Darf dieser Text raus?
 *
 * Wird VOR jeder Veröffentlichung gefragt, nicht nur in der Oberfläche: Eine
 * Sperre, die nur der Knopf kennt, ist keine. Ohne Datenbank gibt es keine
 * Freigabe — im Zweifel nicht senden.
 */
export async function pruefungGueltig(postId: string, text: string): Promise<PruefUrteil> {
  if (!supabase) return { ok: false, grund: "Prüfungen sind nicht abrufbar (keine Datenbank)." };
  return urteil(text, await ladePruefungen(postId));
}

export function abdruckVon(text: string): string {
  return textAbdruck(text);
}
