import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

// One-time (idempotent) migration: the single-row store for the admin theming
// overlay (per-stage green overrides — see lib/theme-overrides.ts). RLS on with
// no policies = anon has no access; the service role (this route + the layout
// read + the save API) bypasses RLS. Safe to re-run.
//
// Trigger: Authorization: Bearer $CRON_SECRET.

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { error } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS theme_overrides (
        id int PRIMARY KEY DEFAULT 1,
        overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT theme_overrides_single_row CHECK (id = 1)
      );
      ALTER TABLE theme_overrides ENABLE ROW LEVEL SECURITY;
      INSERT INTO theme_overrides (id, overrides) VALUES (1, '{}'::jsonb)
        ON CONFLICT (id) DO NOTHING;
    `,
  });

  return NextResponse.json({
    step: "theme_overrides table",
    status: error ? "error" : "ok",
    error: error?.message,
  });
}
