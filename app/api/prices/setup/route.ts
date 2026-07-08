import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

// One-time (idempotent) migration: add the Wärmepumpen-Grundpreis columns to the
// existing market_prices table. The WP scrape (/api/prices/scrape) writes the
// LWWP base into wp_lwwp_base; the per-kW slope is stored alongside for the
// report/audit. Safe to re-run — ADD COLUMN IF NOT EXISTS.
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
      ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS wp_lwwp_base numeric;
      ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS wp_lwwp_per_kw numeric;
    `,
  });

  return NextResponse.json({
    step: "market_prices wp columns",
    status: error ? "error" : "ok",
    error: error?.message,
  });
}
