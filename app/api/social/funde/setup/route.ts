import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase-server";

// ─── Der Vorrat an Geschichten (social_funde) ────────────────────────────────
//
// Bis hierher war jeder Fund flüchtig: Der Suchlauf rechnete ihn, gab ihn aus
// und vergaß ihn. Damit ließ sich nicht stöbern, nichts vormerken und nichts
// verwerfen — beim nächsten Lauf stand alles wieder da, auch das, was schon
// jemand angesehen und für nichts befunden hatte.
//
// DIE KENNUNG IST DER SCHLÜSSEL, NICHT EINE LAUFENDE NUMMER. Sie entsteht aus
// dem Inhalt des Fundes, bleibt über Läufe hinweg dieselbe und ist damit das,
// was ein Mensch zurufen kann („mach aus g10-anomalie-fuerfeld einen Post").
// Eine Nummer je Lauf hätte die Vormerkung von gestern auf einen anderen Fund
// zeigen lassen.
//
// WAS DER LAUF SCHREIBT UND WAS NICHT: Satz, Zahlen und Grundlage werden bei
// jedem Lauf überschrieben — sie sind gerechnet und sollen dem Datenstand
// folgen. `stand` (offen / vorgemerkt / verworfen / gepostet) und `notiz`
// gehören dem Menschen und werden NIE vom Lauf angefasst. Dieselbe Trennung
// wie im Förderkatalog zwischen den Programmdaten und den Beleg-Spalten.
//
// RLS an ohne Policy = nur über den Service-Key erreichbar.
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
      CREATE TABLE IF NOT EXISTS social_funde (
        kennung text PRIMARY KEY,
        muster text NOT NULL,
        kategorie text NOT NULL,
        satz text NOT NULL,
        staerke numeric NOT NULL,
        werte jsonb NOT NULL DEFAULT '[]'::jsonb,
        grundlage text NOT NULL,
        -- Die Orte, über die der Fund etwas sagt. Als Feld, nicht aus dem Satz
        -- gelesen: Dort stehen neben Orten auch Gruppen („Dörfer"), und ein
        -- Filter, der die mitfängt, bietet Ortsnamen an, die keine sind.
        orte text[] NOT NULL DEFAULT '{}',
        -- Gehört dem Menschen, nicht dem Lauf.
        stand text NOT NULL DEFAULT 'offen',
        notiz text,
        -- Wann zuletzt gerechnet: Ein Fund, der im letzten Lauf nicht mehr
        -- auftauchte, ist nicht mehr wahr — die Daten haben sich bewegt. Er
        -- wird nicht gelöscht (die Vormerkung soll nicht verschwinden),
        -- sondern ist am Datum als veraltet erkennbar.
        zuletzt_gesehen timestamptz NOT NULL DEFAULT now(),
        erstmals_gesehen timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS social_funde_stand_idx
        ON social_funde (stand, staerke DESC);
      CREATE INDEX IF NOT EXISTS social_funde_muster_idx
        ON social_funde (muster, staerke DESC);
      ALTER TABLE social_funde ADD COLUMN IF NOT EXISTS orte text[] NOT NULL DEFAULT '{}';
      -- Länder als EIGENE Spalte, nicht mit den Kommunen in einer: „alles
      -- über Bayern" und „alles über Fürfeld" sind zwei Suchen, und in
      -- einer gemeinsamen Liste stünden sechzehn Länder zwischen
      -- zweihundert Gemeinden.
      ALTER TABLE social_funde ADD COLUMN IF NOT EXISTS laender text[] NOT NULL DEFAULT '{}';
      CREATE INDEX IF NOT EXISTS social_funde_laender_idx ON social_funde USING gin (laender);
      -- Trägt die Aussage über Jahre oder ist sie an ein Zeitfenster
      -- gebunden? Ohne Angabe zeitgebunden — die vorsichtige Richtung: Ein
      -- Fund, den niemand eingeordnet hat, wird nicht Monate später als
      -- Evergreen gepostet.
      ALTER TABLE social_funde ADD COLUMN IF NOT EXISTS evergreen boolean NOT NULL DEFAULT false;
      CREATE INDEX IF NOT EXISTS social_funde_orte_idx ON social_funde USING gin (orte);
      -- Volltext über Satz und Grundlage: Wer im Vorrat sucht, sucht nach
      -- einem Wort, das er im Kopf hat, nicht nach einer Kennung.
      CREATE INDEX IF NOT EXISTS social_funde_satz_idx
        ON social_funde USING gin (to_tsvector('german', satz || ' ' || grundlage));
      ALTER TABLE social_funde ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON social_funde FROM anon, authenticated, PUBLIC;
    `,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tabelle: "social_funde" });
}
