import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

// One-time setup route to create MaStR data lake tables.
// Trigger: send Authorization: Bearer $CRON_SECRET header.
// Safe to re-run (uses IF NOT EXISTS).

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Nur Bearer-Header akzeptieren — kein ?key=-Query-Param (landet sonst in
  // Server-/Proxy-Logs). Analog zu energy/setup, funding/setup, prices/scrape.
  const authHeader = req.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const results: { step: string; status: string; error?: string }[] = [];

  // 1. mastr_regions — hierarchy of DE / Bundesland / Landkreis / Gemeinde
  //    region_id uses AGS (Amtlicher Gemeindeschlüssel), nested by design:
  //      'de'         → Germany
  //      '01'..'16'   → Bundesland (2-digit prefix)
  //      '01001'..    → Kreis (5-digit prefix)
  //      '01001000'.. → Gemeinde (8-digit, the atomic grain)
  //    Every level above Gemeinde is derivable by prefix — see mastr_aggregates.
  const { error: e1 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS mastr_regions (
        region_id text PRIMARY KEY,
        level text NOT NULL CHECK (level IN ('de', 'bundesland', 'landkreis')),
        parent_region_id text REFERENCES mastr_regions(region_id),
        name text NOT NULL,
        centroid_lat numeric,
        centroid_lon numeric,
        population int,
        area_km2 numeric,
        updated_at timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_mr_parent ON mastr_regions (parent_region_id);
      CREATE INDEX IF NOT EXISTS idx_mr_level ON mastr_regions (level);
    `,
  });
  results.push({ step: "mastr_regions", status: e1 ? "error" : "ok", error: e1?.message });

  // 1b. Migration to Gemeinde granularity (Solar-Atlas).
  //     CREATE TABLE IF NOT EXISTS above is a no-op on an existing table, so the
  //     new level, columns and indexes are added explicitly and idempotently.
  //
  //     'level' is the structural position in the hierarchy; 'bezeichnung' is the
  //     official designation from the Destatis Gemeindeverzeichnis. They are not
  //     the same thing: a kreisfreie Stadt sits at level 'landkreis' but is called
  //     "Kreisfreie Stadt", and BNetzA cannot tell the two Würzburgs apart at all.
  //     'slug' is the URL segment, derived from name + bezeichnung.
  const { error: e1b } = await supabase.rpc("exec_sql", {
    sql: `
      ALTER TABLE mastr_regions DROP CONSTRAINT IF EXISTS mastr_regions_level_check;
      ALTER TABLE mastr_regions ADD CONSTRAINT mastr_regions_level_check
        CHECK (level IN ('de', 'bundesland', 'landkreis', 'gemeinde'));
      ALTER TABLE mastr_regions ADD COLUMN IF NOT EXISTS slug text;
      ALTER TABLE mastr_regions ADD COLUMN IF NOT EXISTS bezeichnung text;
      ALTER TABLE mastr_regions ADD COLUMN IF NOT EXISTS population_as_of date;
      -- Slugs must be unique among siblings; that is what makes
      -- /solar-atlas/bayern/landkreis-wuerzburg/hoechberg resolvable.
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mr_parent_slug
        ON mastr_regions (parent_region_id, slug) WHERE slug IS NOT NULL;
    `,
  });
  results.push({ step: "mastr_regions_gemeinde_migration", status: e1b ? "error" : "ok", error: e1b?.message });

  // 2. mastr_aggregates — pre-aggregated per region × energy type × segment × year
  //    segment:
  //      for solar: 'privat_dach' | 'gewerbe_dach' | 'freiflaeche'
  //      for wind/biomasse/wasser/speicher: 'n/a'
  //    year = Inbetriebnahme-Jahr (actual installation year)
  const { error: e2 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS mastr_aggregates (
        region_id text NOT NULL REFERENCES mastr_regions(region_id),
        energietraeger text NOT NULL CHECK (energietraeger IN ('solar', 'wind', 'biomasse', 'wasser', 'speicher')),
        segment text NOT NULL DEFAULT 'n/a',
        year int NOT NULL,
        count int NOT NULL DEFAULT 0,
        kwp numeric NOT NULL DEFAULT 0,
        updated_at timestamptz DEFAULT now(),
        PRIMARY KEY (region_id, energietraeger, segment, year)
      );
      CREATE INDEX IF NOT EXISTS idx_ma_region_et ON mastr_aggregates (region_id, energietraeger);
      CREATE INDEX IF NOT EXISTS idx_ma_et_year ON mastr_aggregates (energietraeger, year);
    `,
  });
  results.push({ step: "mastr_aggregates", status: e2 ? "error" : "ok", error: e2?.message });

  // 2b. mastr_aggregates_gem — same shape as mastr_aggregates, but Gemeinde grain
  //     (8-digit AGS) instead of Kreis (5-digit).
  //
  //     Deliberately a second table, not a migration of the first. There is one
  //     database behind both dev and production, and the live code addresses
  //     Kreise by 5-digit key — writing 8-digit rows into mastr_aggregates would
  //     blank the numbers on 117 city pages the moment the upload starts, and keep
  //     them blank until a deploy caught up. Both tables coexist until the new
  //     code is merged.
  //
  //     CLEANUP after merge: mastr_aggregates has no readers left — drop it, and
  //     drop this comment with it.
  const { error: e2gem } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS mastr_aggregates_gem (
        region_id text NOT NULL REFERENCES mastr_regions(region_id),
        energietraeger text NOT NULL CHECK (energietraeger IN ('solar', 'wind', 'biomasse', 'wasser', 'speicher')),
        segment text NOT NULL DEFAULT 'n/a',
        year int NOT NULL,
        count int NOT NULL DEFAULT 0,
        kwp numeric NOT NULL DEFAULT 0,
        updated_at timestamptz DEFAULT now(),
        PRIMARY KEY (region_id, energietraeger, segment, year)
      );
      -- Usable storage capacity (kWh). Only storage rows carry it: Bruttoleistung
      -- says how fast a battery charges, kwh says how much it holds — and that is
      -- the number anyone actually asks about.
      ALTER TABLE mastr_aggregates_gem ADD COLUMN IF NOT EXISTS kwh numeric NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_mag_region_et ON mastr_aggregates_gem (region_id, energietraeger);
      -- Prefix matching drives every rollup; without pattern_ops a btree cannot
      -- serve LIKE 'x%' under a non-C collation.
      CREATE INDEX IF NOT EXISTS idx_mag_region_prefix
        ON mastr_aggregates_gem (region_id text_pattern_ops);

      -- Vorberechneter Rollup je Region-Ebene (region_key: '' = DE, 2 = Land,
      -- 5 = Kreis, 8 = Gemeinde). Ersetzt die Live-Aggregation in region_series.
      -- Wird nach jedem Datenlauf via mastr_refresh_region_rollup() neu befüllt.
      CREATE TABLE IF NOT EXISTS mastr_region_rollup (
        region_key text NOT NULL,
        energietraeger text NOT NULL,
        segment text NOT NULL,
        year int NOT NULL,
        count bigint NOT NULL DEFAULT 0,
        kwp numeric NOT NULL DEFAULT 0,
        kwh numeric NOT NULL DEFAULT 0,
        PRIMARY KEY (region_key, energietraeger, segment, year)
      );

      ALTER TABLE mastr_aggregates_gem ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mastr_region_rollup ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_aggregates_gem_anon_read') THEN
          CREATE POLICY mastr_aggregates_gem_anon_read ON mastr_aggregates_gem FOR SELECT TO anon USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_aggregates_gem_service_write') THEN
          CREATE POLICY mastr_aggregates_gem_service_write ON mastr_aggregates_gem FOR ALL TO service_role USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_region_rollup_anon_read') THEN
          CREATE POLICY mastr_region_rollup_anon_read ON mastr_region_rollup FOR SELECT TO anon USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_region_rollup_service_write') THEN
          CREATE POLICY mastr_region_rollup_service_write ON mastr_region_rollup FOR ALL TO service_role USING (true);
        END IF;
      END $$;

      -- Rollup NUR für die teuren Ebenen: Kreis (5) / Land (2) / Bund ('').
      -- Gemeinde bleibt draußen — ein 8-stelliger Prefix trifft in region_series
      -- per PK schon genau eine Zeile, da braucht es keinen Rollup. Alle Keys sind
      -- 8-stellig, daher summieren die drei Ebenen disjunkt (kein Doppelzählen).
      -- Statement-Timeout hier bewusst aufheben (läuft nur beim Datenlauf).
      CREATE OR REPLACE FUNCTION mastr_refresh_region_rollup()
      RETURNS void LANGUAGE plpgsql AS $fn$
      BEGIN
        SET LOCAL statement_timeout = 0;
        TRUNCATE mastr_region_rollup;
        INSERT INTO mastr_region_rollup (region_key, energietraeger, segment, year, count, kwp, kwh)
        SELECT left(region_id,5), energietraeger, segment, year, sum(count)::bigint, sum(kwp), sum(kwh)
          FROM mastr_aggregates_gem GROUP BY 1,2,3,4
        UNION ALL
        SELECT left(region_id,2), energietraeger, segment, year, sum(count)::bigint, sum(kwp), sum(kwh)
          FROM mastr_aggregates_gem GROUP BY 1,2,3,4
        UNION ALL
        SELECT '', energietraeger, segment, year, sum(count)::bigint, sum(kwp), sum(kwh)
          FROM mastr_aggregates_gem GROUP BY energietraeger, segment, year;
      END;
      $fn$;
      REVOKE ALL ON FUNCTION mastr_refresh_region_rollup() FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION mastr_refresh_region_rollup() TO service_role;
    `,
  });
  results.push({ step: "mastr_aggregates_gem", status: e2gem ? "error" : "ok", error: e2gem?.message });

  // 2c. Rollup functions over the Gemeinde-grain table.
  //
  //     With Gemeinde granularity the table grows ~10x (562k rows). Reading it
  //     into Node and aggregating there (the old path) would mean ~560 paginated
  //     requests per page view, and any single query risks silently truncating at
  //     PostgREST's 1000-row cap. Both problems disappear if the database does the
  //     grouping: every call below returns at most a few hundred rows.
  //
  //     The AGS is nested by design (2 = Bundesland, 5 = Kreis, 8 = Gemeinde), so
  //     a prefix match is all a rollup needs. Gemeinde is the only stored grain —
  //     nothing is double counted.
  //
  //     SECURITY INVOKER (the default) is deliberate: these run with the caller's
  //     rights, so the existing RLS read policy stays the security boundary. EXECUTE
  //     is revoked from PUBLIC and granted explicitly.
  const { error: e2b } = await supabase.rpc("exec_sql", {
    sql: `
      -- Children of a region, grouped at the requested AGS length.
      -- Serves the choropleth (16 Bundesländer / ~400 Kreise) and the Solar-Atlas
      -- ranking tables (~55 Gemeinden per Kreis).
      -- p_year_max cuts the history off at a year: passing last year's number
      -- yields the ranking as it stood back then, which is what the rank delta on
      -- a Gemeinde page compares against.
      -- Land (2) / Kreis (5): aus dem vorberechneten mastr_region_rollup lesen
      -- (region_key hat genau diese Länge = left(region_id, p_child_len)) statt
      -- live über 562k Gemeinde-Zeilen zu aggregieren — das war der Kaltstart-
      -- Killer unter Parallel-Last (>8s → Timeout). Gemeinde-Kinder (len 8, ~55
      -- pro Kreis) bleiben Live-Scan. Selbstheilend wie mastr_region_series: fehlt
      -- der Rollup für diese Ebene/Prefix, fällt der 2. Zweig auf Live zurück
      -- (bei vorhandenem Rollup ist sein NOT EXISTS falsch → kein Doppelzählen).
      CREATE OR REPLACE FUNCTION mastr_children(
        p_prefix text,
        p_child_len int,
        p_traeger text[],
        p_year_recent int DEFAULT NULL,
        p_year_max int DEFAULT NULL
      )
      RETURNS TABLE (region_id text, segment text, count bigint, kwp numeric, count_recent bigint)
      LANGUAGE sql
      STABLE
      AS $fn$
        SELECT r.region_key AS region_id, r.segment,
               sum(r.count)::bigint, sum(r.kwp),
               sum(CASE WHEN p_year_recent IS NOT NULL AND r.year = p_year_recent THEN r.count ELSE 0 END)::bigint
        FROM mastr_region_rollup r
        WHERE p_child_len IN (2, 5)
          AND length(r.region_key) = p_child_len
          AND (p_prefix = '' OR r.region_key LIKE p_prefix || '%')
          AND r.energietraeger = ANY(p_traeger)
          AND (p_year_max IS NULL OR r.year <= p_year_max)
        GROUP BY 1, 2
        UNION ALL
        SELECT left(a.region_id, p_child_len) AS region_id, a.segment,
               sum(a.count)::bigint, sum(a.kwp),
               sum(CASE WHEN p_year_recent IS NOT NULL AND a.year = p_year_recent THEN a.count ELSE 0 END)::bigint
        FROM mastr_aggregates_gem a
        WHERE (
                p_child_len NOT IN (2, 5)
                OR NOT EXISTS (
                  SELECT 1 FROM mastr_region_rollup r2
                  WHERE length(r2.region_key) = p_child_len
                    AND (p_prefix = '' OR r2.region_key LIKE p_prefix || '%')
                )
              )
          AND a.energietraeger = ANY(p_traeger)
          AND (p_prefix = '' OR a.region_id LIKE p_prefix || '%')
          AND (p_year_max IS NULL OR a.year <= p_year_max)
        GROUP BY 1, 2
      $fn$;

      -- One region's full series (segment x year), summed over everything below it.
      -- Bounded by construction: energietraeger x segment x year, never by region
      -- count — so it is safe at Gemeinde, Kreis, Bundesland and DE alike.
      -- Selbstheilend: liest zuerst den vorberechneten Rollup (Kreis/Land/Bund,
      -- Punkt-Lookup per PK region_key) — das war der Kaltstart-Killer, weil DE/Land
      -- vorher alle 591k Zeilen live neu aggregierten. Fehlt der Schlüssel im Rollup
      -- (Gemeinde-Ebene, oder Rollup noch nicht befüllt), fällt sie auf den
      -- Live-Scan zurück. Ein leerer/halber Rollup kann die Seite so nie brechen.
      -- Gemeinde-Prefix (8-stellig) trifft per PK genau eine Zeile → ohnehin schnell.
      DROP FUNCTION IF EXISTS mastr_region_series(text, text[]);
      CREATE OR REPLACE FUNCTION mastr_region_series(
        p_prefix text,
        p_traeger text[]
      )
      RETURNS TABLE (energietraeger text, segment text, year int, count bigint, kwp numeric, kwh numeric)
      LANGUAGE sql
      STABLE
      AS $fn$
        SELECT energietraeger, segment, year, count, kwp, kwh
        FROM mastr_region_rollup
        WHERE region_key = p_prefix AND energietraeger = ANY(p_traeger)
        UNION ALL
        SELECT a.energietraeger, a.segment, a.year, sum(a.count)::bigint, sum(a.kwp), sum(a.kwh)
        FROM mastr_aggregates_gem a
        WHERE a.energietraeger = ANY(p_traeger)
          AND (p_prefix = '' OR a.region_id LIKE p_prefix || '%')
          AND NOT EXISTS (SELECT 1 FROM mastr_region_rollup WHERE region_key = p_prefix)
        GROUP BY 1, 2, 3
      $fn$;

      -- Children of a region, kept at segment x year granularity.
      -- Feeds the ranking table, which filters (privat/gewerbe) and picks a Zubau
      -- year client-side — shipping the grain once beats a round trip per filter.
      -- Bounded: children x segment x years, a few thousand rows at most.
      -- Rollup für Land/Kreis wie bei mastr_children (inkl. Selbstheilung).
      CREATE OR REPLACE FUNCTION mastr_children_by_year(
        p_prefix text,
        p_child_len int,
        p_traeger text[],
        p_year_min int DEFAULT NULL
      )
      RETURNS TABLE (region_id text, segment text, year int, count bigint, kwp numeric, kwh numeric)
      LANGUAGE sql
      STABLE
      AS $fn$
        SELECT r.region_key AS region_id, r.segment, r.year,
               sum(r.count)::bigint, sum(r.kwp), sum(r.kwh)
        FROM mastr_region_rollup r
        WHERE p_child_len IN (2, 5)
          AND length(r.region_key) = p_child_len
          AND (p_prefix = '' OR r.region_key LIKE p_prefix || '%')
          AND r.energietraeger = ANY(p_traeger)
          AND (p_year_min IS NULL OR r.year >= p_year_min)
        GROUP BY 1, 2, 3
        UNION ALL
        SELECT left(a.region_id, p_child_len) AS region_id, a.segment, a.year,
               sum(a.count)::bigint, sum(a.kwp), sum(a.kwh)
        FROM mastr_aggregates_gem a
        WHERE (
                p_child_len NOT IN (2, 5)
                OR NOT EXISTS (
                  SELECT 1 FROM mastr_region_rollup r2
                  WHERE length(r2.region_key) = p_child_len
                    AND (p_prefix = '' OR r2.region_key LIKE p_prefix || '%')
                )
              )
          AND a.energietraeger = ANY(p_traeger)
          AND (p_prefix = '' OR a.region_id LIKE p_prefix || '%')
          AND (p_year_min IS NULL OR a.year >= p_year_min)
        GROUP BY 1, 2, 3
      $fn$;

      REVOKE ALL ON FUNCTION mastr_children_by_year(text, int, text[], int) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION mastr_children_by_year(text, int, text[], int) TO anon, authenticated, service_role;

      -- Leaderboard of Gemeinden by solar per inhabitant, ranked in the database.
      -- p_prefix scopes it: '' = nationwide, '09' = Bayern, '09679' = one Kreis.
      -- Joining population here is what makes it possible at all — ranking 10.943
      -- Gemeinden in Node would mean pulling the whole table across the wire.
      -- p_min_pop / p_max_pop restrict the field to a size class. Without them the
      -- national top is meaningless as a benchmark: it is a 26-inhabitant Koog
      -- whose single barn roof, divided by 26, beats every real town by 50x. That
      -- measures the denominator, not the effort.
      -- p_owner: 'alle' | 'privat' | 'gewerbe' — the same split the ranking table
      -- uses, so a peer row and a table row mean the same thing.
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
      LANGUAGE sql
      STABLE
      AS $fn$
        WITH agg AS (
          SELECT a.region_id, sum(a.kwp) AS kwp
          FROM mastr_aggregates_gem a
          WHERE a.energietraeger = 'solar'
            AND (p_prefix = '' OR a.region_id LIKE p_prefix || '%')
            AND (
              p_owner = 'alle'
              OR (p_owner = 'privat' AND a.segment IN ('privat_dach', 'steckersolar'))
              OR (p_owner = 'gewerbe' AND a.segment IN ('gewerbe_dach', 'freiflaeche'))
            )
          GROUP BY 1
        ),
        ranked AS (
          SELECT r.region_id, r.name, r.slug, r.parent_region_id, r.population, agg.kwp,
                 round(agg.kwp * 1000 / r.population) AS w_per_capita,
                 rank() OVER (ORDER BY agg.kwp / r.population DESC) AS rang
          FROM agg
          JOIN mastr_regions r ON r.region_id = agg.region_id
          -- Uninhabited areas (coastal waters, gemeindefreie Wälder) would divide
          -- by zero and, with a solar park on them, top every table forever.
          WHERE r.level = 'gemeinde' AND r.population > 0 AND r.slug IS NOT NULL
            AND r.population >= p_min_pop
            AND (p_max_pop IS NULL OR r.population <= p_max_pop)
        )
        SELECT * FROM ranked ORDER BY rang LIMIT p_limit
      $fn$;

      DROP FUNCTION IF EXISTS mastr_top_gemeinden(text, boolean, int, int, int);
      REVOKE ALL ON FUNCTION mastr_top_gemeinden(text, text, int, int, int) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION mastr_top_gemeinden(text, text, int, int, int) TO anon, authenticated, service_role;

      DROP FUNCTION IF EXISTS mastr_children(text, int, text[], int);
      REVOKE ALL ON FUNCTION mastr_children(text, int, text[], int, int) FROM PUBLIC;
      REVOKE ALL ON FUNCTION mastr_region_series(text, text[]) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION mastr_children(text, int, text[], int, int) TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION mastr_region_series(text, text[]) TO anon, authenticated, service_role;
    `,
  });
  results.push({ step: "mastr_rollup_functions", status: e2b ? "error" : "ok", error: e2b?.message });

  // 2d. Größenklassen-Vergleich: Solarleistung je Gemeinde als eigene Tabelle.
  //
  //     Die Gemeinde-Seite vergleicht gegen Gemeinden ähnlicher Größe (halbe bis
  //     doppelte Einwohnerzahl) — wer dort pro Kopf führt UND auf welchem Platz
  //     die eigene Gemeinde steht. Beides braucht dieselbe Grundgesamtheit:
  //     Solar-kWp je Gemeinde, aufgeteilt nach Eigentümer-Filter.
  //
  //     Diese Summe live zu bilden hieß: bei JEDEM Seitenaufruf ein GROUP BY über
  //     alle ~562k Zeilen von mastr_aggregates_gem (~5 s). Der Cache darüber half
  //     kaum, weil die Größenklasse an der Einwohnerzahl der jeweiligen Gemeinde
  //     hängt — der Cache-Schlüssel ist damit praktisch je Gemeinde verschieden.
  //     Genau diese Sorte Abfrage hat die DB am 2026-07-21 lahmgelegt.
  //
  //     Vorberechnet sind es ~11k Zeilen (eine je bewohnter Gemeinde). Ein Scan
  //     darüber ist Millisekunden statt Sekunden, und Anführer wie eigener Platz
  //     fallen aus demselben Scan ab. Befüllt wird nach jedem Datenlauf, analog
  //     zu mastr_region_rollup.
  const { error: e2d } = await supabase.rpc("exec_sql", {
    sql: `
      -- kwp_dach = alles AUSSER Freifläche. Der Größenklassen-Vergleich rankt nach
      -- dieser Spalte, nicht nach kwp_alle: sonst führt fast jede Klasse eine
      -- Gemeinde mit einem einzigen Freiflächen-Solarpark an (Neukieritzsch:
      -- 61.633 Wp/Kopf gegen einen Klassen-Median von ~1.600), was den Maßstab
      -- zerstört. Dachleistung ist das, was eine Gemeinde selbst beeinflusst —
      -- dieselbe Grenze zieht bereits die Speicherdichte (fmtSpeicherJeKwp).
      CREATE TABLE IF NOT EXISTS mastr_gemeinde_solar (
        region_id text PRIMARY KEY,
        population int NOT NULL,
        kwp_alle numeric NOT NULL DEFAULT 0,
        kwp_dach numeric NOT NULL DEFAULT 0
      );
      -- Jede Abfrage grenzt zuerst auf das Einwohner-Band ein.
      CREATE INDEX IF NOT EXISTS idx_mgs_population ON mastr_gemeinde_solar (population);

      ALTER TABLE mastr_gemeinde_solar ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_gemeinde_solar_anon_read') THEN
          CREATE POLICY mastr_gemeinde_solar_anon_read ON mastr_gemeinde_solar FOR SELECT TO anon USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_gemeinde_solar_service_write') THEN
          CREATE POLICY mastr_gemeinde_solar_service_write ON mastr_gemeinde_solar FOR ALL TO service_role USING (true);
        END IF;
      END $$;

      -- Namen/Slugs bewusst NICHT mitkopiert: die stehen in mastr_regions und
      -- würden hier still veralten. 11k Zeilen dagegen zu joinen ist billig.
      -- Statement-Timeout nur hier aus (läuft im Datenlauf, nicht im Request).
      CREATE OR REPLACE FUNCTION mastr_refresh_gemeinde_solar()
      RETURNS void LANGUAGE plpgsql AS $fn$
      BEGIN
        SET LOCAL statement_timeout = 0;
        TRUNCATE mastr_gemeinde_solar;
        INSERT INTO mastr_gemeinde_solar (region_id, population, kwp_alle, kwp_dach)
        SELECT a.region_id, r.population,
               sum(a.kwp),
               -- Dach = alles außer Freifläche; künftige Dach-Segmente zählen so
               -- automatisch mit, ohne dass diese Liste gepflegt werden muss.
               coalesce(sum(a.kwp) FILTER (WHERE a.segment <> 'freiflaeche'), 0)
        FROM mastr_aggregates_gem a
        JOIN mastr_regions r ON r.region_id = a.region_id
        WHERE a.energietraeger = 'solar'
          -- Unbewohnte Gebiete würden durch null teilen und jede Tabelle anführen.
          AND r.level = 'gemeinde' AND r.population > 0 AND r.slug IS NOT NULL
        GROUP BY a.region_id, r.population;
      END;
      $fn$;
      REVOKE ALL ON FUNCTION mastr_refresh_gemeinde_solar() FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION mastr_refresh_gemeinde_solar() TO service_role;

      -- Anführer der Größenklasse UND eigener Platz in EINEM Scan, gerankt nach
      -- Dach-Solarleistung je Einwohner (kwp_dach, ohne Freifläche — siehe Tabelle).
      -- kind = 'leader' (stärkste Gemeinde der Klasse) bzw. 'self' (die aufgerufene
      -- Gemeinde, mit Rang und Klassengröße), je Bezug (eigenes Land / bundesweit).
      --
      -- Selbstheilend wie mastr_region_series: ist die vorberechnete Tabelle noch
      -- leer (frisches Setup, Datenlauf abgebrochen), fällt src auf den Live-Scan
      -- zurück. Ein halber Rollup kann die Seite so nie brechen — nur verlangsamen.
      DROP FUNCTION IF EXISTS mastr_peer_leaders(text, int, int);
      DROP FUNCTION IF EXISTS mastr_peer_context(text, text, int, int);
      CREATE OR REPLACE FUNCTION mastr_peer_context(
        p_region_id text,
        p_bl_prefix text,
        p_min_pop int,
        p_max_pop int
      )
      RETURNS TABLE (
        kind text, scope text, region_id text, name text, slug text,
        kreis_slug text, bl_slug text,
        parent_region_id text, population int, kwp numeric, w_per_capita numeric,
        rang int, total int
      )
      LANGUAGE sql
      STABLE
      AS $fn$
        WITH src AS (
          SELECT s.region_id, s.population, s.kwp_dach
          FROM mastr_gemeinde_solar s
          WHERE s.population >= p_min_pop
            AND (p_max_pop IS NULL OR s.population <= p_max_pop)
          UNION ALL
          SELECT a.region_id, r.population,
                 coalesce(sum(a.kwp) FILTER (WHERE a.segment <> 'freiflaeche'), 0)
          FROM mastr_aggregates_gem a
          JOIN mastr_regions r ON r.region_id = a.region_id
          WHERE a.energietraeger = 'solar'
            AND r.level = 'gemeinde' AND r.population > 0 AND r.slug IS NOT NULL
            AND r.population >= p_min_pop
            AND (p_max_pop IS NULL OR r.population <= p_max_pop)
            AND NOT EXISTS (SELECT 1 FROM mastr_gemeinde_solar)
          GROUP BY a.region_id, r.population
        ),
        cand AS (
          SELECT s.scope, src.region_id, src.population, src.kwp_dach AS kwp
          FROM src
          CROSS JOIN (VALUES ('de'), ('bl')) AS s(scope)
          WHERE (s.scope = 'de' OR src.region_id LIKE p_bl_prefix || '%')
        ),
        ranked AS (
          SELECT scope, region_id, population, kwp,
                 round(kwp * 1000 / population) AS w_per_capita,
                 row_number() OVER (PARTITION BY scope ORDER BY kwp / population DESC) AS rn,
                 count(*) OVER (PARTITION BY scope) AS total
          FROM cand
          WHERE kwp IS NOT NULL AND kwp > 0
        ),
        picked AS (
          SELECT CASE WHEN region_id = p_region_id THEN 'self' ELSE 'leader' END AS kind, *
          FROM ranked
          WHERE rn = 1 OR region_id = p_region_id
        )
        -- Kreis- und Land-Slug gleich mitgeben: der Link auf eine fremde Gemeinde
        -- braucht den vollen Pfad. Über atlasPathForRegionId wären das je
        -- Spitzenreiter mehrere zusätzliche Round-Trips; hier sind es zwei Joins
        -- auf eine kleine Tabelle im ohnehin laufenden Statement.
        SELECT p.kind, p.scope, p.region_id, r.name, r.slug,
               k.slug AS kreis_slug, b.slug AS bl_slug, r.parent_region_id,
               p.population, p.kwp, p.w_per_capita, p.rn::int AS rang, p.total::int AS total
        FROM picked p
        JOIN mastr_regions r ON r.region_id = p.region_id
        LEFT JOIN mastr_regions k ON k.region_id = r.parent_region_id
        LEFT JOIN mastr_regions b ON b.region_id = k.parent_region_id
      $fn$;
      REVOKE ALL ON FUNCTION mastr_peer_context(text, text, int, int) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION mastr_peer_context(text, text, int, int) TO anon, authenticated, service_role;
    `,
  });
  results.push({ step: "mastr_peer_context", status: e2d ? "error" : "ok", error: e2d?.message });

  // 2d-2. Vorberechnete Gemeinde-Summen befüllen — eigener Schritt nach dem DDL,
  //       damit ein Timeout hier die Funktionen oben nicht zurückrollt (die
  //       Selbstheilung trägt die Seite dann über den Live-Scan).
  const { error: e2d2 } = await supabase.rpc("exec_sql", {
    sql: `SELECT mastr_refresh_gemeinde_solar();`,
  });
  results.push({ step: "mastr_gemeinde_solar_refresh", status: e2d2 ? "error" : "ok", error: e2d2?.message });

  // 2e. Rollup befüllen — als EIGENER Schritt nach allem DDL. Struktur +
  //     selbstheilende region_series sind da schon committed; scheitert die
  //     Befüllung (Timeout o. Ä.), bleibt die Seite über den Fallback-Scan
  //     korrekt und wird beim nächsten erfolgreichen Refresh schnell.
  const { error: e2e } = await supabase.rpc("exec_sql", {
    sql: `SELECT mastr_refresh_region_rollup();`,
  });
  results.push({ step: "mastr_region_rollup_refresh", status: e2e ? "error" : "ok", error: e2e?.message });

  // 3. mastr_meta — single-row metadata (last import, source version)
  const { error: e3 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS mastr_meta (
        id int PRIMARY KEY DEFAULT 1,
        source_version text,
        source_url text,
        imported_at timestamptz,
        total_units_imported int,
        notes text,
        CONSTRAINT single_row CHECK (id = 1)
      );
    `,
  });
  results.push({ step: "mastr_meta", status: e3 ? "error" : "ok", error: e3?.message });

  // 4. RLS: anon read, service_role write (same pattern as energy tables)
  const { error: e4 } = await supabase.rpc("exec_sql", {
    sql: `
      ALTER TABLE mastr_regions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mastr_aggregates ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mastr_meta ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_regions_anon_read') THEN
          CREATE POLICY mastr_regions_anon_read ON mastr_regions FOR SELECT TO anon USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_regions_service_write') THEN
          CREATE POLICY mastr_regions_service_write ON mastr_regions FOR ALL TO service_role USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_aggregates_anon_read') THEN
          CREATE POLICY mastr_aggregates_anon_read ON mastr_aggregates FOR SELECT TO anon USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_aggregates_service_write') THEN
          CREATE POLICY mastr_aggregates_service_write ON mastr_aggregates FOR ALL TO service_role USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_meta_anon_read') THEN
          CREATE POLICY mastr_meta_anon_read ON mastr_meta FOR SELECT TO anon USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_meta_service_write') THEN
          CREATE POLICY mastr_meta_service_write ON mastr_meta FOR ALL TO service_role USING (true);
        END IF;
      END $$;
    `,
  });
  results.push({ step: "rls_policies", status: e4 ? "error" : "ok", error: e4?.message });

  const allOk = results.every((r) => r.status === "ok");
  return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : 500 });
}
