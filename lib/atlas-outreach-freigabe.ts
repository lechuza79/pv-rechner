import "server-only";
import { unstable_cache } from "next/cache";
import { withDbTimeout, DB_SOFT_READ_TIMEOUT_MS } from "./db-timeout";

/**
 * Welche Gemeinden haben uns nach dem Outreach öffentlich verlinkt?
 *
 * WOZU: Am 28.08.2026 veröffentlichte die Stadt Heringen (Werra) eine eigene
 * Meldung und verwies darin auf unsere Gemeindeseite — der erste redaktionelle
 * Verweis, den dieses Projekt je bekommen hat. Die Seite stand dabei auf
 * „noindex, nofollow": Die Empfehlung lief ins Leere, und aufgefallen ist das
 * nur zufällig bei einer Wettbewerbsanalyse.
 *
 * WARUM DAS HIER AUTOMATISCH GEHT UND SONST NICHT: Der Releaseplan verlangt für
 * jede Freigabe eine Entscheidung mit Nachweis, weil dort geschätzt wird — hat
 * dieser Ort Nachfrage, kollidiert er mit einer anderen Seitenfamilie. Hier wird
 * nichts geschätzt. Der Auslöser ist eine TATSACHE: Eine Verwaltung hat
 * öffentlich auf die Seite verwiesen, nachgewiesen über die Verweis-Erhebung
 * (`npm run kommunen:veroeffentlicht`, Status „veroeffentlicht"). Eine Seite zu
 * sperren, auf die von außen verwiesen wird, ist der einzige Zustand, der sich
 * nicht begründen lässt — dafür braucht es keine wöchentliche Sitzung.
 *
 * WAS DAS NICHT IST: eine Freigabe der Gemeinde-EBENE. Freigegeben wird der
 * einzelne Ort, der verlinkt wurde. Alle übrigen bleiben gesperrt.
 *
 * FEHLERRICHTUNG: Fällt die Datenbank aus, liefert diese Funktion eine leere
 * Menge — die Seiten bleiben dann gesperrt. Das ist die harmlose Richtung: Im
 * schlimmsten Fall verpufft eine Empfehlung für die Dauer der Störung, statt
 * dass unbeabsichtigt Seiten in den Index geraten.
 */
async function verlinkendeGemeindenUncached(): Promise<string[]> {
  try {
    const { supabase } = await import("./supabase-server");
    if (!supabase) return [];
    // Weiches Zeitbudget: Es gibt einen vollwertigen Rückfall (die Seite bleibt
    // gesperrt), also wäre längeres Warten reine Verzögerung — dieselbe Regel
    // wie bei Marktpreisen und Förderkatalog.
    const { data, error } = await withDbTimeout(
      supabase
        .from("kommunen_kontakt")
        .select("region_id")
        .eq("outreach_status", "veroeffentlicht")
        .limit(1000),
      "verlinkendeGemeinden",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error) return [];
    return ((data ?? []) as { region_id: string }[])
      .map((z) => z.region_id)
      .filter((id) => typeof id === "string" && id.length === 8);
  } catch {
    return [];
  }
}

/**
 * Gecacht, weil jede Gemeindeseite beim Aufbau danach fragt.
 *
 * Eine Stunde Haltbarkeit: Der Status ändert sich höchstens täglich (er kommt
 * aus einem Lauf, nicht aus einer Nutzerinteraktion), und eine Empfehlung, die
 * eine Stunde später wirkt, verliert nichts. Ohne diesen Deckel wäre es ein
 * zusätzlicher Datenbank-Zugriff je Seitenaufbau — bei 11.000 Seiten die Sorte
 * Kosten, vor der die Kostenwache warnt.
 */
export const verlinkendeGemeinden = unstable_cache(verlinkendeGemeindenUncached, ["atlas-outreach-verlinker-v1"], {
  revalidate: 3600,
  tags: ["atlas-outreach-verlinker"],
});
