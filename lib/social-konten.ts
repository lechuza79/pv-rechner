import "server-only";

// Datenbank-Schicht der Social-Konten (LinkedIn, später Instagram).
//
// Warum die Zugangsschlüssel in der Datenbank liegen und nicht in den
// Umgebungsvariablen: Sie entstehen erst durch einen Login im Browser und
// LAUFEN AB — bei LinkedIn nach zwei Monaten. Eine Umgebungsvariable, die alle
// acht Wochen von Hand nachgetragen werden muss, wird irgendwann nicht
// nachgetragen, und der Versand hört still auf. In der Tabelle kann ein Wächter
// das Ablaufdatum sehen und vorher warnen.
//
// Typen, Tabellen-SQL und Ablauf-Regel stehen in lib/social-ablauf.ts (rein,
// testbar ohne Server-Kontext).

import { supabase } from "./supabase-server";
import type { SocialKonto, SocialPlattform } from "./social-ablauf";

export type { SocialKonto, SocialPlattform, AblaufBefund } from "./social-ablauf";
export { SOCIAL_KONTEN_DDL, SOCIAL_ABLAUF_WARNUNG_TAGE, ablaufBefund } from "./social-ablauf";

export async function ladeKonto(plattform: SocialPlattform): Promise<SocialKonto | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("social_konten")
    .select("*")
    .eq("plattform", plattform)
    .maybeSingle();
  if (error || !data) return null;
  return data as SocialKonto;
}

export async function speichereKonto(konto: Omit<SocialKonto, "aktualisiert_am">): Promise<void> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { error } = await supabase
    .from("social_konten")
    .upsert({ ...konto, aktualisiert_am: new Date().toISOString() }, { onConflict: "plattform" });
  if (error) throw new Error(`social_konten upsert: ${error.message}`);
}
