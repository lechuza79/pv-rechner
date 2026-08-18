import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { FUNDING_PROGRAMS, landProgramBundeslaender, type FundingProgram } from "../../../../lib/funding-programs";
import { publishedCities, cityPath, publishedBundeslaender } from "../../../../lib/atlas-cities";
import { pingIndexNow } from "../../../../lib/indexnow";
import { vergleiche, zuEintraegen } from "../../../../lib/funding-history";

// One-time setup: create the funding tables + RLS, then seed from the code
// dataset if empty. Trigger with Authorization: Bearer $CRON_SECRET.
// Safe to re-run (IF NOT EXISTS; seed only when the table is empty).

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const results: { step: string; status: string; error?: string; note?: string }[] = [];

  // funding_programs: live dataset. Whole program kept as jsonb `data`;
  // provenance + archive flag as top-level columns for querying.
  const { error: e1 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS funding_programs (
        id text PRIMARY KEY,
        data jsonb NOT NULL,
        last_verified date,
        confidence text,
        source_url text,
        source_quote text,
        archived boolean NOT NULL DEFAULT false,
        updated_at timestamptz DEFAULT now(),
        updated_by text
      );
      CREATE INDEX IF NOT EXISTS idx_fp_archived ON funding_programs (archived);
      -- Seiten-Wächter (scripts/funding-watch.ts): Fingerabdruck des sichtbaren
      -- Texts der Amtsseite plus Zeitpunkt des letzten Abrufs. Damit erkennt ein
      -- reiner Abruf ohne Modell, dass sich eine Seite bewegt hat.
      ALTER TABLE funding_programs ADD COLUMN IF NOT EXISTS page_fingerprint text;
      ALTER TABLE funding_programs ADD COLUMN IF NOT EXISTS page_seen_at timestamptz;
      ALTER TABLE funding_programs ADD COLUMN IF NOT EXISTS page_changed_at timestamptz;
    `,
  });
  results.push({ step: "funding_programs", status: e1 ? "error" : "ok", error: e1?.message });

  // funding_checks: audit trail — every verification/news-watch run logs here.
  const { error: e2 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS funding_checks (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        program_id text NOT NULL,
        checked_at timestamptz DEFAULT now(),
        verdict text,
        confidence text,
        found jsonb,
        source text,
        note text
      );
      CREATE INDEX IF NOT EXISTS idx_fc_program ON funding_checks (program_id, checked_at DESC);
    `,
  });
  results.push({ step: "funding_checks", status: e2 ? "error" : "ok", error: e2?.message });

  // funding_coverage: Gedächtnis der Abdeckungs-Suche.
  //
  // WARUM (18.08.2026): 971 Gemeinden haben eine erfasste Förderseite, die wir
  // nicht führen. Ein Durchgang schafft davon nur einen Teil — ohne Ablage
  // begänne jeder Lauf wieder bei den größten und käme nie in die Tiefe. Genau
  // dasselbe Gedächtnisproblem, das der Prüf-Arbeitsvorrat schon gelöst hat.
  const { error: e2b } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS funding_coverage (
        region_id text PRIMARY KEY,
        url text,
        verdict text NOT NULL,
        evidence text,
        http int,
        checked_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_fcov_verdict ON funding_coverage (verdict, checked_at);
    `,
  });
  results.push({ step: "funding_coverage", status: e2b ? "error" : "ok", error: e2b?.message });

  // funding_history: Verlauf der Förderprogramme — jeder Zustandswechsel, den
  // wir feststellen, bevor er überschrieben wird.
  //
  // WARUM (18.08.2026): Der Wächter sah jeden Wechsel und überschrieb ihn. Wer
  // stattdessen mitschreibt, kann nach zwölf Monaten sagen „seit Juli
  // ausgeschöpft, davor 150 €/kWh" — das kann sonst niemand, weil die
  // Wettbewerber nur den Ist-Stand scrapen.
  //
  // `observed_at` heißt bewusst nicht `changed_at`: Wir kennen den Tag UNSERER
  // Feststellung, nicht den des Ratsbeschlusses. Und `belegt_am` ist getrennt
  // davon, weil eine Bestätigung an der Amtsquelle etwas anderes ist als eine
  // Beobachtung — dieselbe Trennung wie bei `last_verified` vs. `updated_at`.
  //
  // Es gibt bewusst KEIN Löschen: Die Protokolle sind das einzige Beweismittel
  // für die „wesentliche Investition" hinter dem Datenbankherstellerrecht
  // (Rechts-Audit 17.08.2026). Auch Einträge zu eingestellten Programmen bleiben.
  const { error: e2c } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS funding_history (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        program_id text NOT NULL,
        observed_at timestamptz NOT NULL DEFAULT now(),
        feld text NOT NULL,
        bedeutung text NOT NULL DEFAULT 'inhalt',
        alt text,
        neu text,
        quelle text,
        belegt_am date
      );
      CREATE INDEX IF NOT EXISTS idx_fh_program ON funding_history (program_id, observed_at DESC);
    `,
  });
  results.push({ step: "funding_history", status: e2c ? "error" : "ok", error: e2c?.message });

  // RLS: anon may read programs (public pages); only the service role writes.
  const { error: e3 } = await supabase.rpc("exec_sql", {
    sql: `
      ALTER TABLE funding_programs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE funding_checks ENABLE ROW LEVEL SECURITY;
      ALTER TABLE funding_coverage ENABLE ROW LEVEL SECURITY;
      ALTER TABLE funding_history ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fp_anon_read') THEN
          CREATE POLICY fp_anon_read ON funding_programs FOR SELECT TO anon USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fp_service_write') THEN
          CREATE POLICY fp_service_write ON funding_programs FOR ALL TO service_role USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fc_service_all') THEN
          CREATE POLICY fc_service_all ON funding_checks FOR ALL TO service_role USING (true);
        END IF;
        -- Kein anon-Lesen: Die Seiten lesen den Verlauf serverseitig ueber den
        -- Service-Key. Was der Browser nicht braucht, bekommt er nicht.
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fh_service_all') THEN
          CREATE POLICY fh_service_all ON funding_history FOR ALL TO service_role USING (true);
        END IF;
      END $$;
    `,
  });
  results.push({ step: "rls", status: e3 ? "error" : "ok", error: e3?.message });

  // Seed when empty. With ?resync=1 upsert ALL code programs (id conflict →
  // update data/source/confidence/archived; last_verified etc. bleiben). So
  // gelangen neu eingepflegte Städte aus dem Code-Seed in die DB, ohne die
  // Beleg-Felder eines Wächter-Laufs zu überschreiben.
  const resync = req.nextUrl.searchParams.get("resync") === "1";
  let seeded = 0;
  const { count } = await supabase.from("funding_programs").select("id", { count: "exact", head: true });
  if (!count || resync) {
    const rows = Object.values(FUNDING_PROGRAMS).map((p) => ({
      id: p.id,
      data: p,
      source_url: p.url,
      confidence: p.verified ? "high" : "low",
      // NICHT mehr aus dem Status ableiten (17.08.2026, Entscheidung des
      // Betreibers): Ausgelaufene Programme sollen aufgenommen und WEITER
      // GEPRÜFT werden — "gab es, ist beendet" ist für jemanden vor Ort eine
      // echte Auskunft, und wir merken es, wenn die Stadt es neu auflegt.
      // `archived` hieß bisher faktisch "Programm beendet" und schloss die Zeile
      // vom Seiten-Wächter aus; es bedeutet jetzt nur noch "Eintrag entfernt".
      archived: false,
    }));
    // ── Verlauf mitschreiben, BEVOR der Upsert den alten Stand überschreibt ──
    //
    // Hier und nur hier ändert sich der Zustand eines Programms: Ein
    // Wächter-Lauf korrigiert `lib/funding-programs.ts`, und mit dem Resync
    // landet die Korrektur in der Datenbank. Der tägliche Seiten-Wächter
    // (scripts/funding-watch.ts) schreibt dagegen nur Fingerabdruck-Spalten —
    // er sieht, DASS sich die Amtsseite bewegt hat, nicht WAS sich geändert hat,
    // und kann deshalb keinen Alt/Neu-Eintrag erzeugen. Ihn hier anzusetzen
    // hieße, ein „von X auf Y" zu behaupten, das niemand gelesen hat.
    //
    // Schlägt das Protokollieren fehl, läuft der Upsert TROTZDEM — bewusst so
    // herum. Die Alternative wäre, das Überschreiben zu blockieren, bis das
    // Protokoll steht; dann könnte aber eine Korrektur wie „Topf ausgeschöpft"
    // nicht mehr live gehen, und auf 110 Stadtseiten stünde weiter eine
    // Förderung, die es nicht mehr gibt. Eine falsche Zahl auf der Seite ist die
    // schwerste Fehlerklasse dieses Projekts, ein fehlender Verlaufseintrag
    // nicht. Der Preis: Dieser eine Eintrag ist dann verloren — eine
    // Wiederholung findet keinen Unterschied mehr, weil der Upsert schon
    // durchlief. Deshalb geht der Fehler in die Antwort (HTTP 500), statt still
    // verbucht zu werden.
    const { data: bestand } = await supabase.from("funding_programs").select("id, data, last_verified");
    const vorher = new Map(
      ((bestand ?? []) as { id: string; data: FundingProgram; last_verified: string | null }[])
        .map((r) => [r.id, r]),
    );
    // Ein Zeitstempel für den ganzen Lauf: Alle Änderungen dieses Resyncs wurden
    // im selben Moment festgestellt. Das ist eine echte Beobachtung, kein aus
    // `updated_at` oder der Build-Zeit abgeleitetes Datum — genau diese
    // Unterscheidung hat 2026 schon einmal 25 Programmen ein erfundenes
    // Prüfdatum eingetragen.
    const festgestelltAm = new Date().toISOString();
    const eintraege = Object.values(FUNDING_PROGRAMS).flatMap((p) => {
      const stand = vorher.get(p.id);
      return zuEintraegen(vergleiche(stand?.data ?? null, p), festgestelltAm, {
        quelle: p.url ?? null,
        belegtAm: stand?.last_verified ?? null,
      });
    });
    if (eintraege.length) {
      const { error: he } = await supabase.from("funding_history").insert(
        eintraege.map((e) => ({
          program_id: e.programId,
          observed_at: e.festgestelltAm,
          feld: e.feld,
          bedeutung: e.bedeutung,
          alt: e.alt,
          neu: e.neu,
          quelle: e.quelle,
          belegt_am: e.belegtAm,
        })),
      );
      results.push({
        step: "history",
        status: he ? "error" : "ok",
        error: he?.message,
        note: he ? undefined : `${eintraege.length} Einträge`,
      });
    } else {
      results.push({ step: "history", status: "skipped", note: "keine Änderung gegenüber dem Bestand" });
    }

    const { error: se } = await supabase.from("funding_programs").upsert(rows);
    if (se) results.push({ step: resync ? "resync" : "seed", status: "error", error: se.message });
    else { seeded = rows.length; results.push({ step: resync ? "resync" : "seed", status: "ok", note: `${seeded} programs` }); }
  } else {
    results.push({ step: "seed", status: "skipped", note: `${count} rows exist (use ?resync=1 to upsert)` });
  }

  // Success is decided by the DB steps only — IndexNow is best-effort and must
  // never flip the setup to 500.
  const allOk = results.every((r) => r.status === "ok" || r.status === "skipped");

  // Content changed → nudge IndexNow (Bing/Yandex) to re-crawl the funding URLs.
  if (seeded > 0) {
    const blSlugs = new Set([...publishedBundeslaender(), ...landProgramBundeslaender()].map((b) => b.slug));
    const urls = [
      "/photovoltaik-foerderung",
      ...Array.from(blSlugs, (s) => `/photovoltaik-foerderung/${s}`),
      ...publishedCities().map((c) => cityPath(c)),
    ];
    const ping = await pingIndexNow(urls);
    results.push({ step: "indexnow", status: ping.ok ? "ok" : "skipped", note: `${urls.length} URLs${ping.status ? ` · HTTP ${ping.status}` : " · nicht erreicht"}` });
  }

  return NextResponse.json({ success: allOk, seeded, results }, { status: allOk ? 200 : 500 });
}
