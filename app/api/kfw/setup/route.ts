import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

/**
 * Tabellen für die Zahlen des KfW-Förderreports. Einmalig und wiederholbar:
 *   GET /api/kfw/setup   mit  Authorization: Bearer $CRON_SECRET
 *
 * DER ZUGRIFF IST ABSICHTLICH ZU: RLS an, keine Policy — lesbar nur über den
 * Dienstschlüssel, also nur serverseitig. Das ist keine Vorsicht, sondern eine
 * Auflage: Die Erlaubnis der KfW trägt die Weitergabe zu Informationszwecken
 * unter Quellenangabe, nicht die Weiterverbreitung des Bestands. Eine offene
 * Schnittstelle auf diese Tabellen wäre genau das.
 *
 * Geschrieben wird ausschließlich vom Einlese-Lauf (`npm run kfw:import`), und
 * der schreibt nur, was seine Kontrollsumme bestanden hat.
 */

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const schritte: { schritt: string; status: string; error?: string }[] = [];

  const { error: e1 } = await supabase.rpc("exec_sql", {
    sql: `
      -- Ein Jahrgang mit SEINEM Stichtag. Die Stichtage sind unterjährig
      -- verschieden; eine Reihe über gemischte Stichtage wäre falsch, deshalb
      -- hängt er am Jahrgang und nicht an einer globalen Konstante.
      CREATE TABLE IF NOT EXISTS kfw_report_jahrgang (
        jahr smallint PRIMARY KEY,
        stichtag date NOT NULL,
        eingelesen_at timestamptz NOT NULL DEFAULT now(),
        -- Das Prüfprotokoll des Laufs: je Programm Bundeswert, Summe der
        -- Kreise, Abweichung. Es liegt hier, damit sich später belegen lässt,
        -- WORAUF die Zahlen geprüft waren — nicht nur, DASS sie geprüft waren.
        kontrolle jsonb NOT NULL DEFAULT '{}'::jsonb
      );

      -- Bundesebene: das Programm insgesamt (verwendungszweck = '') und seine
      -- Aufschlüsselung nach Verwendungszwecken.
      CREATE TABLE IF NOT EXISTS kfw_report_bund (
        jahr smallint NOT NULL,
        programm text NOT NULL,
        verwendungszweck text NOT NULL DEFAULT '',
        anzahl integer,
        volumen_mio numeric NOT NULL,
        PRIMARY KEY (jahr, programm, verwendungszweck)
      );

      -- Kreisebene. anzahl IS NULL heißt: die KfW hat die Zahl unterdrückt
      -- (unter zehn, aus Datenschutzgründen). Sie wird NIE zurückgerechnet —
      -- über mehrere Jahrgänge und Ebenen ließe sich eine solche Zelle sonst
      -- aus Differenzen wiederherstellen, und in einem kleinen Landkreis ist
      -- „eine Zusage" faktisch ein identifizierbarer Haushalt.
      CREATE TABLE IF NOT EXISTS kfw_report_kreis (
        jahr smallint NOT NULL,
        programm text NOT NULL,
        region_id text NOT NULL,
        anzahl integer,
        volumen_mio numeric NOT NULL,
        PRIMARY KEY (jahr, programm, region_id)
      );
      CREATE INDEX IF NOT EXISTS idx_kfw_kreis_region ON kfw_report_kreis (region_id, programm);
    `,
  });
  schritte.push({ schritt: "tabellen", status: e1 ? "error" : "ok", error: e1?.message });

  const { error: e2 } = await supabase.rpc("exec_sql", {
    sql: `
      ALTER TABLE kfw_report_jahrgang ENABLE ROW LEVEL SECURITY;
      ALTER TABLE kfw_report_bund     ENABLE ROW LEVEL SECURITY;
      ALTER TABLE kfw_report_kreis    ENABLE ROW LEVEL SECURITY;
      -- Der Entzug an PUBLIC allein reicht in Supabase NICHT: Über
      -- Default-Privilegien stehen direkte Rechte für anon und authenticated,
      -- die ein Entzug an PUBLIC nicht erreicht. Beide Rollen müssen einzeln
      -- genannt werden.
      REVOKE ALL ON kfw_report_jahrgang FROM PUBLIC, anon, authenticated;
      REVOKE ALL ON kfw_report_bund     FROM PUBLIC, anon, authenticated;
      REVOKE ALL ON kfw_report_kreis    FROM PUBLIC, anon, authenticated;
    `,
  });
  schritte.push({ schritt: "zugriff", status: e2 ? "error" : "ok", error: e2?.message });

  return NextResponse.json({ ok: schritte.every((s) => s.status === "ok"), schritte });
}
