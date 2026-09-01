import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { SEITEN_HERKUNFT_DDL } from "../../../../lib/seiten-herkunft";

// Einmalige Einrichtung der Seiten-Herkunftszählung (seiten_herkunft +
// Zähl-Funktion). Aufruf: GET mit Authorization: Bearer $CRON_SECRET.
// Mehrfach aufrufbar.
//
// RLS ist an und es gibt keine Policy — die Tabelle ist damit ausschließlich
// über den Service-Key lesbar; die Zähl-Funktion läuft als SECURITY DEFINER mit
// festem search_path und ist weder für anon noch für authenticated aufrufbar
// (die Rechte werden im DDL einzeln entzogen, nicht nur an PUBLIC — siehe
// lib/security-sql.ts).

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { error } = await supabase.rpc("exec_sql", { sql: SEITEN_HERKUNFT_DDL });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, table: "seiten_herkunft" });
}
