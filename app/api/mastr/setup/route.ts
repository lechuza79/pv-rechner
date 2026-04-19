import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

// One-time setup route to create MaStR data lake tables.
// Call once: GET /api/mastr/setup?key=CRON_SECRET
// Safe to re-run (uses IF NOT EXISTS).

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const authHeader = req.headers.get("authorization");

  if (!CRON_SECRET || (key !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const results: { step: string; status: string; error?: string }[] = [];

  // 1. mastr_regions — hierarchy of DE / Bundesland / Landkreis
  //    region_id uses AGS (Amtlicher Gemeindeschlüssel):
  //      'de'      → Germany
  //      '01'..'16' → Bundesland (2-digit prefix)
  //      '01001'.. → Landkreis (5-digit prefix)
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
