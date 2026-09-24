import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { ANFRAGE_STATISTIK_DDL } from "../../../../lib/fachbetrieb-anfrage-statistik";

/**
 * Legt die Tabelle für die anonyme Anfrage-Statistik an. Idempotent, hinter dem
 * Cron-Schlüssel, wie alle Setup-Routen dieses Projekts.
 *
 * Die Tabellendefinition steht im Modul, nicht hier: Ein aus der laufenden
 * Datenbank abgeschriebenes Schema ist eine Quelle, der man beim Neuaufbau
 * glaubt, ohne dass sie stimmt.
 *
 * Zeilensicherheit ist an, ohne Policy — die Tabelle ist ausschließlich über
 * den Dienstschlüssel erreichbar. Für eine reine Auswertungstabelle ist das
 * die Absicht, kein Versehen.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "no database" }, { status: 500 });
  }
  const { error } = await supabase.rpc("exec_sql", { sql: ANFRAGE_STATISTIK_DDL });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
