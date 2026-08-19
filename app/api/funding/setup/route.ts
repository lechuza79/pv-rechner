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

      -- Drei Techniken statt einer (18.08.2026). Zwei Spalten, beide nötig:
      --
      -- Die Spalte techniken hält fest, WOFÜR die Seite ein Signal trug — ohne das wäre
      -- ein Treffer nur „hier steht irgendwas über Energie" und die Leseliste
      -- ließe sich nicht nach Rechner sortieren.
      --
      -- Die Spalte screen_version ist die wichtigere: Die 878 bereits abgehakten Seiten
      -- wurden mit einem Screener geprüft, der Wärmepumpen GAR NICHT kannte und
      -- Balkon nicht von Dach-PV trennte. Ohne Versionsstempel bliebe „95 %
      -- gescreent" stehen, während für zwei von drei Techniken nie jemand
      -- hingesehen hat — eine Abdeckungszahl, die genau das verdeckt, wofür es
      -- sie gibt. Mit Stempel kommen die alten Zeilen von selbst wieder dran.
      -- Was ein MENSCH beim Lesen der Seite herausgefunden hat.
      --
      -- Der Screener stuft bei jedem Lauf neu ein und kennt kein Gestern: Eine
      -- Seite, die jemand gelesen und verworfen hat, bleibt für ihn ein Treffer.
      -- Hildens "PhotovoltaikCheck" ist eine Beratung, Vaterstettens PV-Position
      -- gilt Planungsleistungen fuer Garagenhoefe — beide sehen im Text wie
      -- Foerderung aus und sind keine. Ohne dieses Gedaechtnis stuenden sie
      -- morgen wieder oben, und eine Liste, die zur Haelfte aus schon
      -- Abgelehntem besteht, liest irgendwann niemand mehr.
      -- Fingerabdruck der Seite — der AUSLÖSER für eine erneute Einordnung.
      --
      -- Nicht der Kalender entscheidet, ob eine bekannte Foerderseite noch einmal
      -- angesehen wird, sondern ob sie sich bewegt hat. Ein festes Intervall
      -- hiesse, dass ein Programm bis zum naechsten Termin den falschen Status
      -- tragen kann; dieselbe Einsicht hatte schon die 180-Tage-Frist beim
      -- Beleg-Verfall gekippt. Derselbe Abdruck wie bei den gefuehrten
      -- Programmen (lib/funding-fingerprint.ts).
      ALTER TABLE funding_coverage ADD COLUMN IF NOT EXISTS fingerprint text;
      ALTER TABLE funding_coverage ADD COLUMN IF NOT EXISTS seite_gesehen_am timestamptz;
      ALTER TABLE funding_coverage ADD COLUMN IF NOT EXISTS seite_geaendert_am timestamptz;
      CREATE INDEX IF NOT EXISTS idx_fcov_seite ON funding_coverage (seite_gesehen_am);

      ALTER TABLE funding_coverage ADD COLUMN IF NOT EXISTS gelesen_am date;
      ALTER TABLE funding_coverage ADD COLUMN IF NOT EXISTS gelesen_ergebnis text;
      ALTER TABLE funding_coverage ADD COLUMN IF NOT EXISTS gelesen_notiz text;
      CREATE INDEX IF NOT EXISTS idx_fcov_gelesen ON funding_coverage (gelesen_am);

      ALTER TABLE funding_coverage ADD COLUMN IF NOT EXISTS techniken text;
      ALTER TABLE funding_coverage ADD COLUMN IF NOT EXISTS screen_version int NOT NULL DEFAULT 1;
      CREATE INDEX IF NOT EXISTS idx_fcov_version ON funding_coverage (screen_version);
    `,
  });
  results.push({ step: "funding_coverage", status: e2b ? "error" : "ok", error: e2b?.message });

  // funding_url_suche: Gedächtnis der URL-Suche.
  //
  // WARUM (18.08.2026): Das Screening kann nur prüfen, was der Kommunen-Outreach
  // zufällig mitgesammelt hat. Für rund 9.700 Gemeinden kennen wir die
  // Verwaltungs-Website, aber keine Förderseite — was die auflegen, sieht
  // niemand. Eigene Tabelle statt einer Spalte an funding_coverage, weil es eine
  // andere Frage ist: „Wo steht die Seite?" gegen „Was steht darauf?". Beide
  // haben eigene Fehlversuche, eigene Versionen und einen eigenen Fortschritt.
  //
  // Der Fund wandert von hier nach kommunen_kontakt.thema_foerderung_url — das
  // Feld, aus dem sich das Screening bedient. Ohne diese Verzahnung wäre die
  // Suche eine Liste, die jemand von Hand weiterreichen müsste.
  const { error: e2u } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS funding_url_suche (
        region_id text PRIMARY KEY,
        website text,
        verdikt text NOT NULL,
        gefunden_url text,
        linktext text,
        punkte int,
        such_version int NOT NULL DEFAULT 1,
        checked_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_fus_verdikt ON funding_url_suche (verdikt, checked_at);
      CREATE INDEX IF NOT EXISTS idx_fus_version ON funding_url_suche (such_version);
    `,
  });
  results.push({ step: "funding_url_suche", status: e2u ? "error" : "ok", error: e2u?.message });

  // funding_seiten: MEHRERE Förderseiten je Gemeinde — der Kern der Erfassung.
  //
  // WARUM (19.08.2026): Die Erfassung hielt an drei Stellen genau eine Adresse je
  // Gemeinde fest — `kommunen_kontakt.thema_foerderung_url` als einzelnes Feld,
  // `funding_url_suche` und `funding_coverage` mit dem Gemeindeschlüssel als
  // Primärschlüssel. Eine Stadt, die Photovoltaik auf der einen und
  // Balkonkraftwerke auf einer anderen Seite fördert, verlor eine der beiden:
  // kein Fehler, keine Meldung, die zweite Seite existierte für uns nicht. Damit
  // konnte der Katalog je Technik gar nicht vollständig werden, egal wie viel
  // jemand liest.
  //
  // Der Schlüssel ist deshalb (Gemeinde × Adresse). Die Adresse kommt
  // normalisiert herein (`seitenSchluessel` in lib/funding-seiten.ts) — ohne das
  // stünden `…/foerderung` und `…/foerderung/` als zwei Seiten im Bestand, jede
  // mit eigenem Fingerabdruck, und der Wächter meldete ewig Bewegung.
  //
  // EIGENE TABELLE STATT UMSCHLÜSSELUNG: `funding_url_suche` beantwortet „haben
  // wir die Website dieser Gemeinde schon durchsucht" — dafür ist eine Zeile je
  // Gemeinde richtig, das ist der Suchversuch, nicht sein Ergebnis. Und
  // `funding_coverage` wird gerade aktiv beschrieben; einen Primärschlüssel unter
  // laufender Arbeit zu wechseln ist die Sorte Umbau, die man nicht braucht.
  //
  // Scannen und Lesen sind ZWEI Spaltengruppen, weil es zwei Fragen sind:
  // „kommt die Seite noch und hat sie sich bewegt?" beantwortet ein Abruf,
  // „steht da eine Förderung?" nur ein Mensch. Ohne das Lese-Gedächtnis stünde
  // eine geprüfte und verworfene Seite beim nächsten Lauf wieder oben.
  const { error: e2s } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS funding_seiten (
        region_id text NOT NULL,
        url text NOT NULL,
        techniken text,
        quelle text NOT NULL DEFAULT 'suche',
        zustand text NOT NULL DEFAULT 'unbekannt',
        entdeckt_am timestamptz NOT NULL DEFAULT now(),

        -- Scannen: derselbe Fingerabdruck wie bei den geführten Programmen
        -- (lib/funding-fingerprint.ts), inklusive Herkunftsmarke live:/archiv:.
        -- Nur ein LIVE gelesener Abruf bestätigt eine Seite; ein Archiv-Treffer
        -- belegt den Inhalt, nicht die Aktualität.
        fingerprint text,
        seite_gesehen_am timestamptz,
        seite_geaendert_am timestamptz,

        -- Lesen: was ein Mensch an der Amtsseite herausgefunden hat.
        gelesen_am date,
        gelesen_ergebnis text,
        gelesen_notiz text,

        PRIMARY KEY (region_id, url)
      );
      CREATE INDEX IF NOT EXISTS idx_fseiten_region ON funding_seiten (region_id);
      CREATE INDEX IF NOT EXISTS idx_fseiten_gelesen ON funding_seiten (gelesen_am);
      CREATE INDEX IF NOT EXISTS idx_fseiten_gesehen ON funding_seiten (seite_gesehen_am);
      CREATE INDEX IF NOT EXISTS idx_fseiten_zustand ON funding_seiten (zustand);

      -- Interne Erfassungstabelle: RLS an, keine Policy — nur über den
      -- Service-Key lesbar, wie waechter_reports und theme_overrides.
      ALTER TABLE funding_seiten ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON funding_seiten FROM PUBLIC, anon, authenticated;
    `,
  });
  results.push({ step: "funding_seiten", status: e2s ? "error" : "ok", error: e2s?.message });

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
      ALTER TABLE funding_url_suche ENABLE ROW LEVEL SECURITY;
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
    // Fehler PRÜFEN — BLOCKER. Ohne diese Abfrage wäre `bestand` bei einem
    // gescheiterten Lesezugriff null, `vorher` leer und jedes Programm würde
    // gegen null verglichen: vergleiche() macht daraus eine "aufnahme", also 45
    // Erstsichtungen mit dem heutigen Datum. Das Protokoll behauptete dann, wir
    // hätten Frankfurts Klimabonus heute zum ersten Mal gesehen — genau die
    // erfundene Historie, gegen die dieses Modul gebaut ist. Reparieren lässt es
    // sich hinterher nicht, weil der Upsert den alten Stand schon überschrieben
    // hat. Gefunden in der Prüfrunde am 18.08.2026.
    const { data: bestand, error: le } = await supabase.from("funding_programs").select("id, data, last_verified");
    if (le) {
      return NextResponse.json(
        { success: false, error: `Bestand nicht lesbar, Resync abgebrochen: ${le.message}` },
        { status: 500 },
      );
    }
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
