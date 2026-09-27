// ─── Geräte-Katalog: Ablage und Lesezugriff ───────────────────────────────────
//
// Der Händler-Datenstrom wird täglich abgerufen (`npm run wp:katalog`) und liegt
// als Momentaufnahme in Supabase. Gelesen wird er nur serverseitig — die Tabelle
// hat RLS ohne Policy, ist also mit dem öffentlichen Schlüssel unsichtbar.

import "server-only";
import { supabase } from "./supabase-server";
import { withDbTimeout, DB_SOFT_READ_TIMEOUT_MS } from "./db-timeout";
import { WP_KATALOG_TABELLE, type WpGeraet } from "./wp-katalog";

export { WP_KATALOG_TABELLE };


/**
 * Wie alt der Katalog höchstens sein darf, damit wir Preise anzeigen.
 *
 * Ein Preis ist die Aussage, die am schnellsten falsch wird, und sie steht neben
 * einem Kaufknopf. Der Abruf läuft täglich; drei Tage sind also drei verpasste
 * Läufe und damit ein Zeichen, dass etwas klemmt — dann zeigen wir lieber keine
 * Geräte als veraltete Preise. Dieselbe Logik wie beim Förderabzug: Nicht das
 * Alter an sich entscheidet, sondern ob wir den Stand gerade bestätigen können.
 */
export const KATALOG_MAX_ALTER_TAGE = 3;

export interface KatalogStand {
  geraete: WpGeraet[];
  abgerufenIso: string | null;
  /** false, wenn der Bestand zu alt ist — dann wird nichts angezeigt. */
  frisch: boolean;
  /**
   * Konnten wir den Katalog überhaupt lesen?
   *
   * DIE UNTERSCHEIDUNG IST EINE AUSSAGE ÜBER EINEN DRITTEN, und deshalb steht
   * sie hier. Ohne sie ergaben drei verschiedene Lagen dieselbe Anzeige: „für
   * diese Anlagengröße ist gerade kein passendes Gerät im Sortiment von
   * Heizungsdiscount24" — auch dann, wenn wir die Tabelle gar nicht erreicht
   * haben. Das ist eine Behauptung über das Sortiment eines Händlers, die wir
   * in diesem Moment nicht belegen können; dieselbe Trennlinie wie beim
   * Förder-Wächter zwischen „hat sich geändert" und „Abruf kam nicht durch".
   *
   * Aufgefallen in einem Arbeitsstand ohne Datenbankzugang (10.09.2026): Die
   * Seite sah vollkommen normal aus und sagte etwas Falsches.
   */
  erreichbar: boolean;
}

interface Zeile {
  id: string;
  name: string;
  marke: string;
  leistung_kw: number;
  herkunft: string;
  bauart: string;
  preis_eur: number;
  versand_eur: number | null;
  link: string;
  bild_url: string | null;
  lieferbar: boolean;
  vorlauf_max_c: number | null;
  kaeltemittel: string | null;
  aufbau: string | null;
  umfang: string | null;
  abgerufen_am: string;
}

function ausZeile(z: Zeile): WpGeraet {
  return {
    id: z.id,
    name: z.name,
    marke: z.marke,
    leistungKw: Number(z.leistung_kw),
    herkunft: z.herkunft === "ausgeschrieben" ? "ausgeschrieben" : "typenschluessel",
    bauart: z.bauart as WpGeraet["bauart"],
    preisEur: Number(z.preis_eur),
    // NULL bleibt null, nicht 0: „unbekannt“ und „kostenlos“ sind zwei Aussagen.
    versandEur: z.versand_eur === null ? null : Number(z.versand_eur),
    link: z.link,
    bildUrl: z.bild_url,
    lieferbar: z.lieferbar,
    vorlaufMaxC: z.vorlauf_max_c === null ? null : Number(z.vorlauf_max_c),
    kaeltemittel: (z.kaeltemittel as WpGeraet["kaeltemittel"]) ?? null,
    aufbau: (z.aufbau as WpGeraet["aufbau"]) ?? null,
    // Altbestand ohne Spalte gilt als Einzelgerät — die vorsichtige Richtung:
    // lieber ein Paket als Gerät auszeichnen als umgekehrt.
    umfang: z.umfang === "paket" ? "paket" : "geraet",
  };
}

/** Der Katalog wurde gelesen und ist leer — eine echte Auskunft. */
const LEER: KatalogStand = { geraete: [], abgerufenIso: null, frisch: false, erreichbar: true };

/** Wir kamen an den Katalog nicht heran — gar keine Auskunft. */
const UNERREICHBAR: KatalogStand = { ...LEER, erreichbar: false };

/**
 * Alle Geräte einer Wärmequelle.
 *
 * Gefiltert wird schon in der Abfrage: Der Katalog hat rund 580 Zeilen, davon
 * braucht ein einzelner Aufruf nur die Hälfte, und der Rest wanderte sonst bei
 * jedem Seitenaufbau durch die Leitung.
 */
export async function ladeKatalog(bauart: "luft-wasser" | "sole-wasser"): Promise<KatalogStand> {
  if (!supabase) return UNERREICHBAR;

  // Weiches Zeitbudget: Fällt der Katalog aus, zeigt die Seite eben keine
  // Geräte — das Ergebnis des Rechners steht davon unberührt. Auf acht Sekunden
  // zu warten bekäme der Nutzer dasselbe wie nach drei, nur später.
  const antwort = await withDbTimeout(
    supabase
      .from(WP_KATALOG_TABELLE)
      .select(
        "id,name,marke,leistung_kw,herkunft,bauart,preis_eur,versand_eur,link,bild_url,lieferbar,vorlauf_max_c,kaeltemittel,aufbau,umfang,abgerufen_am",
      )
      .eq("bauart", bauart)
      .eq("lieferbar", true),
    "wp-katalog",
    DB_SOFT_READ_TIMEOUT_MS,
  ).catch(() => null);

  // Kein Ergebnisobjekt heißt: Zeitbudget gerissen oder Fehler — wir haben den
  // Katalog nicht gesehen. Ein Ergebnis mit null Zeilen heißt: gesehen, leer.
  if (!antwort) return UNERREICHBAR;
  const zeilen = (antwort.data ?? null) as Zeile[] | null;
  if (!zeilen || zeilen.length === 0) return LEER;

  /**
   * Der Stand des Katalogs — der ÄLTESTE Zeitstempel, nicht der erste beliebige.
   *
   * Die erste Fassung nahm `zeilen[0].abgerufen_am`. Ohne Sortierung ist das
   * eine zufällige Zeile, und in dem einen Fall, in dem es darauf ankommt,
   * stehen verschiedene Stände nebeneinander: Der Auffrisch-Lauf schreibt in
   * Blöcken zu 500 und räumt erst danach auf. Bricht er nach dem ersten Block
   * ab, trägt die Hälfte der Zeilen den neuen Zeitstempel, die andere den
   * alten, und gelöscht wurde nichts.
   *
   * Welche Zeile Postgres dann zuerst liefert, ist nicht zugesichert. Trifft es
   * eine frische, gilt der ganze Bestand als frisch — samt der alten Preise, die
   * neben einem Kaufknopf stehen. Genau das soll die Frist verhindern.
   *
   * Das Minimum ist die vorsichtige Richtung: Ein gemischter Bestand ist so alt
   * wie sein ältester Teil. Im Normalfall (ein durchgelaufener Lauf) tragen alle
   * Zeilen denselben Wert, und die Rechnung ändert sich nicht.
   */
  const abgerufenIso = zeilen.reduce(
    (aeltester, z) => (z.abgerufen_am < aeltester ? z.abgerufen_am : aeltester),
    zeilen[0].abgerufen_am,
  );
  const alterTage = (Date.now() - new Date(abgerufenIso).getTime()) / 86_400_000;

  return {
    geraete: zeilen.map(ausZeile),
    abgerufenIso,
    frisch: alterTage <= KATALOG_MAX_ALTER_TAGE,
    erreichbar: true,
  };
}
