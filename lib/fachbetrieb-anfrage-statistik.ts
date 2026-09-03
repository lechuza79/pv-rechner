import "server-only";
import { supabase } from "./supabase-server";

/**
 * Was von einer Anfrage übrig bleibt, wenn man alles Persönliche weglässt.
 *
 * ── Warum überhaupt ────────────────────────────────────────────────────────
 * Ohne diese Zeilen wissen wir über den Rückkanal genau eine Sache: dass eine
 * Mail rausging. Nicht, welche Anlagen die Leute rechnen, ob Speicher dabei
 * ist, wie oft ein Formular geöffnet und dann doch nicht abgeschickt wird.
 * Genau das entscheidet später, ob der Rückkanal etwas taugt.
 *
 * ── Was NICHT gespeichert wird, und zwar nie ───────────────────────────────
 * Kein Name, kein Kontaktweg, keine Nachricht, keine IP, keine Kennung des
 * Nutzers. Auch nicht gekürzt, auch nicht gehasht: Ein Hash über eine
 * Mailadresse ist ein Pseudonym, kein anonymer Wert — wer die Adresse kennt,
 * kann ihn nachrechnen.
 *
 * ── Warum die Angaben GROB sind ────────────────────────────────────────────
 * Anonym ist eine Zeile erst, wenn sie sich niemandem mehr zuordnen lässt.
 * Volle Postleitzahl plus Anlagengröße plus Zeitstempel wäre in einem kleinen
 * Ort eine Beschreibung genau eines Haushalts. Deshalb: die ersten zwei
 * Stellen der Postleitzahl (rund eine Million Einwohner je Bereich), der
 * KALENDERTAG statt der Uhrzeit, und die Anlagengröße in Stufen.
 *
 * Der Betrieb dagegen wird benannt — er ist eine Firma und kein Mensch, und
 * ohne ihn ließe sich nicht sagen, bei wem der Rückkanal überhaupt ankommt.
 * Bei Einzelunternehmen ist auch das eine personenbezogene Angabe; sie steht
 * deshalb unter demselben Zweck wie das Verzeichnis selbst
 * (Art. 6 Abs. 1 lit. f) und ist in der Datenschutzerklärung benannt.
 */

/** Wie weit der Nutzer gekommen ist. */
export type AnfrageSchritt = "geoeffnet" | "abgeschickt";

export type AnfrageStatistik = {
  betriebDomain: string;
  schritt: AnfrageSchritt;
  /** Anlagengröße in kWp, auf ganze Stufen gerundet. */
  kwp: number | null;
  /** Speichergröße in kWh, gerundet. 0 = ohne Speicher. */
  speicherKwh: number | null;
  /** Nur die ersten ZWEI Stellen der Postleitzahl. */
  plzBereich: string | null;
  /** Hat der Nutzer eine Nachricht geschrieben? Nur ob, nie was. */
  mitNachricht: boolean;
};

export const ANFRAGE_STATISTIK_DDL = `
  create table if not exists fachbetrieb_anfragen (
    id bigserial primary key,
    -- Kalendertag, keine Uhrzeit: Eine Uhrzeit macht aus zwei anonymen Zeilen
    -- ein Paar, das sich einem Besuch zuordnen lässt.
    tag date not null default current_date,
    betrieb_domain text not null,
    schritt text not null,
    kwp integer,
    speicher_kwh integer,
    -- ZWEI Stellen. Fünf wären in einem Dorf eine Ortsangabe.
    plz_bereich text,
    mit_nachricht boolean not null default false
  );
  create index if not exists idx_fb_anfragen_tag on fachbetrieb_anfragen (tag desc);
  create index if not exists idx_fb_anfragen_betrieb on fachbetrieb_anfragen (betrieb_domain);
  alter table fachbetrieb_anfragen enable row level security;
`;

/**
 * Legt eine Zeile ab. Schlägt das fehl, ist das KEIN Grund, die Anfrage
 * scheitern zu lassen — der Nutzer wollte eine Mail verschicken, nicht unsere
 * Statistik füttern.
 */
export async function anfrageMerken(s: AnfrageStatistik): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("fachbetrieb_anfragen").insert({
      betrieb_domain: s.betriebDomain,
      schritt: s.schritt,
      kwp: s.kwp === null ? null : Math.round(s.kwp),
      speicher_kwh: s.speicherKwh === null ? null : Math.round(s.speicherKwh),
      plz_bereich: s.plzBereich,
      mit_nachricht: s.mitNachricht,
    });
  } catch {
    // still. Siehe oben.
  }
}

/**
 * Zieht die groben Angaben aus dem Ergebnis-Link.
 *
 * Der Link trägt den vollständigen Rechenstand — hier wird bewusst nur ein
 * Bruchteil davon übernommen. Wer die Auswertung erweitert, prüft vorher, ob
 * die neue Angabe zusammen mit den vorhandenen jemanden identifizierbar macht.
 */
export function ausErgebnisUrl(url: string | null): Pick<AnfrageStatistik, "kwp" | "speicherKwh" | "plzBereich"> {
  if (!url) return { kwp: null, speicherKwh: null, plzBereich: null };
  try {
    const p = new URL(url).searchParams;
    const zahl = (k: string): number | null => {
      const w = p.get(k);
      if (w === null) return null;
      const n = Number(w.replace(",", "."));
      return Number.isFinite(n) ? n : null;
    };
    const plz = p.get("plz");
    return {
      kwp: zahl("ck"),
      speicherKwh: zahl("sk") ?? (p.get("s") === "0" ? 0 : null),
      plzBereich: plz && /^\d{5}$/.test(plz) ? plz.slice(0, 2) : null,
    };
  } catch {
    return { kwp: null, speicherKwh: null, plzBereich: null };
  }
}
