import { supabase } from "./supabase-server";
import { DIREKT, INTERN } from "./seiten-herkunft-core";

// ─── Seiten-Herkunft: Ablage und Leseseite ───────────────────────────────────
//
// Warum es diese Zählung gibt, warum sie serverseitig läuft und welche Grenze
// sie einhalten muss: `seiten-herkunft-core.ts`. Diese Datei enthält nur, was
// Node braucht — Tabellendefinition und Leseseite. Die Trennung ist nicht
// Geschmack: Die Middleware läuft in der Edge-Laufzeit und darf den
// Datenbank-Client hier nicht mitziehen.

/** Ein Kalendertag, ein Pfad, eine Herkunft, ein Zähler. */
export type SeitenZeile = {
  tag: string;
  pfad: string;
  herkunft: string;
  aufrufe: number;
};

export const SEITEN_HERKUNFT_DDL = `
  create table if not exists seiten_herkunft (
    tag date not null,
    pfad text not null,
    herkunft text not null,
    aufrufe integer not null default 0,
    primary key (tag, pfad, herkunft)
  );
  create index if not exists seiten_herkunft_tag_idx on seiten_herkunft (tag desc);
  create index if not exists seiten_herkunft_herkunft_idx on seiten_herkunft (herkunft);
  alter table seiten_herkunft enable row level security;

  -- Inkrement in EINER Anweisung. Über zwei Schritte (lesen, dann schreiben)
  -- verlieren gleichzeitige Aufrufe einander still — bei einem Zähler ist genau
  -- das der Fehler, den man nie bemerkt.
  create or replace function sc_seiten_herkunft_zaehlen(p_pfad text, p_herkunft text)
  returns void
  language sql
  security definer
  set search_path = public
  as $$
    insert into seiten_herkunft (tag, pfad, herkunft, aufrufe)
    values (current_date, p_pfad, p_herkunft, 1)
    on conflict (tag, pfad, herkunft)
    do update set aufrufe = seiten_herkunft.aufrufe + 1;
  $$;

  revoke all on function sc_seiten_herkunft_zaehlen(text, text) from public;
  revoke all on function sc_seiten_herkunft_zaehlen(text, text) from anon;
  revoke all on function sc_seiten_herkunft_zaehlen(text, text) from authenticated;
`;

/** Leseseite für die Admin-Ansicht: die Aufrufe seit einem Stichtag. */
export async function seitenaufrufeSeit(tagIso: string): Promise<SeitenZeile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("seiten_herkunft")
    .select("tag, pfad, herkunft, aufrufe")
    .gte("tag", tagIso)
    .order("tag", { ascending: false })
    .limit(5000);
  if (error || !data) return [];
  return data as SeitenZeile[];
}

/** Eine Herkunft mit ihrer Summe — für die Übersicht „woher kommen sie?". */
export type HerkunftSumme = { herkunft: string; aufrufe: number; seiten: number };

/**
 * Fasst Zeilen nach Herkunft zusammen, absteigend nach Aufrufen.
 *
 * Interne Navigation steht bewusst mit in der Liste statt herausgefiltert zu
 * werden: Sie ist die Gegenprobe. Wären dort null Aufrufe, wäre die Zählung
 * kaputt, und das sähe man einer Liste fremder Domains nicht an.
 */
export function nachHerkunft(zeilen: SeitenZeile[]): HerkunftSumme[] {
  const topf = new Map<string, { aufrufe: number; seiten: Set<string> }>();
  for (const z of zeilen) {
    const e = topf.get(z.herkunft) ?? { aufrufe: 0, seiten: new Set<string>() };
    e.aufrufe += z.aufrufe;
    e.seiten.add(z.pfad);
    topf.set(z.herkunft, e);
  }
  return [...topf.entries()]
    .map(([herkunft, e]) => ({ herkunft, aufrufe: e.aufrufe, seiten: e.seiten.size }))
    .sort((a, b) => b.aufrufe - a.aufrufe);
}

/** Eine Seite mit ihren Eintritten — für „welche Seite ist der Einstieg?". */
export type SeitenSumme = {
  pfad: string;
  aufrufe: number;
  vonAussen: number;
  direkt: number;
  intern: number;
};

/**
 * Fasst Zeilen nach Seite zusammen und trennt dabei die drei Fälle, um die es
 * geht: Eintritt von einer fremden Seite, Direkteinstieg, interne Navigation.
 *
 * Diese Trennung ist der ganze Zweck der Zählung. Die browserseitige Messung
 * kann sie nicht liefern — dort erfährt man die Herkunft nur beim allerersten
 * Aufruf eines Besuchs, alles danach sieht aus wie ein Direkteinstieg.
 */
export function nachSeite(zeilen: SeitenZeile[]): SeitenSumme[] {
  const topf = new Map<string, SeitenSumme>();
  for (const z of zeilen) {
    const e = topf.get(z.pfad) ?? {
      pfad: z.pfad,
      aufrufe: 0,
      vonAussen: 0,
      direkt: 0,
      intern: 0,
    };
    e.aufrufe += z.aufrufe;
    if (z.herkunft === DIREKT) e.direkt += z.aufrufe;
    else if (z.herkunft === INTERN) e.intern += z.aufrufe;
    else e.vonAussen += z.aufrufe;
    topf.set(z.pfad, e);
  }
  return [...topf.values()].sort((a, b) => b.aufrufe - a.aufrufe);
}
