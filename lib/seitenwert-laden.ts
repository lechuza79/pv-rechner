/**
 * Seitenwerte zu einer Seite Zeilen nachladen — EIN Aufruf, nie einer je Zeile.
 *
 * Die Werte liegen in einer eigenen Tabelle (lib/seitenwert.ts), weil dieselbe
 * Domain in Fachbetrieben, Presse, Versorgern und den Verweisen auf uns
 * vorkommt. Wer sie je Zeile abfragt, macht die Ansicht mit ihrer Länge teurer
 * — genau der Fehler, der die Sitemap im September gesprengt hat.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { groesseVon, type Groesse } from "./seitenwert";

export type SeitenwertZeile = {
  rang: number | null;
  verweisende_domains: number | null;
  besucher: number | null;
  keywords: number | null;
  gemessen_am: string | null;
  groesse: Groesse;
  /** Verlinkt uns diese Domain — mit der Fundstelle. */
  verlinkt_uns: boolean;
  verlinkt_url: string | null;
};

/** Domains normalisieren wie bei der Erhebung: ohne Protokoll, ohne "www.". */
export function seitenwertDomain(wert: string | null | undefined): string | null {
  if (!wert) return null;
  const roh = wert.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(roh) ? roh : null;
}

export async function seitenwerteFuer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any, any, any>,
  domains: (string | null | undefined)[],
): Promise<Map<string, SeitenwertZeile>> {
  const liste = [...new Set(domains.map(seitenwertDomain).filter((d): d is string => !!d))];
  const out = new Map<string, SeitenwertZeile>();
  if (!liste.length) return out;
  const { data, error } = await db
    .from("domain_seitenwert")
    .select("domain, rang, verweisende_domains, besucher, keywords, gemessen_am, verlinkt_uns, verlinkt_url")
    .in("domain", liste);
  // Ein Ausfall darf die Liste nicht kosten: ohne Werte fehlt eine Spalte,
  // ohne Liste fehlt die Arbeit.
  if (error) return out;
  for (const z of data ?? []) {
    out.set(z.domain, {
      rang: z.rang, verweisende_domains: z.verweisende_domains, besucher: z.besucher,
      keywords: z.keywords, gemessen_am: z.gemessen_am,
      groesse: groesseVon({ rang: z.rang, besucher: z.besucher }),
      verlinkt_uns: !!z.verlinkt_uns, verlinkt_url: z.verlinkt_url ?? null,
    });
  }
  return out;
}
