import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

// ─── Gespeicherte Berechnungen: die Tabelle an den Code nachziehen ───────────
//
// Einmalig, idempotent, mehrfach ausfuehrbar.
//
// WARUM ES DIESE ROUTE GIBT (28.08.2026, gemessen an der Produktion):
// Seit dem 28.03.2026 schreibt POST /api/calculations das Feld
// `einspeisung_modus` (drei Zustaende: aus / teil / voll). Die Tabelle hat es
// nie bekommen und trug weiter den alten Schalter `einspeisung_an`. Jeder
// Speicherversuch scheiterte deshalb mit HTTP 500 — fuenf Monate lang, ohne
// dass es jemandem aufgefallen waere. Die Tabelle enthaelt zwei Zeilen, beide
// aus dem Maerz 2026, die letzte vier Tage vor der Codeaenderung.
//
// Der zweite Blocker war der teurere, weil er erst NACH dem ersten sichtbar
// geworden waere: `o_einsp` (eigener Einspeisesatz) steht auf NOT NULL, aber
// der Code schreibt dort ausdruecklich NULL, sobald der Nutzer keinen eigenen
// Satz gesetzt hat — also im Normalfall. Nachgestellt mit einem Insert, der am
// Fremdschluessel scheitern sollte und schon vorher umfiel:
//   23502 "null value in column \"o_einsp\" of relation \"calculations\"
//          violates not-null constraint"
// Waere nur die fehlende Spalte ergaenzt worden, waere das Speichern fuer die
// meisten weiterhin kaputt gewesen — und der naechste Lauf haette wieder bei
// null angefangen.
//
// BEWUSST NICHT HIER: die Tabellendefinition selbst. Dieselbe Begruendung wie
// in lib/security-sql.ts — ein aus der laufenden Datenbank abgeschriebenes
// Schema waere eine Quelle, der man beim Neuaufbau glaubt, ohne dass sie
// stimmt. Diese Route traegt die MIGRATION, nicht das Schema.
//
// Dass die Klasse nicht zurueckkommt, sichert der Gesundheitscheck ab
// (`spaltenAbgleich`): Er haelt die Feldliste, die der Code schreibt, gegen die
// Spalten der Tabelle und meldet jede Abweichung an Claude. Eine Anleitung
// haette hier nichts geholfen — der Fehler entstand, weil niemand hinsah.
//
// Ausloesen: Authorization: Bearer $CRON_SECRET

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
      DO $calculations_migration$
      BEGIN
        IF to_regclass('public.calculations') IS NULL THEN
          RAISE NOTICE 'Tabelle calculations existiert nicht — Migration uebersprungen.';
          RETURN;
        END IF;

        -- 1) Der Dreifach-Schalter, den der Code seit 03/2026 schreibt.
        --    Erst nullable anlegen, damit die bestehenden Zeilen NULL tragen
        --    und der Backfill darunter sie eindeutig erkennt. Ein Backfill
        --    ueber "WHERE modus = 'teil'" waere bei einem zweiten Lauf keine
        --    Wiederholung mehr, sondern eine Aenderung: Er wuerde eine spaeter
        --    von Hand auf "teil" gesetzte Zeile erneut auf "aus" ziehen.
        ALTER TABLE public.calculations
          ADD COLUMN IF NOT EXISTS einspeisung_modus text;

        -- 2) Backfill aus dem alten Schalter. Nur NULL-Zeilen, also genau
        --    einmal wirksam. Der alte Schalter kannte "voll" nicht — aus
        --    "an" wird deshalb "teil", der Zustand, den er gemeint hat.
        UPDATE public.calculations
           SET einspeisung_modus = CASE WHEN einspeisung_an THEN 'teil' ELSE 'aus' END
         WHERE einspeisung_modus IS NULL;

        ALTER TABLE public.calculations
          ALTER COLUMN einspeisung_modus SET DEFAULT 'teil';
        ALTER TABLE public.calculations
          ALTER COLUMN einspeisung_modus SET NOT NULL;

        -- 3) "Kein eigener Einspeisesatz gesetzt" ist ein gueltiger Zustand und
        --    heisst NULL — der Typ im Code sagt das seit jeher (number | null),
        --    nur die Tabelle wusste es nicht. Der Vorgabewert 8,03 ct war der
        --    Satz von Maerz 2026 und ist laengst ueberholt; er darf nicht
        --    stillschweigend in eine Zeile geraten.
        ALTER TABLE public.calculations ALTER COLUMN o_einsp DROP NOT NULL;
        ALTER TABLE public.calculations ALTER COLUMN o_einsp DROP DEFAULT;

        -- 4) Der alte Schalter bleibt stehen, weil die beiden Altzeilen ihre
        --    Angabe darin tragen — geloescht wird nichts. Aber er darf ueber
        --    NEUE Zeilen nichts mehr behaupten: Mit NOT NULL und Vorgabe "true"
        --    haette jede kuenftige Berechnung "Einspeisung an" ausgewiesen,
        --    auch die eines Nutzers, der sie ausgeschaltet hat.
        ALTER TABLE public.calculations ALTER COLUMN einspeisung_an DROP NOT NULL;
        ALTER TABLE public.calculations ALTER COLUMN einspeisung_an DROP DEFAULT;
      END
      $calculations_migration$;

      -- Ohne das meldet PostgREST die neue Spalte noch minutenlang als
      -- unbekannt (Schema-Cache) — dieselbe Falle wie in den uebrigen
      -- Setup-Routen.
      NOTIFY pgrst, 'reload schema';
    `,
  });

  return NextResponse.json({
    step: "calculations: einspeisung_modus + Nullbarkeit",
    status: error ? "error" : "ok",
    error: error?.message,
  });
}
