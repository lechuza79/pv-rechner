import { supabase } from "./supabase-server";

// ─── Wo hängen unsere Widgets? ───────────────────────────────────────────────
//
// WARUM (25.08.2026): Der Kommunen-Outreach verschickt Widget-Angebote, und bis
// hierher konnten wir den Erfolg nur an Rückläufern ablesen — also an dem, was
// jemand ANTWORTET, nicht an dem, was jemand TUT. Eine Gemeinde, die das Widget
// wortlos einbaut, war für uns unsichtbar.
//
// Der naheliegende Weg wäre eine gekaufte Backlink-Datenbank. Der trägt hier
// aber nicht: Auf der einbettenden Seite steht nur ein <iframe>, unser
// "Powered by"-Link liegt IM eingebetteten Dokument und damit auf unserer
// eigenen Domain. Ob ein Link-Index eine iframe-Quelle mitzählt, ist von außen
// nicht zu erkennen — und selbst wenn, sähen wir es Wochen später.
//
// Der Einbau läuft dagegen zwangsläufig über unseren Server: Ohne einen Abruf
// bei uns gibt es kein Widget. Diese Auskunft haben wir also ohnehin, wir haben
// sie nur nie aufgeschrieben.
//
// DATENSPARSAMKEIT ist hier keine Zierde, sondern die Bedingung, unter der das
// überhaupt gebaut werden darf — die Widgets sind Einbettenden gegenüber als
// "cookielos, kein Browser-Speicher" zugesagt (§ 25 TDDDG, Galerie-Baustein):
//   * Gespeichert wird die DOMAIN der einbettenden Seite, NICHT ihr Pfad. Der
//     Pfad wäre schon eine Aussage darüber, welche Unterseite jemand aufruft.
//   * KEINE IP, keine Kennung, kein Zeitstempel feiner als der Kalendertag.
//     Damit ist keine Zeile einem Besucher zuzuordnen, auch nicht rückwirkend.
//   * Kein Schreiben und kein Lesen im Browser des Besuchers.
// Wer hier eine Spalte ergänzt, prüft zuerst, ob sie diese drei Sätze noch
// wahr lässt — sonst wird aus einer Einbau-Zählung eine Besucher-Messung.

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

/** Unsere eigenen Domains zählen nicht als Einbettung. */
const EIGENE = [
  "solar-check.io",
  "www.solar-check.io",
  "pv-rechner-alpha.vercel.app",
  "localhost",
  "127.0.0.1",
];

// Eine Host-Angabe kommt aus dem Browser eines Fremden und ist damit frei
// wählbar. Sie landet als Text in der Datenbank und später in einer
// Admin-Ansicht — deshalb hier ein enges Muster statt einer Säuberung:
// Buchstaben, Ziffern, Punkt und Bindestrich, mindestens ein Punkt, keine
// Umlaute (internationale Domains stehen im Browser bereits in ihrer
// ASCII-Schreibweise).
const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/**
 * Macht aus der gemeldeten Herkunft eine speicherbare Domain — oder `null`,
 * wenn nichts Verwertbares übrig bleibt (eigene Seite, Unsinn, zu lang).
 *
 * Nimmt bewusst NUR den Host: Der Aufrufer darf einen vollständigen Ursprung
 * ("https://example.de") schicken, gespeichert wird nie mehr als "example.de".
 */
export function hostAusHerkunft(roh: string | null | undefined): string | null {
  if (!roh) return null;
  const text = roh.trim().toLowerCase();
  if (!text || text.length > 253) return null;

  let host = text;
  if (host.includes("/") || host.includes(":")) {
    try {
      host = new URL(host.includes("//") ? host : `https://${host}`).hostname;
    } catch {
      return null;
    }
  }
  if (!HOST_RE.test(host)) return null;
  if (EIGENE.includes(host)) return null;
  return host;
}

// Welches Widget eingebaut wurde, meldet der Browser des Einbettenden — also
// eine Angabe von außen. Sie wird deshalb gegen eine Liste geprüft und nie als
// Freitext übernommen (dasselbe Muster wie die Themen-Allowlist des
// Kontaktformulars: was in die Datenbank wandert, kommt aus unserer Liste).
// `lib/__tests__/embed-herkunft.test.ts` hält die Liste gegen den Dateibaum —
// ein neues Widget fällt dort auf, nicht erst an fehlenden Zahlen.
export const EMBED_WIDGETS = [
  "ee-ampel",
  "einspeiseverguetung-verlauf",
  "erzeugung",
  "erzeugung-mini",
  "foerder-check",
  "gemeinde-erneuerbare",
  "gemeinde-solar",
  "gemeinde-solarleistung",
  "gruengas-heizkosten",
  "karte",
  "kennzahl",
  "pv-zubau-deutschland",
  "region-anlagentyp",
  "region-solarleistung",
  "simulation",
  "strommix",
  "strommix-anteil",
  "zubau-erneuerbare-atom",
] as const;

export type EmbedWidget = (typeof EMBED_WIDGETS)[number];

export function istEmbedWidget(v: unknown): v is EmbedWidget {
  return typeof v === "string" && (EMBED_WIDGETS as readonly string[]).includes(v);
}

/**
 * Zählt eine Einbettung. Schlägt das fehl, ist das folgenlos — eine verlorene
 * Zählung darf niemals die Auslieferung eines Widgets stören.
 */
export async function zaehleEinbettung(host: string, widget: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.rpc("sc_embed_herkunft_zaehlen", {
      p_host: host,
      p_widget: widget,
    });
    return !error;
  } catch {
    return false;
  }
}

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
