import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

// ─── Kühlgradstunden-Cache (klima_cache) ─────────────────────────────────────
//
// Einmalig, idempotent. /api/cooling-degree liest und schreibt diese Tabelle
// seit dem Bau des Klimaanlagen-Rechners — angelegt wurde sie nie. Der Lesefehler
// wird dort bewusst geschluckt ("Fehlt die Tabelle → still recompute"), der
// Schreibfehler ebenfalls, deshalb ist es niemandem aufgefallen: Die Seite war
// immer richtig, nur teuer. Jeder Abruf einer neuen PLZ hat sechs Anfragen an
// Open-Meteo ausgelöst (5 Archivjahre + 1 Klimaprojektion), obwohl der zweite
// schon aus der Datenbank hätte kommen sollen. Nachgewiesen am 29.07.2026:
// PGRST205, "Could not find the table 'public.klima_cache'".
//
// RLS an ohne Policy = mit dem öffentlichen Anon-Key nicht erreichbar; die Route
// selbst arbeitet mit dem Service-Key und umgeht RLS.
//
// Auslösen: Authorization: Bearer $CRON_SECRET

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
      CREATE TABLE IF NOT EXISTS klima_cache (
        lat numeric(5,2) NOT NULL,
        lon numeric(5,2) NOT NULL,
        cdh_avg5 integer,
        cdh_last_summer integer,
        cdh_projection integer,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (lat, lon)
      );
      ALTER TABLE klima_cache ENABLE ROW LEVEL SECURITY;
      -- Ohne das meldet PostgREST die frische Tabelle noch minutenlang als
      -- "not found" (Schema-Cache). Gleiches Muster wie in
      -- scripts/apply-region-functions.ts.
      NOTIFY pgrst, 'reload schema';
    `,
  });

  return NextResponse.json({
    step: "klima_cache table",
    status: error ? "error" : "ok",
    error: error?.message,
  });
}
