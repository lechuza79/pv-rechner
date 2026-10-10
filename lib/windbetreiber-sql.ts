/**
 * Tables of the wind operator stock. Shared by the script, so the DDL exists
 * once (same pattern as lib/mastr-wind-sql.ts).
 *
 * windbetreiber             one row per operating ORGANISATION from the register.
 *                           Natural persons are not stored: the public export
 *                           carries no name or contact for them, and their
 *                           register number alone is pseudonymous personal data
 *                           we have no use for. They are counted, not kept.
 * windbetreiber_kandidaten  every website we considered for an operator and
 *                           what its imprint said — the evidence behind
 *                           "website proven" and behind "nothing found".
 * windbetreiber_uebersicht  turbines and capacity per operator, READ from
 *                           mastr_wind_anlagen, never copied: the turbine table
 *                           is the one source for those numbers.
 *
 * RLS on without a policy: only the service key reaches it. The rows hold
 * business contacts and, for sole traders, a person's name.
 */
export const WINDBETREIBER_SQL = `
  CREATE TABLE IF NOT EXISTS windbetreiber (
    mastr_nr text PRIMARY KEY,
    name text NOT NULL,
    rechtsform text,
    strasse text,
    hausnummer text,
    plz text,
    ort text,
    bundesland text,
    register_webseite text,
    register_email text,
    register_telefon text,
    registergericht text,
    registernummer text,
    -- Whether the operator still runs a turbine in the latest export. Rows are
    -- never deleted: a proven website stays worth knowing.
    aktiv boolean NOT NULL DEFAULT true,
    register_stand date NOT NULL,
    website text,
    website_quelle text,
    website_beleg text,
    website_beleg_url text,
    website_textstelle text,
    website_geprueft_am date,
    -- Set when every candidate and the search have been tried. Without it an
    -- empty website means "not looked at", with it "looked, nothing proves itself".
    gesucht_am date,
    suche_notiz text,
    -- The contact on the proven website (shared contact search, imprint or
    -- press page). A mailbox that only stands in the register is kept in
    -- register_email but is not a checked contact: it has no page to re-read.
    kontakt_email text,
    kontakt_kanal text,
    kontakt_beleg_url text,
    kontakt_geprueft_am date,
    kontakt_freigabe_am date,
    kontakt_sperrgrund text,
    erfasst_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE windbetreiber ADD COLUMN IF NOT EXISTS kontakt_email text;
  ALTER TABLE windbetreiber ADD COLUMN IF NOT EXISTS kontakt_kanal text;
  ALTER TABLE windbetreiber ADD COLUMN IF NOT EXISTS kontakt_beleg_url text;
  ALTER TABLE windbetreiber ADD COLUMN IF NOT EXISTS kontakt_geprueft_am date;
  ALTER TABLE windbetreiber ADD COLUMN IF NOT EXISTS kontakt_freigabe_am date;
  ALTER TABLE windbetreiber ADD COLUMN IF NOT EXISTS kontakt_sperrgrund text;
  -- "von Hand geprüft: …" — a person searched the proven website and found no
  -- contact. Without it "no contact" and "not looked at" look the same.
  ALTER TABLE windbetreiber ADD COLUMN IF NOT EXISTS kontakt_hand_notiz text;
  CREATE INDEX IF NOT EXISTS windbetreiber_plz_idx ON windbetreiber (plz);
  CREATE INDEX IF NOT EXISTS windbetreiber_website_idx ON windbetreiber (website);

  CREATE TABLE IF NOT EXISTS windbetreiber_kandidaten (
    mastr_nr text NOT NULL REFERENCES windbetreiber(mastr_nr) ON DELETE CASCADE,
    domain text NOT NULL,
    quelle text NOT NULL,
    -- belegt · abgelehnt · konflikt · kein-impressum · nicht-erreichbar · ungeprueft
    ergebnis text NOT NULL DEFAULT 'ungeprueft',
    beleg text,
    textstelle text,
    impressum_url text,
    grund text,
    geprueft_am date,
    PRIMARY KEY (mastr_nr, domain)
  );
  CREATE INDEX IF NOT EXISTS windbetreiber_kandidaten_domain_idx ON windbetreiber_kandidaten (domain);

  CREATE OR REPLACE VIEW windbetreiber_uebersicht AS
    SELECT b.mastr_nr, b.name, b.plz, b.ort, b.website,
      count(*) FILTER (WHERE a.status = '35') AS windraeder_in_betrieb,
      count(*) FILTER (WHERE a.status = '31') AS windraeder_in_planung,
      round(coalesce(sum(a.brutto_kw) FILTER (WHERE a.status = '35'), 0) / 1000, 2) AS leistung_mw,
      array_agg(DISTINCT a.region_id) FILTER (WHERE a.status = '35' AND a.region_id IS NOT NULL) AS gemeinden,
      array_agg(DISTINCT a.windpark) FILTER (WHERE a.status = '35' AND a.windpark IS NOT NULL) AS windparks
    FROM windbetreiber b
    LEFT JOIN mastr_wind_anlagen a ON a.betreiber_nr = b.mastr_nr
    GROUP BY b.mastr_nr, b.name, b.plz, b.ort, b.website;

  ALTER TABLE windbetreiber ENABLE ROW LEVEL SECURITY;
  ALTER TABLE windbetreiber_kandidaten ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON windbetreiber, windbetreiber_kandidaten, windbetreiber_uebersicht FROM anon, authenticated, PUBLIC;
  NOTIFY pgrst, 'reload schema';
`;
