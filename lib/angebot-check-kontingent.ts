// ─── Global daily cap for the offer check ─────────────────────────────────────
//
// The offer check sends uploaded files to a paid reading service. The per-IP
// limit in the route lives in the memory of ONE function instance and is gone
// after a cold start; with several instances and rotating addresses it caps
// nothing. The only shared place that sees every call is the database, so the
// cap lives there: one row per German calendar day, incremented atomically
// and only while it is below the cap.
//
// Fail closed: if the counter cannot be reached, the route does NOT call the
// model. An unreachable counter is indistinguishable from an exhausted one,
// and the expensive direction is the one to avoid.
//
// This module is pure (SQL text, limit parsing, verdict) so tests need no
// database. The database call lives in lib/angebot-check-kontingent-db.ts.
// The SQL is installed by GET /api/angebot-check/setup (Bearer $CRON_SECRET).

export const ANGEBOT_CHECK_LIMIT_ENV = "ANGEBOT_CHECK_TAGESLIMIT";

/** Conservative default: fifty checks a day across all users. */
export const ANGEBOT_CHECK_LIMIT_DEFAULT = 50;

export const ANGEBOT_CHECK_NUTZUNG_TABELLE = "angebot_check_nutzung";
export const ANGEBOT_CHECK_ZAEHLEN_RPC = "angebot_check_zaehlen";

/**
 * The daily cap from the environment. A non-negative integer is taken as is
 * ("0" closes the check for everyone); anything else — empty, a word, a
 * fraction, a negative number — falls back to the default instead of to
 * "unlimited". A typo must never open the budget.
 */
export function angebotCheckTageslimit(env: Record<string, string | undefined> = process.env): number {
  const roh = (env[ANGEBOT_CHECK_LIMIT_ENV] ?? "").trim();
  if (!/^\d+$/.test(roh)) return ANGEBOT_CHECK_LIMIT_DEFAULT;
  const n = Number(roh);
  return Number.isSafeInteger(n) ? n : ANGEBOT_CHECK_LIMIT_DEFAULT;
}

export type KontingentUrteil = "frei" | "erschoepft" | "unerreichbar";

/**
 * Asks the counter and turns every outcome into a verdict. Anything that is
 * not an explicit `true` from the database counts against the call: an error,
 * a timeout, `null`, a string. The route only proceeds on "frei".
 */
export async function kontingentPruefen(
  zaehlen: (tag: string, limit: number) => Promise<unknown>,
  tag: string,
  limit: number,
): Promise<KontingentUrteil> {
  let antwort: unknown;
  try {
    antwort = await zaehlen(tag, limit);
  } catch {
    return "unerreichbar";
  }
  if (antwort === true) return "frei";
  if (antwort === false) return "erschoepft";
  return "unerreichbar";
}

// ─── SQL ─────────────────────────────────────────────────────────────────────
//
// Table: one row per day, RLS on and NO policy — only the service key reaches
// it. Grants to anon/authenticated are revoked explicitly, because Supabase's
// default privileges hand them table rights that RLS alone would still gate,
// but there is no reason to leave them standing.
//
// Function: the increment and the comparison are ONE statement. The upsert's
// DO UPDATE ... WHERE takes the row lock, so two parallel calls on the last
// free slot cannot both pass — the second sees the updated count and gets no
// row back. A read-then-write in the application would let both through.
//
// SECURITY DEFINER with a fixed search_path, execute revoked from PUBLIC, anon
// and authenticated individually over ALL signatures — the rules from
// lib/security-sql.ts (exec_sql), for the same reasons documented there.
export const ANGEBOT_CHECK_NUTZUNG_DDL = `
CREATE TABLE IF NOT EXISTS public.${ANGEBOT_CHECK_NUTZUNG_TABELLE} (
  -- German calendar day (heuteInBerlin), passed in by the route.
  tag date PRIMARY KEY,
  anzahl integer NOT NULL DEFAULT 0 CHECK (anzahl >= 0),
  aktualisiert_am timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.${ANGEBOT_CHECK_NUTZUNG_TABELLE} ENABLE ROW LEVEL SECURITY;

DO $angebot_nutzung_grants$
BEGIN
  REVOKE ALL ON TABLE public.${ANGEBOT_CHECK_NUTZUNG_TABELLE} FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.${ANGEBOT_CHECK_NUTZUNG_TABELLE} FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.${ANGEBOT_CHECK_NUTZUNG_TABELLE} FROM authenticated;
  END IF;
END
$angebot_nutzung_grants$;

CREATE OR REPLACE FUNCTION public.${ANGEBOT_CHECK_ZAEHLEN_RPC}(p_tag date, p_limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $angebot_zaehlen$
DECLARE
  neu integer;
BEGIN
  IF p_tag IS NULL OR p_limit IS NULL OR p_limit < 1 THEN
    RETURN false;
  END IF;

  INSERT INTO public.${ANGEBOT_CHECK_NUTZUNG_TABELLE} AS t (tag, anzahl, aktualisiert_am)
  VALUES (p_tag, 1, now())
  ON CONFLICT (tag) DO UPDATE
    SET anzahl = t.anzahl + 1, aktualisiert_am = now()
    WHERE t.anzahl < p_limit
  RETURNING anzahl INTO neu;

  -- No row back = the WHERE rejected the update = cap reached.
  RETURN neu IS NOT NULL;
END;
$angebot_zaehlen$;

DO $angebot_zaehlen_grants$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = '${ANGEBOT_CHECK_ZAEHLEN_RPC}'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn.sig);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn.sig);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn.sig);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    END IF;
  END LOOP;
END
$angebot_zaehlen_grants$;
`;
