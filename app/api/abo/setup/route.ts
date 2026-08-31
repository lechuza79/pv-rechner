import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

// ─── Gemeinde-Abos: die Tabelle anlegen ──────────────────────────────────────
//
// Einmalig, idempotent, mehrfach ausführbar.
// Auslösen: Authorization: Bearer $CRON_SECRET
//
// Diese Route trägt die MIGRATION, nicht das Schema — dieselbe Trennung wie
// bei den gespeicherten Berechnungen und in lib/security-sql.ts. Ein aus der
// laufenden Datenbank abgeschriebenes Schema wäre eine Quelle, der man beim
// Neuaufbau glaubt, ohne dass sie stimmt.
//
// ZUGRIFF: Zeilenschutz an, KEINE Freigabe-Regel. Damit kommt ausschließlich
// der Dienstschlüssel an die Tabelle — sie enthält E-Mail-Adressen und wird nie
// im Browser gelesen. Dieselbe Absicht wie bei den Wächter-Berichten und den
// Kommunen-Kontakten; für alles, was ein angemeldeter Nutzer sehen soll, wäre
// es ein Fehler.

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
      CREATE TABLE IF NOT EXISTS public.gemeinde_abos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        -- Achtstelliger Gemeindeschlüssel. Bewusst OHNE Fremdschlüssel auf
        -- mastr_regions: Die Regionstabelle wird beim Datenlauf neu befüllt,
        -- und ein Fremdschlüssel darauf ließe den Lauf an einem Abo scheitern.
        -- Ob der Schlüssel existiert, prüft die Anmelde-Route beim Eintragen.
        region_id text NOT NULL,
        email text NOT NULL,
        -- ausstehend | bestaetigt | abgemeldet
        status text NOT NULL DEFAULT 'ausstehend',
        erstellt_am timestamptz NOT NULL DEFAULT now(),
        bestaetigt_am timestamptz,
        abgemeldet_am timestamptz,
        -- Wann ging die letzte Meldung raus? Die Frequenzbremse liest das.
        letzte_mail_am timestamptz
      );

      -- Herkunft der Anmeldung. Nachtraeglich ergaenzt, deshalb als ALTER und
      -- nullable: Die Zeilen aus der ersten Fassung tragen nichts, und der
      -- Leser deutet fehlende Angaben als Gemeindeseite (dort gab es das Abo
      -- zuerst). Ein NOT NULL mit Vorgabewert haette ueber jede Altzeile eine
      -- Herkunft behauptet, die niemand erhoben hat.
      ALTER TABLE public.gemeinde_abos ADD COLUMN IF NOT EXISTS quelle text;
      ALTER TABLE public.gemeinde_abos ADD COLUMN IF NOT EXISTS ueber_brief boolean;

      -- EIN Abo je Ort und Adresse. Ohne diese Regel legt jeder erneute Klick
      -- auf "Anmelden" eine weitere Zeile an, und der Ort schickt später
      -- mehrere gleiche Mails an dieselbe Adresse. Die Anwendung fängt das
      -- bereits ab; die Datenbank ist die Stelle, an der es auch dann noch
      -- gilt, wenn ein zweiter Schreibweg dazukommt.
      CREATE UNIQUE INDEX IF NOT EXISTS idx_gemeinde_abos_ort_email
        ON public.gemeinde_abos (region_id, email);

      -- Der Versand fragt "wer ist für diesen Ort bestätigt" — der häufigste
      -- Zugriff und der einzige, der über viele Zeilen geht.
      CREATE INDEX IF NOT EXISTS idx_gemeinde_abos_versand
        ON public.gemeinde_abos (region_id, status);

      -- Aufräumen: nie bestätigte Eintragungen. Die Bestätigungsmail sagt zu,
      -- dass eine unbestätigte Eintragung "nach kurzer Zeit von selbst
      -- gelöscht" wird — der Index macht das Suchen danach billig.
      CREATE INDEX IF NOT EXISTS idx_gemeinde_abos_ausstehend
        ON public.gemeinde_abos (status, erstellt_am);

      ALTER TABLE public.gemeinde_abos ENABLE ROW LEVEL SECURITY;

      -- Kein GRANT an anon/authenticated. In Supabase reicht ein Entzug an
      -- PUBLIC nicht — über Default-Privileges stehen direkte Rechte an beiden
      -- Rollen, die davon unberührt bleiben. Deshalb beide einzeln nennen.
      REVOKE ALL ON public.gemeinde_abos FROM PUBLIC;
      REVOKE ALL ON public.gemeinde_abos FROM anon;
      REVOKE ALL ON public.gemeinde_abos FROM authenticated;
      GRANT ALL ON public.gemeinde_abos TO service_role;
    `,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, table: "gemeinde_abos" });
}
