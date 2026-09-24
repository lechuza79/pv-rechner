/**
 * Table of the precomputed ten-year retrospective — one definition, used by
 * the setup route and by the preparation run (which may create it before the
 * route is deployed). RLS on without policy: only the service key reaches it.
 */
export const SOLAR_RUECKBLICK_SQL = `
  CREATE TABLE IF NOT EXISTS solar_rueckblick (
    plz text PRIMARY KEY CHECK (plz ~ '^[0-9]{5}$'),
    vorteil_ohne_wp numeric NOT NULL,
    vorteil_mit_wp numeric NOT NULL,
    jahre jsonb NOT NULL,
    annahmen jsonb NOT NULL,
    wetterquelle text NOT NULL,
    berechnet_am timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE solar_rueckblick ENABLE ROW LEVEL SECURITY;
  NOTIFY pgrst, 'reload schema';
`;
