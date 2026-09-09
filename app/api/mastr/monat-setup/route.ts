import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

// ─── Zubau je Monat (mastr_monat_gem) ────────────────────────────────────────
//
// Die feinere Auflösung neben dem Jahresbestand, und bewusst eine EIGENE
// Tabelle: Eine Monatsspalte im Hauptbestand verzwölffachte 590.000 Zeilen, und
// jeder Lauf, der sie füllt, müsste dabei den laufenden Betrieb überschreiben.
//
// Sie trägt nur Solar und nur die letzten gut zwei Jahre — nach hinten wird die
// Monatsauflösung nicht gebraucht, und was ein Monat trägt, ist ohnehin nur
// frisch erzählenswert.
//
// EINE MONATSZAHL IST NICHT FERTIG, WENN DER MONAT VORBEI IST: Anlagen werden
// nach der Inbetriebnahme registriert, ein Monatswert wächst also nach. Wer aus
// dieser Tabelle eine Aussage baut, misst den Verzug erst
// (`mastr-monat-refresh.ts --verzug`) und lässt die jüngsten Monate draußen.
//
// RLS an ohne Policy = mit dem öffentlichen Anon-Key nicht erreichbar.
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
      CREATE TABLE IF NOT EXISTS mastr_monat_gem (
        region_id text NOT NULL,
        segment text NOT NULL,
        monat date NOT NULL,
        count integer NOT NULL,
        kwp numeric(14,2) NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (region_id, segment, monat)
      );
      -- Die Anomalie-Suche geht über einen Monat und liest alle Gemeinden dazu,
      -- nicht umgekehrt: Der Monat gehört deshalb an den Anfang des Index.
      CREATE INDEX IF NOT EXISTS mastr_monat_gem_monat_idx
        ON mastr_monat_gem (monat, segment);
      ALTER TABLE mastr_monat_gem ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON mastr_monat_gem FROM anon, authenticated, PUBLIC;
    `,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tabelle: "mastr_monat_gem" });
}
