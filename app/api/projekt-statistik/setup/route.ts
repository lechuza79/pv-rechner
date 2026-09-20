import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { STATISTIK_DDL } from "../../../../lib/projekt-statistik";

// Einmalige Einrichtung der Projekt-Statistik (projekt_statistik, projekt_bestand).
// Aufruf: GET mit Authorization: Bearer $CRON_SECRET, mehrfach aufrufbar.
//
// RLS ist an und es gibt keine Policy: Geschrieben und gelesen wird
// ausschließlich über den Dienstschlüssel. Die Zahlen sollen später öffentlich
// auf einer Seite stehen — aber gefiltert und eingeordnet, nicht als offener
// Tagesauszug, aus dem sich die Arbeitszeiten des Betreibers ablesen lassen.
//
// Die Tabellendefinition steht im Code, nicht abgeschrieben aus der laufenden
// Datenbank — dieselbe Begründung wie bei der Sicherheitsgrenze: Ein aus der
// Produktion abgelesenes Schema ist eine Quelle, der man beim Neuaufbau glaubt,
// ohne dass sie stimmt.

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }
  const { error } = await supabase.rpc("exec_sql", { sql: STATISTIK_DDL });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tables: ["projekt_statistik", "projekt_bestand"] });
}
