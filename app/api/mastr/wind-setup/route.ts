import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { MASTR_WIND_SQL, MASTR_WIND_TABELLE } from "../../../../lib/mastr-wind-sql";

// Creates the per-turbine wind table. Idempotent.
// Auslösen: Authorization: Bearer $CRON_SECRET

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }
  const { error } = await supabase.rpc("exec_sql", { sql: MASTR_WIND_SQL });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tabelle: MASTR_WIND_TABELLE });
}
