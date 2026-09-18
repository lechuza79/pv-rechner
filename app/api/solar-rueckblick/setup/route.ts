import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

// ─── Solar-Rückblick 2016–2025 (solar_rueckblick) ───────────────────────────
//
// One row per postcode with the finished ten-year result. Written by the
// offline preparation run (the ERA5 archive is local only and must not ship);
// read by /api/solar-rueckblick. Idempotent. RLS on without policy: only the
// service key reaches it.
//
// Trigger: Authorization: Bearer $CRON_SECRET

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const { error } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS solar_rueckblick (
        plz text PRIMARY KEY CHECK (plz ~ '^[0-9]{5}$'),
        vorteil_ohne_wp numeric NOT NULL,
        vorteil_mit_wp numeric NOT NULL,
        jahre jsonb NOT NULL,
        annahmen jsonb NOT NULL,
        wetterquelle text NOT NULL,
        berechnet_am timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE solar_rueckblick ENABLE ROW LEVEL SECURITY;
      NOTIFY pgrst, 'reload schema';
    `,
  });
  return NextResponse.json({ step: "solar_rueckblick table", status: error ? "error" : "ok", error: error?.message });
}
