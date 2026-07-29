import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

// One-time (idempotent) migration for the market_prices table. Safe to re-run —
// ADD COLUMN IF NOT EXISTS. (Die früheren Spalten wp_lwwp_base/wp_lwwp_per_kw
// bleiben in der Live-DB als Altbestand liegen, werden aber nicht mehr gelesen
// oder geschrieben: die WP-Investition kommt aus lib/heatpump-config.ts.)
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
    `,
  });

  return NextResponse.json({
    step: "market_prices wp columns",
    status: error ? "error" : "ok",
    error: error?.message,
  });
}
