import "server-only";
import { supabase } from "./supabase-server";
import { withDbTimeout, DB_SOFT_READ_TIMEOUT_MS } from "./db-timeout";

// Die beiden Zusatzquellen, die eine Ortsseite für ihre Geschichten braucht:
// der Zubau nach Monat und der Wohnungsbestand. Beide sind schmale, indizierte
// Lesevorgänge auf EINEN Ort — nicht der Vollabzug, den die bundesweiten
// Suchläufe machen.
//
// WEICHES ZEITBUDGET: Für beide gibt es einen vollwertigen Rückfall — ohne sie
// entfallen genau die Geschichten, die auf ihnen sitzen, die Seite bleibt
// vollständig. Länger zu warten wäre deshalb reine Verzögerung, dieselbe Regel
// wie bei Marktpreisen und Förderkatalog.

export type MonatsZubau = { monat: string; segment: string; count: number };

/** Zubau je Monat für EINEN Ort. Leer, wenn die Tabelle (noch) nichts hat. */
export async function monatsZubau(regionId: string): Promise<MonatsZubau[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await withDbTimeout(
      supabase
        .from("mastr_monat_gem")
        .select("monat, segment, count")
        .eq("region_id", regionId)
        .order("monat"),
      "orts-stories: mastr_monat_gem",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error || !data) return [];
    return data.map((r) => ({
      // Die Spalte ist ein Datum; für die Anzeige zählt der Monat.
      monat: String(r.monat).slice(0, 7),
      segment: r.segment as string,
      count: Number(r.count),
    }));
  } catch {
    return [];
  }
}

/**
 * Wohnungen nach Gebäudegröße für EINEN Ort.
 *
 * Zusammengefasst auf die eine Grenze, die die Geschichte braucht: Häuser mit
 * ein oder zwei Wohnungen gegen alles Größere. Die feinere Staffelung bleibt in
 * der Tabelle — hier steht die Frage, nicht der Datensatz.
 */
export async function wohnungsBestand(
  regionId: string,
): Promise<{ gesamt: number; einZwei: number } | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await withDbTimeout(
      supabase
        .from("zensus_wohnungen")
        .select("wohnungen, w_1, w_2")
        .eq("region_id", regionId)
        .maybeSingle(),
      "orts-stories: zensus_wohnungen",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error || !data) return null;
    const gesamt = Number(data.wohnungen ?? 0);
    const einZwei = Number(data.w_1 ?? 0) + Number(data.w_2 ?? 0);
    if (gesamt <= 0) return null;
    return { gesamt, einZwei };
  } catch {
    return null;
  }
}
