// Server-only read/write for the admin theming overlay (see lib/theme-overrides.ts).
//
// The read is wrapped in unstable_cache so the site layout can inject the
// overrides on every request without hitting the DB every time: one read per
// cache window, refreshed instantly on save via revalidateTag. Overrides change
// rarely (an admin nudging a shade), so this keeps the live DB untouched under
// normal traffic.

import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { supabase } from "./supabase-server";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";
import { sanitizeOverrides, type ThemeOverrides } from "./theme-overrides";

const CACHE_TAG = "theme-overrides";
const TABLE = "theme_overrides";

async function readOverrides(): Promise<ThemeOverrides> {
  if (!supabase) return {};
  try {
    // Notbremse: Dieser Read sitzt im Seitenrahmen, läuft also bei JEDEM
    // Seitenaufbau. Ohne Zeitbudget hängt bei einer kränkelnden Datenbank nicht
    // eine Seite, sondern die ganze Site — bis die Function nach 300 s stirbt.
    const { data, error } = await withDbTimeout(
      supabase.from(TABLE).select("overrides").eq("id", 1).maybeSingle(),
      "theme-overrides",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error || !data) return {};
    return sanitizeOverrides(data.overrides);
  } catch {
    return {};
  }
}

/**
 * Cached theming overrides for injection in the site layout. Safe fallback: {}
 * (no overrides) whenever the DB is unreachable or the table is missing, so a
 * theming hiccup never blocks page render.
 */
export const getSavedThemeOverrides = unstable_cache(readOverrides, ["theme-overrides"], {
  tags: [CACHE_TAG],
  // EINE WOCHE, NICHT FUENF MINUTEN — und das ist keine Feinjustierung, sondern
  // die Behebung eines Deckels ueber der ganzen Domain (26.08.2026).
  //
  // Dieser Read sitzt im Seitenrahmen (app/(site)/layout.tsx), laeuft also beim
  // Aufbau JEDER Seite. Next nimmt fuer eine Seite die KUERZESTE Haltbarkeit im
  // gesamten Renderbaum — mit 300 s hier verfiel damit jede Seite der Domain
  // alle fuenf Minuten, voellig unabhaengig von ihrer eigenen `revalidate`-
  // Angabe. Auf Produktion nachgemessen (260 Abrufe ueber 12 Minuten, alle vom
  // selben Auslieferungsknoten): Kein einziger Treffer war aelter als 273
  // Sekunden, danach kippte ausnahmslos alles gleichzeitig auf "abgelaufen" und
  // der Zaehler sprang zurueck. Die Atlas-Seiten mit sieben Tagen Haltbarkeit
  // liefen im selben Fuenf-Minuten-Takt wie alle anderen — ihre Umstellung war
  // dadurch wirkungslos.
  //
  // Das war der groesste Einzelposten der Auslieferungskosten: rund 200 Seiten
  // mal 288 Verfaelle am Tag, jeder Verfall ein kompletter Neuaufbau mit seinen
  // Datenbank-Abfragen und einem Cache-Schreibvorgang. Cache-Schreibvorgaenge
  // sind die teuerste Zeile der Rechnung und kosten das 19-fache des Aufrufs,
  // der sie ausloest.
  //
  // Die 300 s waren ausdruecklich nur als Sicherheitsnetz gedacht — die
  // Invalidierung laeuft ueber den Marker, den `saveThemeOverrides()` beim
  // Speichern zieht, und der wirkt sofort. Am Verhalten des Theme-Editors
  // aendert sich also nichts. Das Netz bleibt, es ist nur nicht mehr enger als
  // die Seiten, die es traegt.
  //
  // WAS SICH VERSCHLECHTERT, und es ist der Preis: Wer die Farbwerte direkt in
  // der Datenbank aendert statt ueber den Editor, sieht das Ergebnis erst nach
  // einer Woche. Ueber den Editor bleibt es sofort.
  //
  // WER DIESEN WERT WIEDER SENKT, senkt ihn fuer JEDE Seite der Domain mit.
  revalidate: 604800,
});

/** Upsert the single overrides row (admin-guarded caller) and refresh the cache. */
export async function saveThemeOverrides(
  overrides: ThemeOverrides,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Database not configured" };
  const clean = sanitizeOverrides(overrides);
  // Auch der Schreibweg bekommt ein Budget: Eine hängende Speicherung sähe im
  // Editor aus wie ein Klick, der nichts tut — mit Budget kommt eine
  // Fehlermeldung, und der Admin weiß, dass er es noch einmal versuchen muss.
  let error;
  try {
    ({ error } = await withDbTimeout(
      supabase
        .from(TABLE)
        .upsert({ id: 1, overrides: clean, updated_at: new Date().toISOString() }, { onConflict: "id" }),
      "theme-overrides (schreiben)",
    ));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Speichern fehlgeschlagen" };
  }
  if (error) return { ok: false, error: error.message };
  revalidateTag(CACHE_TAG);
  return { ok: true };
}
