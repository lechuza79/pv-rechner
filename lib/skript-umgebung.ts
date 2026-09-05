// Der gemeinsame Unterbau aller Skripte: Zugangsdaten laden, Datenbankzugang
// herstellen, eine ganze Tabelle lesen.
//
// WARUM ES DIESES MODUL GIBT (gemessen 05.09.2026): `loadEnvFile` stand
// wortgleich in 23 Skripten, `alleZeilen` in mindestens zehn. Jede Kopie
// verdient sich dieselben Fehler neu — und eine davon hatte einen, den die
// anderen nicht hatten.
//
// Node-Modul, kein Browser: Es liest das Dateisystem und benutzt den
// Dienstschlüssel. Nie aus einer Client-Komponente importieren.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const HIER = dirname(fileURLToPath(import.meta.url));

/**
 * Zugangsdaten aus der lokalen Umgebungsdatei nachladen.
 *
 * Bereits gesetzte Werte gewinnen — wer eine Variable von Hand voranstellt,
 * meint das auch so.
 */
export function ladeUmgebung(): void {
  const pfad = resolve(HIER, "..", ".env.local");
  if (!existsSync(pfad)) return;
  for (const zeile of readFileSync(pfad, "utf8").split("\n")) {
    const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

/** Datenbankzugang mit dem Dienstschlüssel. Bricht ab, wenn er fehlt — ein
 *  Skript, das ohne Rechte weiterläuft, meldet später „nichts gefunden". */
export function datenbank(): SupabaseClient {
  ladeUmgebung();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Zugangsdaten fehlen (Adresse oder Dienstschlüssel)");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Eine ganze Tabelle lesen.
 *
 * ZWEI FALLEN, BEIDE GEMESSEN:
 *
 *  1. Eine einfache Abfrage liefert stumm höchstens 1.000 Zeilen. Kein Fehler,
 *     keine Warnung — nur ein zu kleines Ergebnis, aus dem später eine Kennzahl
 *     wird.
 *  2. Ohne feste Sortierung garantiert die Datenbank keine stabile
 *     Seitenfolge. Wer währenddessen selbst in die Tabelle schreibt — und genau
 *     das tun die Erhebungsläufe —, bekommt Zeilen doppelt oder gar nicht.
 *     Deshalb wird IMMER sortiert.
 */
export async function alleZeilen<T = Record<string, unknown>>(
  db: SupabaseClient,
  tabelle: string,
  spalten: string,
  sortierNach = "id",
): Promise<T[]> {
  const out: T[] = [];
  const SEITE = 1000;
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await db
      .from(tabelle)
      .select(spalten)
      .order(sortierNach, { ascending: true })
      .range(von, von + SEITE - 1);
    if (error) throw new Error(`${tabelle} lesen: ${error.message}`);
    const teil = (data ?? []) as T[];
    out.push(...teil);
    if (teil.length < SEITE) return out;
  }
}

/** Zeitstempel-Zeile fürs Protokoll. */
export function log(...teile: unknown[]): void {
  console.log(new Date().toISOString().slice(11, 19), ...teile);
}
