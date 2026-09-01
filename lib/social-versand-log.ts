import "server-only";

// Was wirklich rausgegangen ist.
//
// WARUM ES DAS GEBEN MUSS (adversarialer Prüfer, 28.08.2026): Der Sendeweg
// hinterließ nirgends eine Spur. Drei Folgen, alle real:
//
//   1. DOPPELVERSAND. Bricht die Verbindung nach dem Aufruf bei LinkedIn ab und
//      jemand wiederholt, stehen zwei identische Beiträge im Feed. Nichts
//      verhinderte das.
//   2. EINE FREIGABE VERBRAUCHTE SICH NIE. Sie erlaubte beliebig viele
//      Sendungen, solange der Abdruck reproduzierbar blieb — beim
//      Stichtags-Beitrag wochenlang.
//   3. DIE FORENSIK WAR TOT. Steht morgen eine falsche Zahl im Feed, ließ sich
//      nicht rekonstruieren, welche Fassung raus ist und welcher Befund sie
//      freigab. Der Befund war kein Beweismittel, sondern der jeweils letzte
//      Zustand.
//
// Dieselbe Lehre hat der Förderbereich schon bezahlt: „Ein Zustandswechsel wird
// mitgeschrieben, bevor er überschrieben wird", inklusive „gelöscht wird nie".
// Das Veröffentlichungs-Tor brach dieselbe Regel im gefährlicheren Bereich.
//
// NUR ANHÄNGEN, NIE ÄNDERN. Eine Zeile hier ist die Aussage „das ging an dem
// Tag mit diesem Abdruck raus". Sie zu überschreiben hieße, die Vergangenheit
// zu bearbeiten.

import { supabase } from "./supabase-server";
import type { SocialPlattform } from "./social-ablauf";

export type Versand = {
  post_id: string;
  /** Abdruck der Fassung, die wirklich rausging. */
  fassung_fingerabdruck: string;
  /** Kennung beim Kanal — für den Rückweg zum echten Beitrag. */
  extern_id: string | null;
  kanal: string;
  gesendet_am: string;
};

export const SOCIAL_VERSAND_DDL = `
  CREATE TABLE IF NOT EXISTS social_versand (
    id bigserial PRIMARY KEY,
    post_id text NOT NULL,
    fassung_fingerabdruck text NOT NULL,
    extern_id text,
    kanal text NOT NULL DEFAULT 'linkedin',
    gesendet_am timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS social_versand_post_idx ON social_versand (post_id, gesendet_am DESC);
  ALTER TABLE social_versand ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON social_versand FROM PUBLIC;
  REVOKE ALL ON social_versand FROM anon;
  REVOKE ALL ON social_versand FROM authenticated;
`;

export async function ladeVersand(): Promise<Versand[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("social_versand")
    .select("post_id,fassung_fingerabdruck,extern_id,kanal,gesendet_am")
    .order("gesendet_am", { ascending: false });
  if (error || !data) return [];
  return data as Versand[];
}

export async function schreibeVersand(v: Omit<Versand, "gesendet_am">): Promise<void> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { error } = await supabase.from("social_versand").insert({ ...v, gesendet_am: new Date().toISOString() });
  if (error) throw new Error(`social_versand insert: ${error.message}`);
}

/**
 * Ging DIESE Fassung auf DIESEM Kanal schon einmal raus?
 *
 * Die Sperre gegen den Doppelversand hängt an der FASSUNG, nicht am Beitrag:
 * Ein Beitrag darf nach einer echten Überarbeitung ein zweites Mal laufen —
 * dieselbe Fassung zweimal ist dagegen immer ein Versehen.
 *
 * UND SIE HÄNGT AM KANAL. Ohne ihn hätte der LinkedIn-Versand den auf Instagram
 * gesperrt: Derselbe Beitrag soll auf beiden erscheinen, und ein Beitrag, der
 * auf einem Kanal draußen ist, ist auf dem anderen noch gar nicht gesendet. Die
 * Sperre gilt der Wiederholung, nicht der Verbreitung.
 */
export async function schonGesendet(
  postId: string,
  abdruck: string,
  kanal: SocialPlattform = "linkedin",
): Promise<Versand | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("social_versand")
    .select("post_id,fassung_fingerabdruck,extern_id,kanal,gesendet_am")
    .eq("post_id", postId)
    .eq("fassung_fingerabdruck", abdruck)
    .eq("kanal", kanal)
    .limit(1);
  if (error || !data?.length) return null;
  return data[0] as Versand;
}

/**
 * Wann diese Fassung ZUERST rausging — über alle Kanäle hinweg.
 *
 * Der Bezugspunkt der Haltbarkeit. Nicht der Versand auf dem gefragten Kanal:
 * Eine Aussage altert ab ihrer ersten Veröffentlichung, nicht ab der zweiten.
 * Wer den kanaleigenen Versand nähme, bekäme bei jedem neuen Kanal eine frische
 * Frist — und genau das soll die Regel verhindern.
 */
export async function ersterVersand(postId: string, abdruck: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("social_versand")
    .select("gesendet_am")
    .eq("post_id", postId)
    .eq("fassung_fingerabdruck", abdruck)
    .order("gesendet_am", { ascending: true })
    .limit(1);
  if (error || !data?.length) return null;
  return (data[0] as { gesendet_am: string }).gesendet_am;
}
