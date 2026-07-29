/**
 * Die vier Datenbank-Funktionen, die JEDE Atlas-Seite anfasst — an einer Stelle.
 *
 * WARUM DIESE DATEI EXISTIERT
 * ---------------------------
 * Diese Definitionen lagen doppelt im Repo: einmal in der Setup-Route und einmal
 * in einem Einmal-Fix-Skript. Beim Rollup-Umbau (23.07.2026) wurde nur die eine
 * Kopie schneller gemacht — ein späterer Setup-Lauf hätte die langsame Fassung
 * kommentarlos zurückgeschrieben. Genau davor warnt der Kommentar dort bis heute.
 * Eine zweite handgetippte Kopie ist ein Fehler, kein Duplikat: Setup-Route und
 * Apply-Skript importieren jetzt beide von hier.
 *
 * DER PRÄFIX MUSS IM ABFRAGETEXT STEHEN — BLOCKER
 * -----------------------------------------------
 * Die Atlas-Hierarchie hängt am AGS-Präfix (2 = Land, 5 = Kreis, 8 = Gemeinde),
 * und `mastr_aggregates_gem` hat dafür einen Index. Der greift aber NUR, wenn der
 * Planer den Präfix beim Planen kennt. Supabase reicht die Argumente eines
 * Funktionsaufrufs als JSON-Nutzlast über einen LATERAL-Join herein — der Präfix
 * ist damit ein zur Planungszeit unbekannter Wert, und `region_id LIKE p_prefix ||
 * '%'` fällt auf einen vollständigen Durchlauf über alle 591.024 Zeilen zurück.
 *
 * Gemessen am 28.07.2026 (Nordkirchen, sonst identische Abfrage):
 *   Präfix als Parameter (alt):  590–650 ms   ← jede Gemeindeseite, zweimal
 *   Präfix als Literal (neu):     67–80 ms   ← reine Netzlaufzeit, DB-Arbeit ~0
 *
 * Der irreführende Teil: `EXPLAIN ANALYZE` mit einem Literal meldet 0,8 ms und
 * zeigt einen sauberen Index-Scan — die Bremse ist im Plan gar nicht zu sehen,
 * weil das Literal genau den Fall herstellt, der in Produktion nie eintritt.
 * Belegt hat es erst `pg_stat_statements` (373 ms mittlere Ausführungszeit für
 * den echten, von Supabase umschlossenen Aufruf). WER HIER MISST, MUSS DEN
 * ECHTEN AUFRUFWEG MESSEN, nicht die Abfrage von Hand nachbauen.
 *
 * Deshalb bauen die Zweige, die auf die große Tabelle gehen, ihre Bedingung mit
 * `format(%L)` in den Abfragetext. Zwei Auswege wurden gemessen und verworfen:
 * Bereichsgrenzen statt LIKE (`region_id >= … AND <= …`) waren LANGSAMER, und ein
 * zusätzlicher Index bringt nichts — der vorhandene wird ja nur nicht benutzt.
 *
 * WAS SICH NICHT ÄNDERT
 * ---------------------
 * Die Zahlen. Alle vier Funktionen liefern Zeile für Zeile dasselbe wie zuvor
 * (geprüft über alle vier Ebenen und Stichproben quer durch die Republik,
 * scripts/atlas-verify.ts). Ebenso erhalten bleiben:
 *   - der schnelle Weg über den vorberechneten `mastr_region_rollup`
 *     (Bund/Land/Kreis = Punkt-Lookup),
 *   - die Selbstheilung: fehlt der Rollup-Schlüssel, wird live aggregiert statt
 *     leer geliefert — ein halber Rollup kann eine Seite nie brechen,
 *   - SECURITY INVOKER + die Rechtevergabe.
 *
 * Neu ist eine Eingangsprüfung: der Präfix darf nur Ziffern enthalten. Das ist
 * die Gegenprobe zum Einbau ins Abfragetext (zusätzlich zu `%L`) und macht den
 * Vertrag der Funktion sichtbar — ein AGS ist immer eine Ziffernfolge.
 */

/** Ziffernprüfung + erlaubte Präfixlängen, wortgleich in allen vier Funktionen. */
const GUARD = `
  IF p_prefix IS NULL OR p_prefix !~ '^[0-9]*$' THEN
    RAISE EXCEPTION 'prefix must be digits only, got %', p_prefix USING ERRCODE = '22023';
  END IF;`;

/** `AND a.region_id LIKE '<prefix>%'` als Text — leer beim Bundes-Schnitt. */
const PREFIX_CLAUSE = `
    CASE WHEN p_prefix = '' THEN ''
         ELSE format('AND a.region_id LIKE %L', p_prefix || '%')
    END`;

export const MASTR_REGION_FUNCTIONS_SQL = `
-- ─── Eine Region, volle Reihe (Segment x Jahr), summiert über alles darunter ──
-- Begrenzt durch Konstruktion: Träger x Segment x Jahr, nie durch die Zahl der
-- Regionen — also gleich sicher auf Gemeinde-, Kreis-, Land- und Bundesebene.
CREATE OR REPLACE FUNCTION mastr_region_series(
  p_prefix text,
  p_traeger text[]
)
RETURNS TABLE (energietraeger text, segment text, year int, count bigint, kwp numeric, kwh numeric)
LANGUAGE plpgsql
STABLE
AS $fn$
BEGIN${GUARD}

  -- Schneller Weg: Bund/Land/Kreis stehen vorberechnet im Rollup (Punkt-Lookup
  -- auf den Primärschlüssel).
  IF EXISTS (SELECT 1 FROM mastr_region_rollup r WHERE r.region_key = p_prefix) THEN
    RETURN QUERY
      SELECT r.energietraeger, r.segment, r.year, r.count, r.kwp, r.kwh
      FROM mastr_region_rollup r
      WHERE r.region_key = p_prefix
        AND r.energietraeger = ANY(p_traeger);
    RETURN;
  END IF;

  -- Gemeinde-Ebene (und Selbstheilung, falls der Rollup leer ist): live über die
  -- Rohtabelle. Der Präfix steht als Literal im Abfragetext — siehe Kopf.
  RETURN QUERY EXECUTE format($q$
    SELECT a.energietraeger, a.segment, a.year,
           sum(a.count)::bigint, sum(a.kwp), sum(a.kwh)
    FROM mastr_aggregates_gem a
    WHERE a.energietraeger = ANY($1::text[]) %s
    GROUP BY 1, 2, 3
  $q$,${PREFIX_CLAUSE}
  ) USING p_traeger;
END
$fn$;

-- ─── Kinder einer Region, auf die verlangte AGS-Länge gruppiert ───────────────
-- Bedient die Choropleth-Karte (16 Länder / ~400 Kreise) und die Ranglisten
-- (~55 Gemeinden je Kreis). p_year_max schneidet die Historie an einem Jahr ab:
-- mit der Vorjahreszahl entsteht die Rangliste von damals, gegen die das
-- Rang-Delta auf der Gemeindeseite vergleicht.
DROP FUNCTION IF EXISTS mastr_children(text, int, text[], int);
CREATE OR REPLACE FUNCTION mastr_children(
  p_prefix text,
  p_child_len int,
  p_traeger text[],
  p_year_recent int DEFAULT NULL,
  p_year_max int DEFAULT NULL
)
RETURNS TABLE (region_id text, segment text, count bigint, kwp numeric, count_recent bigint)
LANGUAGE plpgsql
STABLE
AS $fn$
BEGIN${GUARD}
  IF p_child_len NOT IN (2, 5, 8) THEN
    RAISE EXCEPTION 'child_len must be 2, 5 or 8, got %', p_child_len USING ERRCODE = '22023';
  END IF;

  -- Land (2) / Kreis (5) aus dem Rollup — sofern er für diese Ebene befüllt ist.
  IF p_child_len IN (2, 5) AND EXISTS (
       SELECT 1 FROM mastr_region_rollup r2
       WHERE length(r2.region_key) = p_child_len
         AND (p_prefix = '' OR r2.region_key LIKE p_prefix || '%')
     ) THEN
    RETURN QUERY
      SELECT r.region_key, r.segment,
             sum(r.count)::bigint, sum(r.kwp),
             sum(CASE WHEN p_year_recent IS NOT NULL AND r.year = p_year_recent
                      THEN r.count ELSE 0 END)::bigint
      FROM mastr_region_rollup r
      WHERE length(r.region_key) = p_child_len
        AND (p_prefix = '' OR r.region_key LIKE p_prefix || '%')
        AND r.energietraeger = ANY(p_traeger)
        AND (p_year_max IS NULL OR r.year <= p_year_max)
      GROUP BY 1, 2;
    RETURN;
  END IF;

  -- Gemeinde-Kinder (Länge 8) und Selbstheilung.
  RETURN QUERY EXECUTE format($q$
    SELECT left(a.region_id, %s) AS region_id, a.segment,
           sum(a.count)::bigint, sum(a.kwp),
           sum(CASE WHEN $2::int IS NOT NULL AND a.year = $2::int THEN a.count ELSE 0 END)::bigint
    FROM mastr_aggregates_gem a
    WHERE a.energietraeger = ANY($1::text[])
      AND ($3::int IS NULL OR a.year <= $3::int) %s
    GROUP BY 1, 2
  $q$, p_child_len,${PREFIX_CLAUSE}
  ) USING p_traeger, p_year_recent, p_year_max;
END
$fn$;

-- ─── Kinder einer Region, Korn Segment x Jahr ────────────────────────────────
-- Speist die Ranglisten-Tabelle, die Eigentümer-Filter und Zubau-Jahr im Browser
-- umschaltet — das Korn einmal ausliefern schlägt einen Roundtrip je Klick.
CREATE OR REPLACE FUNCTION mastr_children_by_year(
  p_prefix text,
  p_child_len int,
  p_traeger text[],
  p_year_min int DEFAULT NULL
)
RETURNS TABLE (region_id text, segment text, year int, count bigint, kwp numeric, kwh numeric)
LANGUAGE plpgsql
STABLE
AS $fn$
BEGIN${GUARD}
  IF p_child_len NOT IN (2, 5, 8) THEN
    RAISE EXCEPTION 'child_len must be 2, 5 or 8, got %', p_child_len USING ERRCODE = '22023';
  END IF;

  IF p_child_len IN (2, 5) AND EXISTS (
       SELECT 1 FROM mastr_region_rollup r2
       WHERE length(r2.region_key) = p_child_len
         AND (p_prefix = '' OR r2.region_key LIKE p_prefix || '%')
     ) THEN
    RETURN QUERY
      SELECT r.region_key, r.segment, r.year,
             sum(r.count)::bigint, sum(r.kwp), sum(r.kwh)
      FROM mastr_region_rollup r
      WHERE length(r.region_key) = p_child_len
        AND (p_prefix = '' OR r.region_key LIKE p_prefix || '%')
        AND r.energietraeger = ANY(p_traeger)
        AND (p_year_min IS NULL OR r.year >= p_year_min)
      GROUP BY 1, 2, 3;
    RETURN;
  END IF;

  RETURN QUERY EXECUTE format($q$
    SELECT left(a.region_id, %s) AS region_id, a.segment, a.year,
           sum(a.count)::bigint, sum(a.kwp), sum(a.kwh)
    FROM mastr_aggregates_gem a
    WHERE a.energietraeger = ANY($1::text[])
      AND ($2::int IS NULL OR a.year >= $2::int) %s
    GROUP BY 1, 2, 3
  $q$, p_child_len,${PREFIX_CLAUSE}
  ) USING p_traeger, p_year_min;
END
$fn$;

-- ─── Rangliste der Gemeinden nach Solarleistung je Einwohner ─────────────────
-- p_prefix grenzt ein: '' = bundesweit, '09' = Bayern, '09679' = ein Kreis.
-- Die Einwohnerzahl hier zu verbinden macht es überhaupt möglich — 10.943
-- Gemeinden in Node zu sortieren hieße, die ganze Tabelle über die Leitung zu
-- ziehen. p_min_pop/p_max_pop begrenzen auf eine Größenklasse: ohne sie führt
-- ein 26-Einwohner-Koog, dessen einzelnes Scheunendach durch 26 geteilt wird,
-- jede Tabelle an — das misst den Nenner, nicht die Leistung.
DROP FUNCTION IF EXISTS mastr_top_gemeinden(text, boolean, int, int, int);
CREATE OR REPLACE FUNCTION mastr_top_gemeinden(
  p_prefix text,
  p_owner text,
  p_limit int,
  p_min_pop int DEFAULT 0,
  p_max_pop int DEFAULT NULL
)
RETURNS TABLE (
  region_id text, name text, slug text, parent_region_id text,
  population int, kwp numeric, w_per_capita numeric, rang bigint
)
LANGUAGE plpgsql
STABLE
AS $fn$
BEGIN${GUARD}
  IF p_owner NOT IN ('alle', 'privat', 'gewerbe') THEN
    RAISE EXCEPTION 'owner must be alle, privat or gewerbe, got %', p_owner USING ERRCODE = '22023';
  END IF;

  RETURN QUERY EXECUTE format($q$
    WITH agg AS (
      SELECT a.region_id, sum(a.kwp) AS kwp
      FROM mastr_aggregates_gem a
      WHERE a.energietraeger = 'solar'
        AND (
          $1::text = 'alle'
          OR ($1::text = 'privat' AND a.segment IN ('privat_dach', 'steckersolar'))
          OR ($1::text = 'gewerbe' AND a.segment IN ('gewerbe_dach', 'freiflaeche'))
        ) %s
      GROUP BY 1
    ),
    ranked AS (
      SELECT r.region_id, r.name, r.slug, r.parent_region_id, r.population, agg.kwp,
             round(agg.kwp * 1000 / r.population) AS w_per_capita,
             rank() OVER (ORDER BY agg.kwp / r.population DESC) AS rang
      FROM agg
      JOIN mastr_regions r ON r.region_id = agg.region_id
      -- Unbewohnte Gebiete (Küstengewässer, gemeindefreie Wälder) würden durch
      -- null teilen und mit einem Solarpark darauf jede Tabelle für immer anführen.
      WHERE r.level = 'gemeinde' AND r.population > 0 AND r.slug IS NOT NULL
        AND r.population >= $2::int
        AND ($3::int IS NULL OR r.population <= $3::int)
    )
    SELECT * FROM ranked ORDER BY rang LIMIT $4::int
  $q$,${PREFIX_CLAUSE}
  ) USING p_owner, p_min_pop, p_max_pop, p_limit;
END
$fn$;

-- Rechte: SECURITY INVOKER (Standard) ist Absicht — die Funktionen laufen mit
-- den Rechten des Aufrufers, die RLS-Leseregel bleibt die Sicherheitsgrenze.
REVOKE ALL ON FUNCTION mastr_region_series(text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION mastr_children(text, int, text[], int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION mastr_children_by_year(text, int, text[], int) FROM PUBLIC;
REVOKE ALL ON FUNCTION mastr_top_gemeinden(text, text, int, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mastr_region_series(text, text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION mastr_children(text, int, text[], int, int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION mastr_children_by_year(text, int, text[], int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION mastr_top_gemeinden(text, text, int, int, int) TO anon, authenticated, service_role;
`;
