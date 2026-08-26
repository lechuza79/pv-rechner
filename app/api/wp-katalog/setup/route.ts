import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { WP_KATALOG_TABELLE } from "../../../../lib/wp-katalog";

// ─── Ablage des Geräte-Katalogs (wp_geraete) ─────────────────────────────────
//
// Einmalig, idempotent. Befüllt wird die Tabelle NICHT hier, sondern täglich von
// `npm run wp:katalog` aus dem Produktdatenstrom des Händlers.
//
// RLS an ohne Policy: Die Tabelle ist mit dem öffentlichen Schlüssel unsichtbar.
// Das ist hier Absicht und keine Übervorsicht — die Geräte gehen ausschließlich
// über den Server in die Seite, und ein offener Lesezugriff wäre eine zweite,
// ungefilterte Ausgabe desselben Bestands (ohne Eignungsprüfung, ohne
// Frischeprüfung). Wer die Daten offen bräuchte, bräuchte sie mit beidem.
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
      CREATE TABLE IF NOT EXISTS ${WP_KATALOG_TABELLE} (
        id            text PRIMARY KEY,
        name          text NOT NULL,
        marke         text NOT NULL,
        leistung_kw   numeric(5,2) NOT NULL,
        herkunft      text NOT NULL,
        bauart        text NOT NULL,
        preis_eur     numeric(10,2) NOT NULL,
        link          text NOT NULL,
        bild_url      text,
        lieferbar     boolean NOT NULL DEFAULT true,
        vorlauf_max_c smallint,
        kaeltemittel  text,
        aufbau        text,
        umfang        text NOT NULL DEFAULT 'geraet',
        abgerufen_am  timestamptz NOT NULL
      );

      -- Die Seite fragt immer nach Wärmequelle und Lieferbarkeit und sortiert
      -- nach Leistung; der Index deckt genau diesen einen Aufrufweg.
      CREATE INDEX IF NOT EXISTS ${WP_KATALOG_TABELLE}_auswahl_idx
        ON ${WP_KATALOG_TABELLE} (bauart, lieferbar, leistung_kw);

      -- Nachträglich, damit ein bestehender Bestand die Spalte bekommt.
      ALTER TABLE ${WP_KATALOG_TABELLE} ADD COLUMN IF NOT EXISTS umfang text NOT NULL DEFAULT 'geraet';

      ALTER TABLE ${WP_KATALOG_TABELLE} ENABLE ROW LEVEL SECURITY;

      -- Kein GRANT an anon/authenticated. Ein Entzug an PUBLIC allein reicht in
      -- Supabase nicht: Über Default-Privileges stehen direkte Rechte an beiden
      -- Rollen, die davon unberührt bleiben.
      REVOKE ALL ON ${WP_KATALOG_TABELLE} FROM PUBLIC;
      REVOKE ALL ON ${WP_KATALOG_TABELLE} FROM anon;
      REVOKE ALL ON ${WP_KATALOG_TABELLE} FROM authenticated;
    `,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tabelle: WP_KATALOG_TABELLE });
}
