import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { istAdminOderCron } from "../../../../lib/admin-guard";
import { SOCIAL_KONTEN_DDL } from "../../../../lib/social-konten";
import { SOCIAL_PRUEFUNG_DDL } from "../../../../lib/social-pruefung-kern";
import { SOCIAL_VORLAGEN_DDL } from "../../../../lib/social-vorlage";
import { SOCIAL_VERSAND_DDL } from "../../../../lib/social-versand-log";

// Einmalige Einrichtung der Konten-Ablage, mehrfach aufrufbar. RLS ist an und es
// gibt keine Policy — die Tabelle hält Zugangsschlüssel und ist damit
// ausschließlich über den Service-Key erreichbar.
//
// Admin-Session ODER Cron-Schlüssel: Die Einrichtung gehört zum Anmeldeweg, den
// der Betreiber im Browser durchläuft; ihn dafür einen Kopfzeilen-Schlüssel
// setzen zu lassen, ginge im Browser gar nicht.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await istAdminOderCron(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }
  const { error } = await supabase.rpc("exec_sql", { sql: SOCIAL_KONTEN_DDL + SOCIAL_PRUEFUNG_DDL + SOCIAL_VORLAGEN_DDL + SOCIAL_VERSAND_DDL });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tables: ["social_konten", "social_pruefungen", "social_vorlagen", "social_versand"] });
}
