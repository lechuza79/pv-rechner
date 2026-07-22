/**
 * Kommunen-Kontaktdaten → kommunen_kontakt.
 *
 * Reichert die ~10.700 Gemeinden aus `mastr_regions` (Schlüssel = 8-stelliger
 * AGS) um Kontaktdaten für Outreach an. Erste Quelle: Wikidata (offizielle
 * Website + ggf. E-Mail je Gemeinde, per AGS). Das ist der Grundstock; die
 * Anreicherung um Kontaktformular-URL / Rollen-Postfach aus dem Impressum ist
 * eine spätere Phase (--scrape, noch nicht implementiert).
 *
 * Arbeitsteilung:
 *   - mastr_regions besitzt die Gemeinde-Identität (Name, AGS, Einwohner).
 *   - Dieses Script besitzt NUR die von der Quelle gelieferten Felder
 *     (website, email). Die Outreach-Workflow-Felder (outreach_status, notes,
 *     verified, kontakt_url) werden NIE überschrieben — sie gehören dem Menschen.
 *
 * Nutzung:
 *   tsx scripts/kommunen-kontakt-refresh.ts --setup      # Tabelle anlegen (idempotent)
 *   tsx scripts/kommunen-kontakt-refresh.ts --wikidata   # Wikidata abrufen + cachen + Deckung melden
 *   tsx scripts/kommunen-kontakt-refresh.ts --upload      # Cache → Supabase (500er-Batches)
 *   tsx scripts/kommunen-kontakt-refresh.ts --wikidata --upload
 *   tsx scripts/kommunen-kontakt-refresh.ts --stats       # Deckung aus der DB
 *   ... --upload --dry                                     # nichts schreiben
 *
 * Voraussetzungen (für --setup/--upload/--stats): SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   aus .env.local. Wikidata-Abruf braucht keine Credentials.
 *
 * Datenquelle: Wikidata (CC0), Property P439 (Gemeindeschlüssel/AGS),
 *   P856 (offizielle Website), P968 (E-Mail). WDQS verlangt einen sprechenden
 *   User-Agent — schonend: EINE Sammelabfrage, nicht pro Gemeinde.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(SCRIPT_DIR, ".cache", "kommunen");
const CACHE_FILE = resolve(CACHE_DIR, "wikidata.json");

const WDQS_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT =
  "solar-check.io kommunen-kontakt/1.0 (https://solar-check.io; hey@solar-check.io)";

// ─── Typen ──────────────────────────────────────────────────────────────────

interface KontaktRow {
  region_id: string; // 8-stelliger AGS
  website: string | null;
  email: string | null;
}

// ─── Log ────────────────────────────────────────────────────────────────────

function log(msg: string, level: "info" | "ok" | "err" = "info"): void {
  const prefix = level === "ok" ? "✓ " : level === "err" ? "✗ " : "  ";
  // eslint-disable-next-line no-console
  console.log(prefix + msg);
}

// ─── Env ──────────────────────────────────────────────────────────────────────

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

// ─── Wikidata ─────────────────────────────────────────────────────────────────

// Gemeinden mit Gemeindeschlüssel (P439); optional offizielle Website (P856)
// und E-Mail (P968). Eine Abfrage für alle ~11k Statements.
const SPARQL = `
SELECT ?ags ?website ?email WHERE {
  ?item wdt:P439 ?ags .
  OPTIONAL { ?item wdt:P856 ?website . }
  OPTIONAL { ?item wdt:P968 ?email . }
}
`;

interface WdBinding {
  ags?: { value: string };
  website?: { value: string };
  email?: { value: string };
}

function normalizeEmail(raw: string | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/^mailto:/i, "").trim() || null;
}

async function fetchWikidata(): Promise<KontaktRow[]> {
  log("Fetching Wikidata (P439/P856/P968) — eine Sammelabfrage...");
  const params = new URLSearchParams({ query: SPARQL, format: "json" });
  const res = await fetch(`${WDQS_ENDPOINT}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/sparql-results+json" },
  });
  if (!res.ok) throw new Error(`WDQS HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { results: { bindings: WdBinding[] } };
  const bindings = json.results.bindings;
  log(`  ${bindings.length.toLocaleString()} Statements erhalten`);

  // Ein AGS kann mehrfach auftauchen (mehrere Websites/E-Mails). Ersten
  // nicht-leeren Wert je Feld behalten, nur saubere 8-stellige AGS.
  const byAgs = new Map<string, KontaktRow>();
  for (const b of bindings) {
    const ags = b.ags?.value?.trim();
    if (!ags || !/^\d{8}$/.test(ags)) continue;
    const existing = byAgs.get(ags) ?? { region_id: ags, website: null, email: null };
    if (!existing.website && b.website?.value) existing.website = b.website.value.trim();
    if (!existing.email) {
      const em = normalizeEmail(b.email?.value);
      if (em) existing.email = em;
    }
    byAgs.set(ags, existing);
  }
  const rows = Array.from(byAgs.values());
  const withSite = rows.filter((r) => r.website).length;
  const withMail = rows.filter((r) => r.email).length;
  log(
    `  ${rows.length.toLocaleString()} eindeutige AGS · ` +
      `${withSite.toLocaleString()} mit Website · ${withMail.toLocaleString()} mit E-Mail`,
    "ok",
  );
  return rows;
}

function writeCache(rows: KontaktRow[]): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(rows, null, 0), "utf8");
  log(`Cache geschrieben: ${CACHE_FILE}`, "ok");
}

function readCache(): KontaktRow[] {
  if (!existsSync(CACHE_FILE)) {
    throw new Error(`Kein Cache (${CACHE_FILE}) — erst mit --wikidata abrufen.`);
  }
  return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as KontaktRow[];
}

// ─── Setup ────────────────────────────────────────────────────────────────────

async function setup(): Promise<void> {
  const supabase = await makeClient();
  // Interne Outreach-Tabelle. BEWUSSTE Abweichung vom Atlas-Muster: KEIN
  // anon-Read — Kontakt-/Outreach-Daten dürfen nicht öffentlich abfragbar sein.
  // RLS an + nur service_role → öffentlicher Zugriff läuft ins Leere (default deny).
  const sql = `
    CREATE TABLE IF NOT EXISTS kommunen_kontakt (
      region_id text PRIMARY KEY REFERENCES mastr_regions(region_id),
      website text,
      email text,
      kontakt_url text,
      source text,
      verified boolean NOT NULL DEFAULT false,
      outreach_status text NOT NULL DEFAULT 'offen',
      notes text,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE kommunen_kontakt ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'kommunen_kontakt' AND policyname = 'kommunen_kontakt_service_all'
      ) THEN
        CREATE POLICY kommunen_kontakt_service_all ON kommunen_kontakt
          FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `;
  const { error } = await supabase.rpc("exec_sql", { sql });
  if (error) throw new Error(`setup failed: ${error.message}`);
  log("kommunen_kontakt angelegt (RLS an, nur service_role)", "ok");
}

// ─── Upload ───────────────────────────────────────────────────────────────────

async function validGemeindeIds(
  supabase: Awaited<ReturnType<typeof makeClient>>,
): Promise<Set<string>> {
  // Alle 8-stelligen Gemeinde-AGS (der FK-Zielraum). Paginiert (Supabase
  // deckelt bei 1000 Zeilen/Request), damit kein Voll-Scan die DB belastet.
  const ids = new Set<string>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("mastr_regions")
      .select("region_id")
      .eq("level", "gemeinde")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`read region ids failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) ids.add((r as { region_id: string }).region_id);
    if (data.length < PAGE) break;
  }
  return ids;
}

async function upload(dry: boolean): Promise<void> {
  const rows = readCache();
  const supabase = await makeClient();

  const valid = await validGemeindeIds(supabase);
  log(`${valid.size.toLocaleString()} Gemeinden in mastr_regions (FK-Zielraum)`);

  // Nur Zeilen behalten, deren AGS wirklich eine Gemeinde ist (sonst FK-Fehler
  // — Wikidata trägt P439 auch an aufgelösten/zusammengelegten Einheiten).
  const now = new Date().toISOString();
  const payload = rows
    .filter((r) => valid.has(r.region_id))
    .map((r) => ({
      region_id: r.region_id,
      website: r.website,
      email: r.email,
      source: "wikidata",
      updated_at: now,
    }));
  const dropped = rows.length - payload.length;
  log(
    `${payload.length.toLocaleString()} Zeilen zum Upsert ` +
      `(${dropped.toLocaleString()} verworfen: kein Gemeinde-AGS)`,
  );

  if (dry) {
    log(`--dry: nichts geschrieben`, "ok");
    return;
  }

  // Upsert überschreibt bewusst nur website/email/source/updated_at. Die
  // Workflow-Felder (outreach_status, notes, verified, kontakt_url) stehen nicht
  // im Payload und bleiben bei Wiederholläufen erhalten.
  for (let i = 0; i < payload.length; i += 500) {
    const batch = payload.slice(i, i + 500);
    const { error } = await supabase
      .from("kommunen_kontakt")
      .upsert(batch, { onConflict: "region_id" });
    if (error) throw new Error(`upsert failed (batch ${i}): ${error.message}`);
  }
  log(`kommunen_kontakt aktualisiert (${payload.length.toLocaleString()} Zeilen)`, "ok");
}

// ─── Stats ────────────────────────────────────────────────────────────────────

async function stats(): Promise<void> {
  const supabase = await makeClient();
  const count = async (col?: string): Promise<number> => {
    let q = supabase.from("kommunen_kontakt").select("*", { count: "exact", head: true });
    if (col) q = q.not(col, "is", null);
    const { count: c, error } = await q;
    if (error) throw new Error(`count failed: ${error.message}`);
    return c ?? 0;
  };
  const total = await count();
  const withSite = await count("website");
  const withMail = await count("email");
  const withForm = await count("kontakt_url");
  const pct = (n: number) => (total ? ((100 * n) / total).toFixed(1) : "0") + "%";
  log(`kommunen_kontakt: ${total.toLocaleString()} Zeilen`, "ok");
  log(`  Website:          ${withSite.toLocaleString()} (${pct(withSite)})`);
  log(`  E-Mail:           ${withMail.toLocaleString()} (${pct(withMail)})`);
  log(`  Kontaktformular:  ${withForm.toLocaleString()} (${pct(withForm)})`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dry = argv.includes("--dry");
  const doSetup = argv.includes("--setup");
  const doWikidata = argv.includes("--wikidata");
  const doUpload = argv.includes("--upload");
  const doStats = argv.includes("--stats");

  if (!doSetup && !doWikidata && !doUpload && !doStats) {
    log("Nichts zu tun. Flags: --setup --wikidata --upload --stats [--dry]", "err");
    process.exit(1);
  }

  if (doSetup) await setup();
  if (doWikidata) writeCache(await fetchWikidata());
  if (doUpload) await upload(dry);
  if (doStats) await stats();
  log("Fertig", "ok");
}

main().catch((err) => {
  log((err as Error).message, "err");
  process.exit(1);
});
