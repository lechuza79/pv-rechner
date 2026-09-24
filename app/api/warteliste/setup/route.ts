import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { WARTELISTE_SQL } from "../../../../lib/warteliste-sql";

// Creates the waitlist table. Idempotent. Authorization: Bearer $CRON_SECRET.
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const { error } = await supabase.rpc("exec_sql", { sql: WARTELISTE_SQL });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, table: "warteliste" });
}
