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

      ALTER TABLE mastr_aggregates_gem ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_aggregates_gem_anon_read') THEN
          CREATE POLICY mastr_aggregates_gem_anon_read ON mastr_aggregates_gem FOR SELECT TO anon USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_aggregates_gem_service_write') THEN
          CREATE POLICY mastr_aggregates_gem_service_write ON mastr_aggregates_gem FOR ALL TO service_role USING (true);
        END IF;
      END $$;
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
        SELECT
          left(a.region_id, p_child_len) AS region_id,
          a.segment,
          sum(a.count)::bigint,
          sum(a.kwp),
          sum(CASE WHEN p_year_recent IS NOT NULL AND a.year = p_year_recent THEN a.count ELSE 0 END)::bigint
        FROM mastr_aggregates_gem a
        WHERE a.energietraeger = ANY(p_traeger)
          AND (p_prefix = '' OR a.region_id LIKE p_prefix || '%')
          AND (p_year_max IS NULL OR a.year <= p_year_max)
        GROUP BY 1, 2
      $fn$;

      -- One region's full series (segment x year), summed over everything below it.
      -- Bounded by construction: energietraeger x segment x year, never by region
      -- count — so it is safe at Gemeinde, Kreis, Bundesland and DE alike.
      DROP FUNCTION IF EXISTS mastr_region_series(text, text[]);
      CREATE OR REPLACE FUNCTION mastr_region_series(
        p_prefix text,
        p_traeger text[]
      )
      RETURNS TABLE (energietraeger text, segment text, year int, count bigint, kwp numeric, kwh numeric)
      LANGUAGE sql
      STABLE
      AS $fn$
        SELECT a.energietraeger, a.segment, a.year, sum(a.count)::bigint, sum(a.kwp), sum(a.kwh)
        FROM mastr_aggregates_gem a
        WHERE a.energietraeger = ANY(p_traeger)
          AND (p_prefix = '' OR a.region_id LIKE p_prefix || '%')
        GROUP BY 1, 2, 3
      $fn$;

      -- Children of a region, kept at segment x year granularity.
      -- Feeds the ranking table, which filters (privat/gewerbe) and picks a Zubau
      -- year client-side — shipping the grain once beats a round trip per filter.
      -- Bounded: children x segment x years, a few thousand rows at most.
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
        SELECT
          left(a.region_id, p_child_len) AS region_id,
          a.segment,
          a.year,
          sum(a.count)::bigint,
          sum(a.kwp),
          sum(a.kwh)
        FROM mastr_aggregates_gem a
        WHERE a.energietraeger = ANY(p_traeger)
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
      CREATE OR REPLACE FUNCTION mastr_top_gemeinden(
        p_prefix text,
        p_dach_only boolean,
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
            AND (NOT p_dach_only OR a.segment <> 'freiflaeche')
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

      DROP FUNCTION IF EXISTS mastr_top_gemeinden(text, boolean, int);
      REVOKE ALL ON FUNCTION mastr_top_gemeinden(text, boolean, int, int, int) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION mastr_top_gemeinden(text, boolean, int, int, int) TO anon, authenticated, service_role;

      DROP FUNCTION IF EXISTS mastr_children(text, int, text[], int);
      REVOKE ALL ON FUNCTION mastr_children(text, int, text[], int, int) FROM PUBLIC;
      REVOKE ALL ON FUNCTION mastr_region_series(text, text[]) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION mastr_children(text, int, text[], int, int) TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION mastr_region_series(text, text[]) TO anon, authenticated, service_role;
    `,
  });
  results.push({ step: "mastr_rollup_functions", status: e2b ? "error" : "ok", error: e2b?.message });

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
