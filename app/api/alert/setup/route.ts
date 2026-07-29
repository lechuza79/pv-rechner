import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { WAECHTER_REPORTS_DDL } from "../../../../lib/waechter-reports";

// Einmalige Einrichtung der Wächter-Berichts-Ablage (waechter_reports).
// Aufruf: GET mit Authorization: Bearer $CRON_SECRET. Mehrfach aufrufbar
// (IF NOT EXISTS). RLS ist an und es gibt keine Policy — die Tabelle ist damit
// ausschließlich über den Service-Key lesbar, wie kommunen_kontakt.

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { error } = await supabase.rpc("exec_sql", { sql: WAECHTER_REPORTS_DDL });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, table: "waechter_reports" });
}
