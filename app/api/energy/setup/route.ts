import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

// One-time setup route to create energy data lake tables.
// Call once: GET /api/energy/setup?key=CRON_SECRET
// Safe to re-run (uses IF NOT EXISTS).

const CRON_SECRET = process.env.CRON_SECRET || "";

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

  // 1. energy_timeseries
  const { error: e1 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS energy_timeseries (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        source text NOT NULL,
        metric text NOT NULL,
        country text NOT NULL DEFAULT 'de',
        ts timestamptz NOT NULL,
        data jsonb NOT NULL,
        fetched_at timestamptz DEFAULT now(),
        UNIQUE(source, metric, country, ts)
      );
      CREATE INDEX IF NOT EXISTS idx_ets_lookup ON energy_timeseries (metric, country, ts DESC);
    `,
  });
  results.push({ step: "energy_timeseries", status: e1 ? "error" : "ok", error: e1?.message });

  // 2. energy_monthly
  const { error: e2 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS energy_monthly (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        source text NOT NULL,
        metric text NOT NULL,
        country text NOT NULL DEFAULT 'de',
        period text NOT NULL,
        data jsonb NOT NULL,
        fetched_at timestamptz DEFAULT now(),
        UNIQUE(source, metric, country, period)
      );
      CREATE INDEX IF NOT EXISTS idx_em_lookup ON energy_monthly (metric, country, period DESC);
    `,
  });
  results.push({ step: "energy_monthly", status: e2 ? "error" : "ok", error: e2?.message });

  // 3. data_source_meta
  const { error: e3 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS data_source_meta (
        id text PRIMARY KEY,
        source text NOT NULL,
        metric text NOT NULL,
        country text NOT NULL,
        license text NOT NULL DEFAULT 'unknown',
        last_fetched_at timestamptz,
        last_data_ts timestamptz,
        status text DEFAULT 'ok',
        error_message text
      );
    `,
  });
  results.push({ step: "data_source_meta", status: e3 ? "error" : "ok", error: e3?.message });

  // 4. RLS: enable read for anon, write for service role only
  const { error: e4 } = await supabase.rpc("exec_sql", {
    sql: `
      ALTER TABLE energy_timeseries ENABLE ROW LEVEL SECURITY;
      ALTER TABLE energy_monthly ENABLE ROW LEVEL SECURITY;
      ALTER TABLE data_source_meta ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'energy_ts_anon_read') THEN
          CREATE POLICY energy_ts_anon_read ON energy_timeseries FOR SELECT TO anon USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'energy_ts_service_write') THEN
          CREATE POLICY energy_ts_service_write ON energy_timeseries FOR ALL TO service_role USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'energy_monthly_anon_read') THEN
          CREATE POLICY energy_monthly_anon_read ON energy_monthly FOR SELECT TO anon USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'energy_monthly_service_write') THEN
          CREATE POLICY energy_monthly_service_write ON energy_monthly FOR ALL TO service_role USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'data_source_meta_anon_read') THEN
          CREATE POLICY data_source_meta_anon_read ON data_source_meta FOR SELECT TO anon USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'data_source_meta_service_write') THEN
          CREATE POLICY data_source_meta_service_write ON data_source_meta FOR ALL TO service_role USING (true);
        END IF;
      END $$;
    `,
  });
  results.push({ step: "rls_policies", status: e4 ? "error" : "ok", error: e4?.message });

  const allOk = results.every((r) => r.status === "ok");
  return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : 500 });
}
