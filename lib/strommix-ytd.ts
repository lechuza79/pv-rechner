/**
 * Server-seitige Jahres-Aggregation (YTD) des deutschen Strommix aus der
 * voraggregierten Wochentabelle `energy_weekly`. Für das Kernenergie-Anteil-
 * Widget: Verbrauchsmix inkl. importiertem Atomstrom.
 *
 * WICHTIG (Methodik, damit die Kennzahl ehrlich bleibt):
 * - Deutschland erzeugt seit April 2023 selbst keine Kernenergie mehr
 *   (Spalte `nuclear` = 0). Der Kernenergie-Anteil im laufenden Jahr besteht
 *   daher ausschließlich aus RECHNERISCH importiertem Atomstrom
 *   (`nuclear_import`, aus Grenzflüssen × Kernanteil der Nachbarn).
 * - Der Pie zeigt den Verbrauchsmix "erzeugt in DE + importierter Atomstrom".
 *
 * Kategorien + Farben kommen aus der Chart-Konventions-SSOT (`chart-utils`):
 * dieselben 4 Kategorien wie das Strommix-Widget (Erneuerbare/Fossile/
 * Sonstige/Kernenergie). Farben als Hex — im Embed-Layout sind die
 * `--color-energy-*` CSS-Variablen NICHT definiert.
 */

import { supabase } from "./supabase-server";
import {
  RENEWABLE_KEYS,
  FOSSIL_KEYS,
  SONSTIGE_KEYS,
  NUCLEAR_KEYS,
  CATEGORY_COLORS,
} from "./chart-utils";

export interface StrommixSegment {
  key: string;
  label: string;
  /** Hex-Farbe (Energie-Palette, nicht theme-bar). */
  color: string;
  gwh: number;
  /** Anteil am Gesamt in Prozent. */
  share: number;
}

export interface StrommixYtd {
  year: number;
  weeks: number;
  segments: StrommixSegment[];
  totalGwh: number;
  nuclearGwh: number;
  /** Kernenergie-Anteil am Mix (inkl. Import) in Prozent. */
  nuclearShare: number;
}

type WeeklyRow = Record<string, number | string | null>;

const sumCols = (rows: WeeklyRow[], cols: string[]): number =>
  rows.reduce(
    (acc, r) => acc + cols.reduce((a, c) => a + (Number(r[c]) || 0), 0),
    0,
  );

/**
 * Liest das laufende Jahr aus `energy_weekly` (Land DE) und aggregiert zum
 * Verbrauchsmix inkl. Atomstrom-Import. Gibt `null` zurück, wenn keine Daten
 * vorliegen (Supabase nicht konfiguriert oder Jahr noch leer).
 */
export async function getStrommixYtd(now: Date): Promise<StrommixYtd | null> {
  if (!supabase) return null;
  const year = now.getUTCFullYear();

  const { data, error } = await supabase
    .from("energy_weekly")
    .select("*")
    .eq("country", "de")
    .eq("year", year);

  if (error || !data || data.length === 0) return null;
  const rows = data as WeeklyRow[];

  // Heimische Kernenergie (seit April 2023 = 0) + rechnerischer Import.
  const kernenergie = sumCols(rows, NUCLEAR_KEYS) + sumCols(rows, ["nuclear_import"]);

  const raw = [
    { key: "renewable", label: "Erneuerbare", color: CATEGORY_COLORS.renewable, gwh: sumCols(rows, RENEWABLE_KEYS) },
    { key: "fossil", label: "Fossile", color: CATEGORY_COLORS.fossil, gwh: sumCols(rows, FOSSIL_KEYS) },
    { key: "other", label: "Sonstige", color: CATEGORY_COLORS.other, gwh: sumCols(rows, SONSTIGE_KEYS) },
    { key: "nuclear", label: "Kernenergie (importiert)", color: CATEGORY_COLORS.nuclearImport, gwh: kernenergie },
  ].filter((s) => s.gwh > 0);

  const totalGwh = raw.reduce((a, s) => a + s.gwh, 0);
  if (totalGwh <= 0) return null;

  const segments: StrommixSegment[] = raw.map((s) => ({
    ...s,
    share: (s.gwh / totalGwh) * 100,
  }));

  return {
    year,
    weeks: rows.length,
    segments,
    totalGwh,
    nuclearGwh: kernenergie,
    nuclearShare: (kernenergie / totalGwh) * 100,
  };
}
