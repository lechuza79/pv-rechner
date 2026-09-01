import "server-only";

// Was für einen Tag GEPLANT ist.
//
// Damit bekommt der Kalender doch gespeicherte Termine — und der alte Einwand
// der Planungsansicht gilt weiter: Ein Datum ist eine Zusage, die niemand
// einhält, sobald eine Woche voll wird. Der Betreiber will die Zuweisung
// trotzdem, und das ist seine Entscheidung.
//
// DIE ANTWORT AUF DEN EINWAND IST NICHT, IHN ZU IGNORIEREN, sondern die Folge
// sichtbar zu machen: Ein Platz in der Vergangenheit, für den etwas geplant war
// und nichts rausging, wird als „geplant, nicht gesendet" ausgewiesen statt
// stillschweigend zu verschwinden. Ein Plan, dessen Verstreichen man sieht, ist
// etwas anderes als einer, der es verschweigt.
//
// DREI ARTEN, und der Unterschied ist inhaltlich:
//   „post"        — ein fertiger Beitrag aus dem Bestand. Der Normalfall.
//   „datenstory"  — eine Geschichten-Familie, aus der noch nichts gebaut ist.
//                   Der Platz sagt: hier entsteht etwas aus DIESEN Daten.
//   „individuell" — ein Thema aus einer freien Kategorie (Feature, UX). Dazu
//                   gibt es keinen Beitrag und keine Berechnung; es ist reine
//                   Planung, und die Ansicht sagt das auch.

import { supabase } from "./supabase-server";

export type PlatzArt = "post" | "datenstory" | "individuell";

export type GeplanterPlatz = {
  /** Kalendertag, ISO. Ein Tag trägt höchstens einen Platz. */
  datum: string;
  art: PlatzArt;
  /** Bei „post": die Beitragskennung. */
  post_id: string | null;
  /** Bei „datenstory": der Schlüssel der Geschichten-Familie. */
  familie: string | null;
  /** Bei „individuell": die gewählte Kategorie. */
  kategorie: string | null;
  /** Bei „datenstory" und „individuell": die Arbeitsbezeichnung. */
  titel: string | null;
  /**
   * Wann an dem Tag gesendet werden soll — „11:07".
   *
   * SIE WIRD MITGESCHRIEBEN, obwohl sie sich aus dem Datum ableiten ließe. Der
   * Grund ist nicht die Rechnung, sondern die Absicht: Wer die Zeit von Hand
   * ändert, will nicht, dass die Formel sie beim nächsten Aufbau überschreibt.
   * Alte Plätze ohne Zeit fallen auf die Ableitung zurück.
   */
  uhrzeit: string | null;
  geplant_am: string;
};

export const SOCIAL_PLAETZE_DDL = `
  CREATE TABLE IF NOT EXISTS social_plaetze (
    datum date PRIMARY KEY,
    art text NOT NULL CHECK (art IN ('post', 'datenstory', 'individuell')),
    post_id text,
    familie text,
    kategorie text,
    titel text,
    uhrzeit text,
    geplant_am timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE social_plaetze ADD COLUMN IF NOT EXISTS uhrzeit text;
  ALTER TABLE social_plaetze ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON social_plaetze FROM PUBLIC;
  REVOKE ALL ON social_plaetze FROM anon;
  REVOKE ALL ON social_plaetze FROM authenticated;
`;

export async function ladePlaetze(): Promise<GeplanterPlatz[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("social_plaetze")
    .select("datum,art,post_id,familie,kategorie,titel,uhrzeit,geplant_am");
  if (error || !data) return [];
  return data as GeplanterPlatz[];
}

/**
 * Einen Tag belegen. Ein Tag trägt höchstens einen Platz, deshalb ersetzt eine
 * neue Zuweisung die alte — anders als beim Versandprotokoll, das nur anhängt.
 * Der Unterschied ist die Aussage: Das Protokoll sagt, was passiert IST, der
 * Plan sagt, was vorgesehen ist. Das eine ist Vergangenheit, das andere eine
 * Absicht, und Absichten ändert man.
 */
export async function setzePlatz(p: Omit<GeplanterPlatz, "geplant_am">): Promise<void> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { error } = await supabase
    .from("social_plaetze")
    .upsert({ ...p, geplant_am: new Date().toISOString() }, { onConflict: "datum" });
  if (error) throw new Error(`social_plaetze upsert: ${error.message}`);
}

export async function loeschePlatz(datum: string): Promise<void> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { error } = await supabase.from("social_plaetze").delete().eq("datum", datum);
  if (error) throw new Error(`social_plaetze delete: ${error.message}`);
}
