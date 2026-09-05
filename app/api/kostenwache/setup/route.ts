import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { KOSTENWACHE_DDL } from "../../../../lib/kostenwache";

// Einmalige Einrichtung der Kostenwache-Ablage (kosten_tageswerte).
// Aufruf: GET mit Authorization: Bearer $CRON_SECRET. Mehrfach aufrufbar
// (IF NOT EXISTS). RLS ist an und es gibt keine Policy — die Tabelle ist damit
// ausschließlich über den Service-Key erreichbar, wie waechter_reports und
// kommunen_kontakt. Es sind interne Betriebsdaten; für anonyme Leser gibt es
// dort nichts zu holen.
//
// Die Tabellendefinition steht im Code (lib/kostenwache.ts), nicht abgeschrieben
// aus der laufenden Datenbank — dieselbe Begründung wie in lib/security-sql.ts:
// Ein aus der Produktion abgelesenes Schema ist eine Quelle, der man beim
// Neuaufbau glaubt, ohne dass sie stimmt.

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { error } = await supabase.rpc("exec_sql", { sql: KOSTENWACHE_DDL });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, table: "kosten_tageswerte" });
}
