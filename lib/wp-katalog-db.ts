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
}

interface Zeile {
  id: string;
  name: string;
  marke: string;
  leistung_kw: number;
  herkunft: string;
  bauart: string;
  preis_eur: number;
  link: string;
  bild_url: string | null;
  lieferbar: boolean;
  vorlauf_max_c: number | null;
  kaeltemittel: string | null;
  aufbau: string | null;
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
    link: z.link,
    bildUrl: z.bild_url,
    lieferbar: z.lieferbar,
    vorlaufMaxC: z.vorlauf_max_c === null ? null : Number(z.vorlauf_max_c),
    kaeltemittel: (z.kaeltemittel as WpGeraet["kaeltemittel"]) ?? null,
    aufbau: (z.aufbau as WpGeraet["aufbau"]) ?? null,
  };
}

const LEER: KatalogStand = { geraete: [], abgerufenIso: null, frisch: false };

/**
 * Alle Geräte einer Wärmequelle.
 *
 * Gefiltert wird schon in der Abfrage: Der Katalog hat rund 580 Zeilen, davon
 * braucht ein einzelner Aufruf nur die Hälfte, und der Rest wanderte sonst bei
 * jedem Seitenaufbau durch die Leitung.
 */
export async function ladeKatalog(bauart: "luft-wasser" | "sole-wasser"): Promise<KatalogStand> {
  if (!supabase) return LEER;

  // Weiches Zeitbudget: Fällt der Katalog aus, zeigt die Seite eben keine
  // Geräte — das Ergebnis des Rechners steht davon unberührt. Auf acht Sekunden
  // zu warten bekäme der Nutzer dasselbe wie nach drei, nur später.
  const antwort = await withDbTimeout(
    supabase
      .from(WP_KATALOG_TABELLE)
      .select(
        "id,name,marke,leistung_kw,herkunft,bauart,preis_eur,link,bild_url,lieferbar,vorlauf_max_c,kaeltemittel,aufbau,abgerufen_am",
      )
      .eq("bauart", bauart)
      .eq("lieferbar", true),
    "wp-katalog",
    DB_SOFT_READ_TIMEOUT_MS,
  ).catch(() => null);

  const zeilen = (antwort?.data ?? null) as Zeile[] | null;
  if (!zeilen || zeilen.length === 0) return LEER;

  const abgerufenIso = zeilen[0].abgerufen_am;
  const alterTage = (Date.now() - new Date(abgerufenIso).getTime()) / 86_400_000;

  return {
    geraete: zeilen.map(ausZeile),
    abgerufenIso,
    frisch: alterTage <= KATALOG_MAX_ALTER_TAGE,
  };
}
