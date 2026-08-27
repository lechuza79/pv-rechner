import "server-only";

// Ablage der bearbeiteten Textvorlagen. Regeln und Platzhalter-Logik:
// lib/social-vorlage.ts

import { supabase } from "./supabase-server";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";

export async function ladeVorlagen(): Promise<Record<string, string>> {
  if (!supabase) return {};
  try {
    const { data, error } = await withDbTimeout(
      supabase.from("social_vorlagen").select("post_id,vorlage"),
      "social-vorlagen",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error || !data) return {};
    return Object.fromEntries((data as { post_id: string; vorlage: string }[]).map((r) => [r.post_id, r.vorlage]));
  } catch {
    // Ohne Ablage gilt die eingebaute Vorlage. Ein Redaktionstisch, der wegen
    // einer kränkelnden Datenbank gar nichts zeigt, wäre der schlechtere Tausch.
    return {};
  }
}

export async function speichereVorlage(postId: string, vorlage: string): Promise<void> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { error } = await supabase
    .from("social_vorlagen")
    .upsert({ post_id: postId, vorlage, geaendert_am: new Date().toISOString() }, { onConflict: "post_id" });
  if (error) throw new Error(`social_vorlagen upsert: ${error.message}`);
}

export async function loescheVorlage(postId: string): Promise<void> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { error } = await supabase.from("social_vorlagen").delete().eq("post_id", postId);
  if (error) throw new Error(`social_vorlagen delete: ${error.message}`);
}
