import "server-only";

// Datenbank-Schicht der Prüfstufe. Regeln und Typen: lib/social-pruefung-kern.ts

import { supabase } from "./supabase-server";
import { urteil, type Fassung, type PruefUrteil, type Pruefung } from "./social-pruefung-kern";
import { fassungsAbdruck } from "./social-abdruck";

export type { PruefArt, Pruefung, PruefUrteil, Fassung } from "./social-pruefung-kern";
export { NOETIGE_PRUEFUNGEN, SOCIAL_PRUEFUNG_DDL, fassungsText, urteil } from "./social-pruefung-kern";
export { fassungsAbdruck } from "./social-abdruck";

export async function ladePruefungen(postId: string): Promise<Pruefung[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("social_pruefungen").select("*").eq("post_id", postId);
  if (error || !data) return [];
  return data as Pruefung[];
}

/**
 * Alle Prüfungen auf einmal — für die Übersicht.
 *
 * Eine Abfrage statt einer je Story: Die Tabelle hält zwei Zeilen pro geprüfter
 * Fassung, das ist auch bei hundert Beiträgen nichts. Elf einzelne Abfragen
 * nacheinander wären dagegen elf Roundtrips für eine Seite, die nur eine Liste
 * zeigt.
 */
export async function ladeAllePruefungen(): Promise<Record<string, Pruefung[]>> {
  if (!supabase) return {};
  const { data, error } = await supabase.from("social_pruefungen").select("*");
  if (error || !data) return {};
  const nach: Record<string, Pruefung[]> = {};
  for (const p of data as Pruefung[]) (nach[p.post_id] ??= []).push(p);
  return nach;
}

export async function speicherePruefung(p: Omit<Pruefung, "geprueft_am">): Promise<void> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { error } = await supabase
    .from("social_pruefungen")
    .upsert({ ...p, geprueft_am: new Date().toISOString() }, { onConflict: "post_id,art,fassung_fingerabdruck" });
  if (error) throw new Error(`social_pruefungen upsert: ${error.message}`);
}

/**
 * Darf diese Fassung raus?
 *
 * Wird VOR jeder Veröffentlichung gefragt, nicht nur in der Oberfläche: Eine
 * Sperre, die nur der Knopf kennt, ist keine. Ohne Datenbank gibt es keine
 * Freigabe — im Zweifel nicht senden.
 */
export async function pruefungGueltig(postId: string, fassung: Fassung): Promise<PruefUrteil> {
  if (!supabase) return { ok: false, grund: "Prüfungen sind nicht abrufbar (keine Datenbank)." };
  return urteil(fassungsAbdruck(fassung), await ladePruefungen(postId));
}

export function abdruckVon(fassung: Fassung): string {
  return fassungsAbdruck(fassung);
}
