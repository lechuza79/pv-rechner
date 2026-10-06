/**
 * Which stock holds which domain — read from the database for the rule in
 * lib/bestand-abgleich.ts.
 *
 * The sources are a list, not code per stock: a new stock is one more line.
 * A table that does not exist yet is skipped AND reported, so a missing stock
 * never looks like a stock without collisions.
 */
import { belegungAufbauen, type Belegung, type Belegungen, type Bestand, type Herkunft } from "../../lib/bestand-abgleich";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

type Quelle = {
  bestand: Bestand;
  tabelle: string;
  /** Column holding the identifier used in reports. */
  id: string;
  /** Column holding the website or domain. */
  website: string;
  name?: string;
  /** Only rows that really are an entry of this stock. */
  filter?: (q: Db) => Db;
  /** Where the domain came from, when it differs from the stock's default. */
  herkunft?: (row: Record<string, unknown>) => Herkunft | undefined;
};

export const QUELLEN: Quelle[] = [
  // Official websites from Wikidata (P856), Gemeinden and Kreise alike.
  { bestand: "gemeinde", tabelle: "kommunen_kontakt", id: "region_id", website: "website" },
  // Websites from the register's own Webseite field.
  { bestand: "versorger", tabelle: "utilities", id: "id", website: "website", name: "name" },
  { bestand: "presse", tabelle: "presse_medien", id: "domain", website: "domain", name: "saat_name" },
  {
    bestand: "fachbetrieb", tabelle: "fachbetriebe", id: "domain", website: "domain", name: "firmenname",
    filter: (q) => q.eq("art", "betrieb"),
  },
  {
    bestand: "windbetreiber", tabelle: "windbetreiber", id: "mastr_nr", website: "website", name: "name",
    filter: (q) => q.not("website", "is", null),
    herkunft: (r) => (r.website_quelle === "register" ? "amtlich" : r.website_quelle ? "suche" : undefined),
  },
];

export type Ladebericht = { gelesen: Partial<Record<Bestand, number>>; fehlt: string[] };

/** Every stock except `ohne`, paginated and sorted (an unsorted page read skips rows). */
export async function ladeBelegungen(db: Db, ohne?: Bestand): Promise<{ belegungen: Belegungen; bericht: Ladebericht }> {
  const eintraege: (Belegung & { website: string | null })[] = [];
  const bericht: Ladebericht = { gelesen: {}, fehlt: [] };
  for (const q of QUELLEN) {
    if (q.bestand === ohne) continue;
    const spalten = [q.id, q.website, q.name, q.bestand === "windbetreiber" ? "website_quelle" : null].filter(Boolean).join(",");
    let n = 0;
    for (let von = 0; ; von += 1000) {
      let abfrage = db.from(q.tabelle).select(spalten).order(q.id).range(von, von + 999);
      if (q.filter) abfrage = q.filter(abfrage);
      const { data, error } = await abfrage;
      if (error) {
        // 42P01 = relation does not exist. Anything else is a real failure.
        if (error.code === "42P01" || /does not exist|schema cache/i.test(error.message)) {
          bericht.fehlt.push(q.tabelle);
          break;
        }
        throw new Error(`${q.tabelle}: ${error.message}`);
      }
      for (const r of (data ?? []) as Record<string, unknown>[]) {
        eintraege.push({
          bestand: q.bestand,
          id: String(r[q.id]),
          name: q.name ? ((r[q.name] as string | null) ?? null) : null,
          website: (r[q.website] as string | null) ?? null,
          herkunft: q.herkunft?.(r),
        });
        n++;
      }
      if (!data || data.length < 1000) break;
    }
    if (!bericht.fehlt.includes(q.tabelle)) bericht.gelesen[q.bestand] = n;
  }
  return { belegungen: belegungAufbauen(eintraege), bericht };
}
