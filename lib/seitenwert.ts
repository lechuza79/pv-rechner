/**
 * Der Wert einer fremden Seite: Rang, verweisende Domains, geschätzte Besucher.
 *
 * EINE Tabelle für alle Bestände. Fachbetriebe, Presse, Versorger und die
 * Seiten, die uns verlinken, überschneiden sich — dieselbe Domain zweimal zu
 * bewerten hieße, zwei Wahrheiten über eine Zahl zu führen und sie doppelt zu
 * bezahlen.
 *
 * Die Werte sind eine FREMDSCHÄTZUNG (DataForSEO), keine Messung: Der Rang ist
 * eine Skala von 0 bis 1000 über die Verlinkung, die Besucherzahl eine
 * Hochrechnung aus Suchpositionen. Deshalb trägt jede Zeile ihren Stichtag, und
 * die Oberflächen schreiben „geschätzt" an die Zahl.
 */

export type Seitenwert = {
  domain: string;
  /** 0–1000, Verlinkungsstärke der Domain. */
  rang: number | null;
  verweisende_domains: number | null;
  /** Geschätzte Besucher je Monat aus der Google-Suche in Deutschland. */
  besucher: number | null;
  keywords: number | null;
  /** Verlinkt diese Domain uns? Mit Fundstelle — sonst ist es eine Behauptung. */
  verlinkt_uns: boolean;
  verlinkt_url: string | null;
  gemessen_am: string;
};

export const SEITENWERT_DDL = `
CREATE TABLE IF NOT EXISTS domain_seitenwert (
  domain text PRIMARY KEY,
  rang integer,
  verweisende_domains integer,
  besucher integer,
  keywords integer,
  verlinkt_uns boolean NOT NULL DEFAULT false,
  verlinkt_url text,
  verlinkt_seit date,
  gemessen_am date NOT NULL DEFAULT current_date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE domain_seitenwert ADD COLUMN IF NOT EXISTS verlinkt_uns boolean NOT NULL DEFAULT false;
ALTER TABLE domain_seitenwert ADD COLUMN IF NOT EXISTS verlinkt_url text;
ALTER TABLE domain_seitenwert ADD COLUMN IF NOT EXISTS verlinkt_seit date;
CREATE INDEX IF NOT EXISTS idx_seitenwert_rang ON domain_seitenwert (rang DESC NULLS LAST);
ALTER TABLE domain_seitenwert ENABLE ROW LEVEL SECURITY;
`;

/** Ab wann ein Wert als alt gilt. Die Zahlen bewegen sich langsam. */
export const SEITENWERT_MAX_ALTER_TAGE = 180;

export function seitenwertVeraltet(gemessenAm: string | null | undefined, heute = new Date()): boolean {
  if (!gemessenAm) return true;
  const alter = (heute.getTime() - Date.parse(gemessenAm)) / 86_400_000;
  return !(alter >= 0) || alter > SEITENWERT_MAX_ALTER_TAGE;
}

/**
 * Wie groß ist die Seite? Grobe Stufen statt einer Zahl, weil die Schätzung
 * keine feinere Aussage trägt — und weil die Frage im Outreach lautet
 * "lohnt sich das", nicht "welcher Rang genau".
 */
export type Groesse = "gross" | "mittel" | "klein" | "winzig" | "unbekannt";

export function groesseVon(w: { rang: number | null; besucher: number | null } | null | undefined): Groesse {
  if (!w || w.rang == null) return "unbekannt";
  if ((w.besucher ?? 0) >= 50_000 || w.rang >= 450) return "gross";
  if ((w.besucher ?? 0) >= 5_000 || w.rang >= 300) return "mittel";
  if ((w.besucher ?? 0) >= 300 || w.rang >= 180) return "klein";
  return "winzig";
}

export const GROESSE_LABEL: Record<Groesse, string> = {
  gross: "groß",
  mittel: "mittel",
  klein: "klein",
  winzig: "winzig",
  unbekannt: "unbekannt",
};
