/**
 * One row per wind turbine from the register (mastr_wind_anlagen).
 *
 * The Atlas aggregates keep only count and capacity per Gemeinde and year.
 * Anything that needs the turbine itself — where exactly it stands, how high
 * the hub is, how large the rotor — was thrown away on import. That is what
 * a yield estimate needs: wind at 100 m over the town centre is a different
 * number from wind at 160 m over the ridge where the park stands.
 *
 * Its own table, never a column on the aggregates: the aggregates are read by
 * every Atlas page, and this is ~40,000 rows nothing public reads yet.
 *
 * RLS on without a policy — only the service key reaches it, like every
 * register table that is not yet shown anywhere.
 *
 * Shared by the setup route and the import script, so the DDL exists once.
 */
export const MASTR_WIND_TABELLE = "mastr_wind_anlagen";

export const MASTR_WIND_SQL = `
  CREATE TABLE IF NOT EXISTS mastr_wind_anlagen (
    mastr_nr text PRIMARY KEY,
    region_id text,
    status text NOT NULL,
    lage text,
    lat double precision,
    lon double precision,
    brutto_kw numeric(12,2),
    netto_kw numeric(12,2),
    nabenhoehe_m numeric(7,2),
    rotor_m numeric(7,2),
    hersteller text,
    typ text,
    windpark text,
    inbetriebnahme date,
    stilllegung date,
    buergerenergie boolean,
    abschaltung_nachts boolean,
    abschaltung_tierschutz boolean,
    eeg_nr text,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS mastr_wind_anlagen_region_idx ON mastr_wind_anlagen (region_id);
  -- Added after the first version; ADD COLUMN IF NOT EXISTS keeps reruns safe.
  ALTER TABLE mastr_wind_anlagen ADD COLUMN IF NOT EXISTS buergerenergie boolean;
  ALTER TABLE mastr_wind_anlagen ADD COLUMN IF NOT EXISTS abschaltung_nachts boolean;
  ALTER TABLE mastr_wind_anlagen ADD COLUMN IF NOT EXISTS abschaltung_tierschutz boolean;
  ALTER TABLE mastr_wind_anlagen ADD COLUMN IF NOT EXISTS eeg_nr text;
  ALTER TABLE mastr_wind_anlagen ADD COLUMN IF NOT EXISTS betreiber_nr text;
  CREATE INDEX IF NOT EXISTS mastr_wind_anlagen_betreiber_idx ON mastr_wind_anlagen (betreiber_nr);
  ALTER TABLE mastr_wind_anlagen ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON mastr_wind_anlagen FROM anon, authenticated, PUBLIC;
  -- Without this the API does not see a new table until its next restart.
  NOTIFY pgrst, 'reload schema';
`;
