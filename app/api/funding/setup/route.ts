import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { FUNDING_PROGRAMS } from "../../../../lib/funding-programs";

// One-time setup: create the funding tables + RLS, then seed from the code
// dataset if empty. Trigger with Authorization: Bearer $CRON_SECRET.
// Safe to re-run (IF NOT EXISTS; seed only when the table is empty).

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const results: { step: string; status: string; error?: string; note?: string }[] = [];

  // funding_programs: live dataset. Whole program kept as jsonb `data`;
  // provenance + archive flag as top-level columns for querying.
  const { error: e1 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS funding_programs (
        id text PRIMARY KEY,
        data jsonb NOT NULL,
        last_verified date,
        confidence text,
        source_url text,
        source_quote text,
        archived boolean NOT NULL DEFAULT false,
        updated_at timestamptz DEFAULT now(),
        updated_by text
      );
      CREATE INDEX IF NOT EXISTS idx_fp_archived ON funding_programs (archived);
    `,
  });
  results.push({ step: "funding_programs", status: e1 ? "error" : "ok", error: e1?.message });

  // funding_checks: audit trail — every verification/news-watch run logs here.
  const { error: e2 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS funding_checks (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        program_id text NOT NULL,
        checked_at timestamptz DEFAULT now(),
        verdict text,
        confidence text,
        found jsonb,
        source text,
        note text
      );
      CREATE INDEX IF NOT EXISTS idx_fc_program ON funding_checks (program_id, checked_at DESC);
    `,
  });
  results.push({ step: "funding_checks", status: e2 ? "error" : "ok", error: e2?.message });

  // RLS: anon may read programs (public pages); only the service role writes.
  const { error: e3 } = await supabase.rpc("exec_sql", {
    sql: `
      ALTER TABLE funding_programs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE funding_checks ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fp_anon_read') THEN
          CREATE POLICY fp_anon_read ON funding_programs FOR SELECT TO anon USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fp_service_write') THEN
          CREATE POLICY fp_service_write ON funding_programs FOR ALL TO service_role USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fc_service_all') THEN
          CREATE POLICY fc_service_all ON funding_checks FOR ALL TO service_role USING (true);
        END IF;
      END $$;
    `,
  });
  results.push({ step: "rls", status: e3 ? "error" : "ok", error: e3?.message });

  // Seed when empty. With ?resync=1 upsert ALL code programs (id conflict →
  // update data/source/confidence/archived; last_verified etc. bleiben). So
  // gelangen neu eingepflegte Städte aus dem Code-Seed in die DB, ohne die
  // Beleg-Felder eines Wächter-Laufs zu überschreiben.
  const resync = req.nextUrl.searchParams.get("resync") === "1";
  let seeded = 0;
  const { count } = await supabase.from("funding_programs").select("id", { count: "exact", head: true });
  if (!count || resync) {
    const rows = Object.values(FUNDING_PROGRAMS).map((p) => ({
      id: p.id,
      data: p,
      source_url: p.url,
      confidence: p.verified ? "high" : "low",
      archived: p.status === "eingestellt",
    }));
    const { error: se } = await supabase.from("funding_programs").upsert(rows);
    if (se) results.push({ step: resync ? "resync" : "seed", status: "error", error: se.message });
    else { seeded = rows.length; results.push({ step: resync ? "resync" : "seed", status: "ok", note: `${seeded} programs` }); }
  } else {
    results.push({ step: "seed", status: "skipped", note: `${count} rows exist (use ?resync=1 to upsert)` });
  }

  const allOk = results.every((r) => r.status === "ok" || r.status === "skipped");
  return NextResponse.json({ success: allOk, seeded, results }, { status: allOk ? 200 : 500 });
}
