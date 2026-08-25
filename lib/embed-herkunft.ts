import { supabase } from "./supabase-server";

// ─── Einbettungs-Zählung: Ablage und Leseseite ───────────────────────────────
//
// Warum es diese Zählung gibt, warum sie serverseitig läuft und welche drei
// Sätze über Datensparsamkeit dabei wahr bleiben müssen: `embed-herkunft-core.ts`.
// Diese Datei enthält nur, was Node braucht — die Tabellendefinition und die
// Leseseite für die Admin-Ansicht. Die Trennung ist nicht Geschmack: Die
// Middleware läuft in der Edge-Laufzeit und darf den Datenbank-Client hier
// nicht mitziehen.

/** Ein Kalendertag, eine Host-Domain, ein Widget, ein Zähler. */
export type EinbettungsZeile = {
  tag: string;
  host: string;
  widget: string;
  aufrufe: number;
};

export const EMBED_HERKUNFT_DDL = `
  create table if not exists embed_herkunft (
    tag date not null,
    host text not null,
    widget text not null,
    aufrufe integer not null default 0,
    primary key (tag, host, widget)
  );
  create index if not exists embed_herkunft_tag_idx on embed_herkunft (tag desc);
  alter table embed_herkunft enable row level security;

  -- Inkrement in EINER Anweisung. Über zwei Schritte (lesen, dann schreiben)
  -- verlieren gleichzeitige Aufrufe einander still — bei einem Zähler ist genau
  -- das der Fehler, den man nie bemerkt.
  create or replace function sc_embed_herkunft_zaehlen(p_host text, p_widget text)
  returns void
  language sql
  security definer
  set search_path = public
  as $$
    insert into embed_herkunft (tag, host, widget, aufrufe)
    values (current_date, p_host, p_widget, 1)
    on conflict (tag, host, widget)
    do update set aufrufe = embed_herkunft.aufrufe + 1;
  $$;

  revoke all on function sc_embed_herkunft_zaehlen(text, text) from public;
  revoke all on function sc_embed_herkunft_zaehlen(text, text) from anon;
  revoke all on function sc_embed_herkunft_zaehlen(text, text) from authenticated;
`;

/** Leseseite für die Admin-Ansicht: die Einbettungen seit einem Stichtag. */
export async function einbettungenSeit(tagIso: string): Promise<EinbettungsZeile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("embed_herkunft")
    .select("tag, host, widget, aufrufe")
    .gte("tag", tagIso)
    .order("tag", { ascending: false })
    .limit(2000);
  if (error || !data) return [];
  return data as EinbettungsZeile[];
}
