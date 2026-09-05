import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

// ─── Wohnungsbestand je Gemeinde (zensus_wohnungen) ──────────────────────────
//
// Die Zahl, die dem Anlagenregister fehlt: WIE VIELE Wohnungen es in einer
// Gemeinde gibt und in welchen Gebäudegrößen sie liegen. Das Register kennt
// Anlagen, nicht Gebäude — ohne diesen Nenner lässt sich nicht sagen, ob eine
// Gemeinde wenig Solarleistung hat, weil dort niemand baut, oder weil dort
// kaum jemand ein eigenes Dach besitzt.
//
// Quelle: Zensus 2022 (Statistisches Bundesamt), Regionaltabelle Gebäude und
// Wohnungen, Stichtag 15.05.2022, dl-de/by-2-0 — dieselbe offene Behörden-
// lizenz wie das Anlagenregister, sie verlangt nur die Quellenangabe.
//
// EIN STICHTAG, KEINE REIHE: Der Zensus wird alle zehn Jahre erhoben. Die Zahl
// altert also und wird trotzdem nicht nachgeführt; wer sie verwendet, nennt den
// Stichtag. Deshalb steht er als Spalte und nicht als Notiz irgendwo.
//
// RLS an ohne Policy = mit dem öffentlichen Anon-Key nicht erreichbar; die Route
// arbeitet mit dem Service-Key und umgeht RLS.
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
      CREATE TABLE IF NOT EXISTS zensus_wohnungen (
        region_id text PRIMARY KEY,
        stichtag date NOT NULL,
        wohnungen integer NOT NULL,
        w_1 integer NOT NULL,
        w_2 integer NOT NULL,
        w_3_6 integer NOT NULL,
        w_7_12 integer NOT NULL,
        w_13plus integer NOT NULL,
        gebaeude integer,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE zensus_wohnungen ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON zensus_wohnungen FROM anon, authenticated, PUBLIC;
    `,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tabelle: "zensus_wohnungen" });
}
