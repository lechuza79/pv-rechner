import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { SOCIAL_KONTEN_DDL } from "../../../../lib/social-konten";

// Einmalige Einrichtung der Konten-Ablage. Aufruf mit Bearer $CRON_SECRET,
// mehrfach aufrufbar. RLS ist an und es gibt keine Policy — die Tabelle hält
// Zugangsschlüssel und ist damit ausschließlich über den Service-Key erreichbar.

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }
  const { error } = await supabase.rpc("exec_sql", { sql: SOCIAL_KONTEN_DDL });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, table: "social_konten" });
}
