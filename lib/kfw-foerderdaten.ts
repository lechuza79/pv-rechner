import { supabase } from "./supabase-server";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";
import {
  ausZeilen,
  sichtbareAnzahl,
  HEIZUNGSFOERDERUNG,
  type HeizungsfoerderungBund,
  type HeizungsfoerderungKreis,
  type JahrgangZeile,
  type BundZeile,
} from "./kfw-format";

/**
 * Die Zahlen des KfW-Förderreports AUS DER DATENBANK holen.
 *
 * Getrennt von lib/kfw-format.ts, und zwar aus demselben Grund, aus dem
 * lib/stand.ts und lib/stand-format.ts getrennt sind: Dieses Modul zieht den
 * Datenbank-Client mit sich. Eine Komponente, die nur die Quellenzeile
 * formatieren will, importiert kfw-format und trägt den Client damit nicht ins
 * Browser-Bundle. Der Klima-Rechner hat auf diesem Weg einmal sieben
 * Config-Module mitgeschleppt, von denen er kein Wort brauchte.
 *
 * Die drei Grenzen dieser Quelle — keine Zelle unter zehn, kein Nenner in der
 * Fläche, kein Roh-Download — stehen in kfw-format.ts und in der Setup-Route.
 */

/** Neuester eingelesener Jahrgang. */
async function neuesterJahrgang(): Promise<JahrgangZeile | null> {
  if (!supabase) return null;
  const { data, error } = await withDbTimeout(
    supabase.from("kfw_report_jahrgang").select("jahr,stichtag").order("jahr", { ascending: false }).limit(1),
    "kfw jahrgang",
    DB_SOFT_READ_TIMEOUT_MS,
  );
  if (error || !data?.length) return null;
  return data[0] as JahrgangZeile;
}

/**
 * Die Bundeszahlen der privaten Heizungsförderung für den neuesten Jahrgang.
 *
 * Rückfall ist `null` — jede aufrufende Oberfläche blendet den Block dann aus.
 * Deshalb das kurze Zeitbudget: Nach acht Sekunden bekäme der Besucher genau
 * das, was er nach drei auch bekommt.
 */
export async function heizungsfoerderungBund(jahr?: number): Promise<HeizungsfoerderungBund | null> {
  if (!supabase) return null;
  try {
    const jg = jahr
      ? await (async () => {
          const { data } = await withDbTimeout(
            supabase!.from("kfw_report_jahrgang").select("jahr,stichtag").eq("jahr", jahr).limit(1),
            "kfw jahrgang",
            DB_SOFT_READ_TIMEOUT_MS,
          );
          return (data?.[0] as JahrgangZeile) ?? null;
        })()
      : await neuesterJahrgang();
    if (!jg) return null;

    const { data, error } = await withDbTimeout(
      supabase
        .from("kfw_report_bund")
        .select("programm,verwendungszweck,anzahl,volumen_mio")
        .eq("jahr", jg.jahr)
        .eq("programm", HEIZUNGSFOERDERUNG),
      "kfw bund",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error || !data?.length) return null;

    return ausZeilen(jg, data as BundZeile[]);
  } catch {
    return null;
  }
}

/**
 * Die Zusagen EINES Kreises.
 *
 * Bewusst nur einer: Eine Liste über viele Kreise ist die flächendeckende
 * Tabelle, die wir nicht ausweisen — und sie wäre der Baustein, aus dem sich
 * unterdrückte Zellen zurückrechnen lassen. Wer eine Karte oder eine Rangliste
 * daraus bauen will, muss diese Entscheidung neu treffen, nicht umgehen.
 */
export async function heizungsfoerderungKreis(
  regionId: string,
  jahr?: number,
): Promise<HeizungsfoerderungKreis | null> {
  if (!supabase || !/^\d{5}$/.test(regionId)) return null;
  try {
    const jg = jahr ? { jahr, stichtag: "" } : await neuesterJahrgang();
    if (!jg) return null;
    const { data, error } = await withDbTimeout(
      supabase
        .from("kfw_report_kreis")
        .select("anzahl")
        .eq("jahr", jg.jahr)
        .eq("programm", HEIZUNGSFOERDERUNG)
        .eq("region_id", regionId)
        .limit(1),
      "kfw kreis",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error || !data?.length) return null;
    return {
      jahr: jg.jahr,
      stichtagIso: jg.stichtag,
      regionId,
      zusagen: sichtbareAnzahl((data[0] as { anzahl: number | null }).anzahl),
    };
  } catch {
    return null;
  }
}
