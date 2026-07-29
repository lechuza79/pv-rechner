/**
 * Die Sicherheitsgrenze der Datenbank als Code.
 *
 * Warum es diese Datei gibt: `exec_sql` und die Zugriffsregeln auf
 * `calculations` lebten ausschliesslich in der laufenden Supabase-Datenbank.
 * Im Juli 2026 war `exec_sql` fuer jeden mit dem (oeffentlichen) Anon-Key
 * ausfuehrbar — beliebiges SQL auf der Produktivdatenbank. Der Fix wurde
 * damals direkt in der Datenbank gefahren und stand nirgends im Repo: ein
 * spaeteres CREATE OR REPLACE, eine Wiederherstellung aus einem Backup oder
 * ein neues Projekt haetten ihn kommentarlos zurueckgedreht, ohne dass
 * irgendetwas angeschlagen haette.
 *
 * Seitdem gilt hier dasselbe Muster wie bei den Atlas-Funktionen
 * (lib/mastr-region-sql.ts): EINE Quelle, aus der die Setup-Route liest.
 * Wer die Rechte aendern will, aendert sie hier — nicht im SQL-Editor.
 *
 * Eingespielt wird das ueber GET /api/security/setup (Bearer $CRON_SECRET).
 * Alles hier ist mehrfach ausfuehrbar.
 *
 * Festgenagelt von lib/__tests__/security-sql.test.ts.
 */

// ─── exec_sql ───────────────────────────────────────────────────────────────
//
// Fuehrt beliebiges SQL aus und ist damit der maechtigste Hebel in der
// Datenbank. Die einzige Sicherheitsgrenze ist das EXECUTE-Recht.
//
// SECURITY DEFINER ist notwendig, nicht bequem (am 29.07.2026 gemessen, nicht
// geschaetzt): Ein Aufruf laeuft als `service_role`, und die ist weder Owner
// der Tabellen noch darf sie im Schema `public` anlegen — gemessen kam
// "must be owner of table calculations" und `has_schema_privilege(...,
// 'CREATE') = false`. Die Setup-Routen machen aber genau das: CREATE TABLE,
// ALTER TABLE, CREATE POLICY, CREATE INDEX. Mit SECURITY INVOKER wuerden alle
// sieben Setup-Routen scheitern. Die Funktion laeuft deshalb als `postgres`.
//
// Der feste search_path ist der Unterschied zur Fassung, die bis zum
// 29.07.2026 in der Datenbank stand (die hatte gar keinen). Ohne ihn
// entscheidet die Sitzung des Aufrufers, in welchem Schema ein unqualifizierter
// Name landet — bei einer Funktion, die als `postgres` laeuft, ist das der
// klassische Weg, untergeschobene Objekte mit Superuser-Rechten auszufuehren.
// Die Liste bildet den bisherigen Ist-Pfad ab (`public`, `extensions`), damit
// bestehendes Setup-SQL unveraendert laeuft; `pg_temp` steht bewusst am ENDE,
// sonst koennte eine temporaere Tabelle einen echten Namen verdecken.
export const EXEC_SQL_DDL = `
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $exec_sql$
BEGIN
  EXECUTE sql;
END;
$exec_sql$;

-- Rechte ueber ALLE Signaturen, nicht nur ueber die oben definierte: Ein
-- zweiter Overload (etwa exec_sql(text, text)) wuerde die Absicherung sonst
-- lautlos umgehen — er traegt seine eigene, unangetastete Rechtevergabe.
DO $exec_sql_grants$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'exec_sql'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn.sig);

    -- anon und authenticated MUESSEN einzeln genannt werden. Supabase legt
    -- ueber ALTER DEFAULT PRIVILEGES direkte Grants an diese Rollen an, und
    -- ein REVOKE FROM PUBLIC erreicht die nicht. Am 29.07.2026 nachgestellt:
    -- Nach reinem "REVOKE ALL ... FROM PUBLIC" stand in der Rechteliste
    -- weiterhin "anon=X/postgres" — die Funktion waere oeffentlich geblieben.
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
$exec_sql_grants$;
`;

// ─── calculations ───────────────────────────────────────────────────────────
//
// Die gespeicherten Berechnungen der angemeldeten Nutzer. Die API filtert
// zwar ueberall selbst auf user_id (app/api/calculations/*), aber sie
// arbeitet mit dem Anon-Key plus Nutzer-Sitzung — und der Anon-Key steht im
// Browser-Bundle. Wer ihn nimmt und direkt gegen /rest/v1/calculations geht,
// laeuft an jedem Filter im Anwendungscode vorbei. Die Zeilenregeln unten sind
// die einzige Grenze, die dort noch greift.
//
// Bewusst NICHT hier: die Tabellendefinition selbst (29 Spalten, Fremdschluessel
// auf profiles). Diese Datei sichert den Zugriff ab; ein halbes, aus der
// laufenden Datenbank abgeschriebenes Schema waere eine Quelle, der man beim
// Neuaufbau glaubt, ohne dass sie stimmt.
//
// Die Namen sind exakt die der bestehenden Regeln — sonst legt ein erneuter
// Lauf einen zweiten Satz danebem an, statt den vorhandenen herzustellen.
export const CALCULATIONS_RLS_DDL = `
DO $calculations_rls$
BEGIN
  IF to_regclass('public.calculations') IS NULL THEN
    RAISE NOTICE 'Tabelle calculations existiert nicht — Zugriffsregeln uebersprungen.';
    RETURN;
  END IF;

  ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;

  -- DROP + CREATE statt "IF NOT EXISTS": Fuer Policies gibt es kein
  -- IF NOT EXISTS, und eine bestehende Regel mit gleichem Namen aber
  -- aufgeweichter Bedingung soll hier ueberschrieben werden, nicht bleiben.
  DROP POLICY IF EXISTS "Users read own calculations" ON public.calculations;
  CREATE POLICY "Users read own calculations" ON public.calculations
    FOR SELECT USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users insert own calculations" ON public.calculations;
  CREATE POLICY "Users insert own calculations" ON public.calculations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users update own calculations" ON public.calculations;
  CREATE POLICY "Users update own calculations" ON public.calculations
    FOR UPDATE USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users delete own calculations" ON public.calculations;
  CREATE POLICY "Users delete own calculations" ON public.calculations
    FOR DELETE USING (auth.uid() = user_id);
END
$calculations_rls$;
`;

// ─── Selbstauskunft ─────────────────────────────────────────────────────────
//
// exec_sql gibt nichts zurueck (RETURNS void, HTTP 204). Ohne eine zweite
// Funktion laesst sich also nicht pruefen, ob das Eingespielte auch
// angekommen ist — und eine Absicherung, die niemand nachlesen kann, ist
// genau die Sorte Sicherheitsnetz, die dieses Modul abschaffen soll.
//
// Bewusst eng geschnitten: Sie beantwortet feste Fragen und fuehrt kein
// uebergebenes SQL aus. Eine generische "exec_sql, aber mit Rueckgabe"-
// Funktion waere dieselbe Luecke ein zweites Mal.
export const SECURITY_POSTURE_DDL = `
CREATE OR REPLACE FUNCTION public.sc_security_posture()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog, pg_temp
AS $posture$
SELECT jsonb_build_object(
  'exec_sql', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'args', pg_get_function_identity_arguments(p.oid),
      'security_definer', p.prosecdef,
      'owner', pg_get_userbyid(p.proowner),
      'search_path', p.proconfig,
      'acl', p.proacl::text,
      'execute_anon', COALESCE(has_function_privilege('anon', p.oid, 'EXECUTE'), false),
      'execute_authenticated', COALESCE(has_function_privilege('authenticated', p.oid, 'EXECUTE'), false),
      'execute_service_role', COALESCE(has_function_privilege('service_role', p.oid, 'EXECUTE'), false),
      -- Ein leerer Eintrag ("=X/") in der Rechteliste ist das Recht fuer
      -- PUBLIC, also fuer jede Rolle. Es taucht in has_function_privilege
      -- fuer eine einzelne Rolle nicht als solches auf.
      'execute_public', p.proacl::text LIKE '%{=X/%' OR p.proacl::text LIKE '%,=X/%'
    ) ORDER BY pg_get_function_identity_arguments(p.oid)), '[]'::jsonb)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'exec_sql'
  ),
  'calculations', (
    SELECT jsonb_build_object(
      'exists', c.oid IS NOT NULL,
      'rls_enabled', c.relrowsecurity,
      'policies', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'name', pol.polname,
          'cmd', pol.polcmd,
          'using', pg_get_expr(pol.polqual, pol.polrelid),
          'with_check', pg_get_expr(pol.polwithcheck, pol.polrelid)
        ) ORDER BY pol.polname), '[]'::jsonb)
        FROM pg_policy pol WHERE pol.polrelid = c.oid
      )
    )
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'calculations'
  ),
  -- Tabellen ohne Zeilenschutz. Sollte leer sein: Der Anon-Key steht im
  -- Browser-Bundle, jede Tabelle ohne RLS ist damit oeffentlich lesbar.
  'tables_without_rls', (
    SELECT coalesce(jsonb_agg(c.relname ORDER BY c.relname), '[]'::jsonb)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  ),
  -- RLS an, aber keine einzige Regel: dicht, aber oft unbeabsichtigt.
  -- Fuer rein intern genutzte Tabellen (nur ueber den Service-Key) ist das
  -- die Absicht — siehe waechter_reports und kommunen_kontakt.
  'tables_rls_without_policy', (
    SELECT coalesce(jsonb_agg(c.relname ORDER BY c.relname), '[]'::jsonb)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_policy pol WHERE pol.polrelid = c.oid)
  )
);
$posture$;

DO $posture_grants$
BEGIN
  REVOKE ALL ON FUNCTION public.sc_security_posture() FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.sc_security_posture() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.sc_security_posture() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.sc_security_posture() TO service_role;
  END IF;
END
$posture_grants$;
`;

/** Alles zusammen, in dieser Reihenfolge einzuspielen. */
export const SECURITY_DDL = [
  EXEC_SQL_DDL,
  CALCULATIONS_RLS_DDL,
  SECURITY_POSTURE_DDL,
].join("\n");

// ─── Auswertung ─────────────────────────────────────────────────────────────

export type SecurityPosture = {
  exec_sql: Array<{
    args: string;
    security_definer: boolean;
    owner: string;
    search_path: string[] | null;
    acl: string | null;
    execute_anon: boolean;
    execute_authenticated: boolean;
    execute_service_role: boolean;
    execute_public: boolean;
  }>;
  calculations: {
    exists: boolean;
    rls_enabled: boolean;
    policies: Array<{ name: string; cmd: string; using: string | null; with_check: string | null }>;
  } | null;
  tables_without_rls: string[];
  tables_rls_without_policy: string[];
};

/**
 * Uebersetzt die Selbstauskunft in ein Urteil. Absichtlich hier und nicht in
 * der Route: So kann ein Test die Bewertung pruefen, ohne eine Datenbank zu
 * brauchen.
 */
export function auditPosture(p: SecurityPosture): { ok: boolean; problems: string[] } {
  const problems: string[] = [];

  if (!p.exec_sql?.length) {
    problems.push("exec_sql existiert nicht — die Setup-Routen koennen kein DDL mehr fahren.");
  }
  for (const fn of p.exec_sql ?? []) {
    const sig = `exec_sql(${fn.args})`;
    if (fn.execute_anon) problems.push(`${sig}: anon darf ausfuehren — beliebiges SQL mit dem oeffentlichen Anon-Key.`);
    if (fn.execute_authenticated) problems.push(`${sig}: authenticated darf ausfuehren.`);
    if (fn.execute_public) problems.push(`${sig}: PUBLIC darf ausfuehren.`);
    if (!fn.execute_service_role) problems.push(`${sig}: service_role darf NICHT ausfuehren — die Setup-Routen sind damit tot.`);
    if (fn.security_definer && !fn.search_path?.length) {
      problems.push(`${sig}: SECURITY DEFINER ohne festen search_path.`);
    }
  }

  const calc = p.calculations;
  if (calc?.exists) {
    if (!calc.rls_enabled) {
      problems.push("calculations: Zeilenschutz ist AUS — mit dem oeffentlichen Anon-Key sind alle gespeicherten Berechnungen lesbar.");
    }
    // Vier Zugriffsarten, jede braucht ihre eigene Regel. Fehlt SELECT, sieht
    // niemand mehr seine Berechnungen; fehlt INSERT, kann niemand speichern.
    for (const cmd of ["r", "a", "w", "d"] as const) {
      const label = { r: "Lesen", a: "Anlegen", w: "Aendern", d: "Loeschen" }[cmd];
      const pol = calc.policies?.filter(x => x.cmd === cmd) ?? [];
      if (!pol.length) {
        problems.push(`calculations: keine Regel fuers ${label}.`);
        continue;
      }
      // Eine Regel ohne auth.uid()-Bezug greift fuer jeden angemeldeten Nutzer
      // auf fremde Zeilen durch — genau der Fall, den RLS verhindern soll.
      const bound = pol.some(x => (x.using ?? x.with_check ?? "").includes("auth.uid()"));
      if (!bound) problems.push(`calculations: Regel fuers ${label} bindet nicht an auth.uid().`);
    }
  }

  for (const t of p.tables_without_rls ?? []) {
    problems.push(`Tabelle ${t}: kein Zeilenschutz — mit dem oeffentlichen Anon-Key lesbar.`);
  }

  return { ok: problems.length === 0, problems };
}
