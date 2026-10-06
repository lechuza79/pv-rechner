/**
 * Which stock holds which domain — read from the database for the rule in
 * lib/bestand-abgleich.ts.
 *
 * The sources are a list, not code per stock: a new stock is one more line.
 * A table that does not exist yet is skipped AND reported, so a missing stock
 * never looks like a stock without collisions.
 */
import { belegungAufbauen, type Belegung, type Belegungen, type Bestand, type Entscheidungen, type Herkunft } from "../../lib/bestand-abgleich";
import { websiteHerkunft } from "../../lib/windbetreiber";

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
  // Only confirmed media. The catalogue keeps every candidate it looked at,
  // 694 municipal sites among them, already judged "kein-medium" by itself —
  // counting those made 694 false collisions on the first measurement.
  {
    bestand: "presse", tabelle: "presse_medien", id: "domain", website: "domain", name: "saat_name",
    filter: (q) => q.eq("ist_medium", "medium"),
  },
  {
    bestand: "fachbetrieb", tabelle: "fachbetriebe", id: "domain", website: "domain", name: "firmenname",
    filter: (q) => q.eq("art", "betrieb"),
  },
  {
    bestand: "windbetreiber", tabelle: "windbetreiber", id: "mastr_nr", website: "website", name: "name",
    filter: (q) => q.not("website", "is", null),
    // One rule for how official a proven website is (lib/windbetreiber.ts).
    herkunft: (r) => websiteHerkunft(r.website_quelle as string | null, r.website_beleg as string | null),
  },
];

export type Ladebericht = { gelesen: Partial<Record<Bestand, number>>; fehlt: string[] };

/** Every stock except `ohne`, paginated and sorted (an unsorted page read skips rows). */
export async function ladeBelegungen(db: Db, ohne?: Bestand): Promise<{ belegungen: Belegungen; bericht: Ladebericht }> {
  const eintraege: (Belegung & { website: string | null })[] = [];
  const bericht: Ladebericht = { gelesen: {}, fehlt: [] };
  for (const q of QUELLEN) {
    if (q.bestand === ohne) continue;
    const spalten = [q.id, q.website, q.name, ...(q.bestand === "windbetreiber" ? ["website_quelle", "website_beleg"] : [])].filter(Boolean).join(",");
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

/** Decisions by a person on collisions the rules cannot settle. */
export const ENTSCHEIDUNGEN_SQL = `
  CREATE TABLE IF NOT EXISTS bestand_entscheidungen (
    domain text PRIMARY KEY,
    falsch text[] NOT NULL,
    notiz text NOT NULL CHECK (length(notiz) >= 10),
    entschieden_am date NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE bestand_entscheidungen ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON bestand_entscheidungen FROM anon, authenticated, PUBLIC;
  NOTIFY pgrst, 'reload schema';
`;

/** All decisions; an absent table means none were taken yet, not an error. */
export async function ladeEntscheidungen(db: Db): Promise<Entscheidungen> {
  const out: Entscheidungen = new Map();
  for (let von = 0; ; von += 1000) {
    const { data, error } = await db.from("bestand_entscheidungen").select("domain, falsch, notiz").order("domain").range(von, von + 999);
    if (error) {
      if (error.code === "42P01" || /does not exist|schema cache/i.test(error.message)) return out;
      throw new Error(`bestand_entscheidungen: ${error.message}`);
    }
    for (const r of (data ?? []) as { domain: string; falsch: Bestand[]; notiz: string }[]) out.set(r.domain, { falsch: r.falsch, notiz: r.notiz });
    if (!data || data.length < 1000) return out;
  }
}
