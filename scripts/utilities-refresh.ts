/**
 * Stadtwerke / Energieversorger — Tabellen anlegen und Bestand melden.
 *
 * Zwei Tabellen:
 *   utilities         — der Versorger selbst (Name, Typ, Kontakt, Sitz, Status)
 *   utility_communes  — welche Gemeinden zu ihm gehören (n:m)
 *
 * Warum n:m und nicht ein Gemeinde-Feld am Versorger: Ein Stadtwerk versorgt
 * typisch 5–20 Gemeinden, und Versorgungsgebiete decken sich nur im Ausnahmefall
 * mit Gemeindegrenzen. Eine 1:1-Zuordnung wäre in dem Moment ein Umbau, in dem
 * der erste echte Fall auftaucht — also von Anfang an n:m.
 *
 * Warum die Herkunft je Zuordnung (`zuordnung_quelle`): Versorgungsgebiete sind
 * nicht öffentlich dokumentiert, und Netzbetreiber, Grundversorger und Vertrieb
 * haben verschiedene, überlappende Gebiete. Unsere Zuordnung ist eine Näherung.
 * Wenn die Zahl später einem Versorger vorgelegt wird, muss belegbar sein, worauf
 * sie beruht — sonst kostet der erste Widerspruch die Glaubwürdigkeit.
 *
 * Nutzung:
 *   tsx scripts/utilities-refresh.ts --setup    # Tabellen anlegen (idempotent)
 *   tsx scripts/utilities-refresh.ts --stats    # Bestand + Deckung melden
 *
 * Voraussetzungen: SUPABASE_URL, SUPABASE_SERVICE_KEY aus .env.local.
 *
 * Die Erfassung selbst läuft NICHT hier, sondern von Hand im Admin-Cockpit
 * (/admin/versorger). Es gibt kein öffentliches Stadtwerke-Register, und solange
 * die Menge klein ist, ist ein Scraping-Automatismus mehr Risiko als Nutzen.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function log(msg: string, level: "info" | "ok" | "err" = "info"): void {
  const prefix = level === "ok" ? "✓ " : level === "err" ? "✗ " : "  ";
  // eslint-disable-next-line no-console
  console.log(prefix + msg);
}

function loadEnvFile(): void {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function makeClient() {
  loadEnvFile();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

async function setup(): Promise<void> {
  const supabase = await makeClient();
  // Interne Outreach-Daten — wie kommunen_kontakt KEIN anon-Read. RLS an, nur
  // service_role. Öffentlicher Zugriff läuft ins Leere (default deny).
  const sql = `
    CREATE TABLE IF NOT EXISTS utilities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      typ text NOT NULL DEFAULT 'stadtwerk'
        CHECK (typ IN ('stadtwerk', 'regionalversorger', 'genossenschaft')),
      website text,
      kontakt_email text,
      kontaktseite_url text,
      -- Sitz der Gesellschaft. Bestimmt zugleich das Bundesland, in dem der
      -- Versorger verglichen wird (Gebiete können Landesgrenzen kreuzen — das
      -- ist eine Vereinfachung und wird in der Anzeige als solche gekennzeichnet).
      sitz_gemeinde_id text REFERENCES mastr_regions(region_id),
      status text NOT NULL DEFAULT 'offen',
      notiz text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_utilities_status ON utilities (status);
    CREATE INDEX IF NOT EXISTS idx_utilities_sitz ON utilities (sitz_gemeinde_id);

    -- n:m. Ein Primärschlüssel aus (Versorger, Gemeinde) — eine Gemeinde hat bei
    -- einem Versorger genau EINE Rolle, sonst zählte sie doppelt in die Summe.
    CREATE TABLE IF NOT EXISTS utility_communes (
      utility_id uuid NOT NULL REFERENCES utilities(id) ON DELETE CASCADE,
      commune_id text NOT NULL REFERENCES mastr_regions(region_id),
      rolle text NOT NULL DEFAULT 'versorgungsgebiet'
        CHECK (rolle IN ('sitz', 'versorgungsgebiet', 'beteiligung')),
      -- Herkunft der Zuordnung: verlinkt (auf einer der beiden Websites
      -- ausgewiesen) > recherchiert (andere belastbare Quelle) > vermutet.
      zuordnung_quelle text NOT NULL DEFAULT 'vermutet'
        CHECK (zuordnung_quelle IN ('verlinkt', 'recherchiert', 'vermutet')),
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (utility_id, commune_id)
    );
    -- Überschneidungen finden: welche Gemeinde hängt an mehreren Versorgern?
    CREATE INDEX IF NOT EXISTS idx_uc_commune ON utility_communes (commune_id);

    ALTER TABLE utilities ENABLE ROW LEVEL SECURITY;
    ALTER TABLE utility_communes ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'utilities' AND policyname = 'utilities_service_all'
      ) THEN
        CREATE POLICY utilities_service_all ON utilities
          FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'utility_communes' AND policyname = 'utility_communes_service_all'
      ) THEN
        CREATE POLICY utility_communes_service_all ON utility_communes
          FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `;
  const { error } = await supabase.rpc("exec_sql", { sql });
  if (error) throw new Error(`setup failed: ${error.message}`);
  log("utilities + utility_communes angelegt (RLS an, nur service_role)", "ok");

  // Ohne das kennt die Datenschnittstelle die frischen Tabellen nicht („Could
  // not find the table in the schema cache") — der Anlauf sähe dann aus wie ein
  // fehlgeschlagenes Setup, obwohl die Tabellen längst stehen.
  await supabase.rpc("exec_sql", { sql: "NOTIFY pgrst, 'reload schema';" });
  await new Promise((r) => setTimeout(r, 2000));
  log("Schema-Cache neu geladen", "ok");
}

// ─── Bestand ──────────────────────────────────────────────────────────────────

async function stats(): Promise<void> {
  const supabase = await makeClient();

  const { data: utils, error: e1 } = await supabase.from("utilities").select("id, name, typ, status");
  if (e1) throw new Error(e1.message);
  const { data: links, error: e2 } = await supabase
    .from("utility_communes")
    .select("utility_id, commune_id, rolle, zuordnung_quelle");
  if (e2) throw new Error(e2.message);

  const u = utils ?? [];
  const l = links ?? [];
  log(`${u.length} Versorger erfasst`);
  for (const typ of ["stadtwerk", "regionalversorger", "genossenschaft"]) {
    const n = u.filter((r) => r.typ === typ).length;
    if (n) log(`  ${typ}: ${n}`);
  }

  const gebiet = l.filter((r) => r.rolle !== "beteiligung");
  log(`${gebiet.length} Gemeinde-Zuordnungen im Gebiet (${l.length} insgesamt)`);
  for (const q of ["verlinkt", "recherchiert", "vermutet"]) {
    const n = gebiet.filter((r) => r.zuordnung_quelle === q).length;
    log(`  ${q}: ${n}`);
  }

  const proGemeinde = new Map<string, number>();
  for (const r of gebiet) proGemeinde.set(r.commune_id, (proGemeinde.get(r.commune_id) ?? 0) + 1);
  const doppelt = Array.from(proGemeinde.values()).filter((n) => n > 1).length;
  log(`${proGemeinde.size} Gemeinden abgedeckt, davon ${doppelt} bei mehreren Versorgern`);

  const ohneGebiet = u.filter((r) => !gebiet.some((g) => g.utility_id === r.id));
  if (ohneGebiet.length) {
    log(`${ohneGebiet.length} Versorger ohne zugeordnete Gemeinde:`, "err");
    for (const r of ohneGebiet.slice(0, 20)) log(`    ${r.name}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const doSetup = argv.includes("--setup");
  const doStats = argv.includes("--stats");

  if (!doSetup && !doStats) {
    log("Nichts zu tun. Flags: --setup --stats", "err");
    process.exit(1);
  }
  if (doSetup) await setup();
  if (doStats) await stats();
  log("Fertig", "ok");
}

main().catch((err) => {
  log((err as Error).message, "err");
  process.exit(1);
});
