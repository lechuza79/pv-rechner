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
 *   tsx scripts/kommunen-kontakt-refresh.ts --forms --bl=10   # Kontaktlinks (ein BL testen)
 *   tsx scripts/kommunen-kontakt-refresh.ts --forms           # Kontaktlinks (alle Lücken)
 *   tsx scripts/kommunen-kontakt-refresh.ts --probe           # Lücken: Kontakt-Pfade anklopfen
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
import * as unzipper from "unzipper";

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
    -- Outreach-Workflow-Felder (idempotent nachgezogen). status/notes/verified
    -- sind oben schon in der Basistabelle; hier die Kanal-/Zeitstempel-/Entwurfs-
    -- Felder für das Admin-Cockpit. Ein Entwurf je Gemeinde inline (MVP; falls
    -- Versionen nötig werden, später in eine eigene Tabelle auslagern).
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS channel text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS contacted_at timestamptz;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS responded_at timestamptz;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS draft_subject text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS draft_body text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS draft_generated_at timestamptz;
    -- Politische Ausrichtung (Zweitstimmenanteil BTW 2025, je Gemeinde) für die
    -- Outreach-Priorisierung. Misst die Bürger-Wahl, NICHT die Rathaus-Partei.
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS gruene_pct numeric;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS linke_pct numeric;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS spd_pct numeric;
    -- Filter „nach Status" schnell halten (Cockpit-Tabs).
    CREATE INDEX IF NOT EXISTS idx_kk_status ON kommunen_kontakt (outreach_status);
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

// ─── Kontaktformular-Scrape ─────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 12000;
const CONCURRENCY = 5; // parallele Fremd-Hosts — schonend, jeder Host nur 1×

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function deUmlaut(s: string): string {
  return s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

function safeHost(u: string): string {
  try {
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

interface Anchor {
  href: string;
  text: string;
}

function extractAnchors(html: string): Anchor[] {
  const out: Anchor[] = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push({ href: m[1], text: stripTags(m[2]) });
  return out;
}

// Bewertet einen Link daraufhin, wie sehr er nach „Kontaktformular/Kontakt"
// aussieht. Höher = besser. mailto:/tel:/Anker werden verworfen.
function scoreCandidate(href: string, text: string): number {
  if (/^(mailto:|tel:|javascript:|#)/i.test(href.trim())) return 0;
  const h = deUmlaut(href.toLowerCase());
  const t = deUmlaut(text.toLowerCase());
  let score = 0;
  if (/kontakt[-_/ ]?formular/.test(h) || /kontakt[-_/ ]?formular/.test(t)) score = 100;
  else if (/\bkontakt\b/.test(t) || /[-_/]kontakt(\b|[-_/.])/.test(h)) score = 60;
  else if (h.includes("buergerservice") || t.includes("buergerservice")) score = 45;
  else if (/schreiben sie uns|ihre nachricht|nachricht senden|\banliegen\b/.test(t)) score = 45;
  return score;
}

function findKontaktUrl(html: string, baseUrl: string): string | null {
  const baseHost = safeHost(baseUrl);
  let best: { url: string; score: number } | null = null;
  for (const a of extractAnchors(html)) {
    const base = scoreCandidate(a.href, a.text);
    if (base <= 0) continue;
    let abs: string;
    try {
      abs = new URL(a.href, baseUrl).toString();
    } catch {
      continue;
    }
    const score = safeHost(abs) === baseHost ? base : base - 25; // intern bevorzugen
    if (!best || score > best.score) best = { url: abs, score };
  }
  return best && best.score >= 60 ? best.url : null;
}

async function fetchText(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function pool<T>(
  items: T[],
  n: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let idx = 0;
  const runners = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (idx < items.length) await worker(items[idx++]);
  });
  await Promise.all(runners);
}

interface FormsOpts {
  bl?: string;
  limit?: number;
  refetch: boolean;
  dry: boolean;
}

type Candidate = { region_id: string; website: string };
type FoundUrl = { region_id: string; kontakt_url: string; updated_at: string };

// Kandidaten: Website vorhanden; ohne --refetch nur die noch leeren (resumbar).
// Von --forms UND --probe geteilt.
async function readCandidates(
  supabase: Awaited<ReturnType<typeof makeClient>>,
  opts: FormsOpts,
): Promise<Candidate[]> {
  const rows: Candidate[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("kommunen_kontakt")
      .select("region_id, website")
      .not("website", "is", null)
      .order("region_id")
      .range(from, from + PAGE - 1);
    if (!opts.refetch) q = q.is("kontakt_url", null);
    if (opts.bl) q = q.like("region_id", `${opts.bl}%`);
    const { data, error } = await q;
    if (error) throw new Error(`read candidates failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) rows.push(r as Candidate);
    if (data.length < PAGE) break;
  }
  return opts.limit ? rows.slice(0, opts.limit) : rows;
}

// Nur kontakt_url + updated_at → website/email/Workflow-Felder bleiben erhalten.
async function saveKontaktUrls(
  supabase: Awaited<ReturnType<typeof makeClient>>,
  found: FoundUrl[],
  dry: boolean,
): Promise<void> {
  if (dry) {
    found.slice(0, 20).forEach((f) => log(`  ${f.region_id} → ${f.kontakt_url}`));
    log("--dry: nichts geschrieben", "ok");
    return;
  }
  for (let i = 0; i < found.length; i += 500) {
    const batch = found.slice(i, i + 500);
    const { error } = await supabase
      .from("kommunen_kontakt")
      .upsert(batch, { onConflict: "region_id" });
    if (error) throw new Error(`upsert failed (batch ${i}): ${error.message}`);
  }
  log(`kontakt_url gespeichert (${found.length.toLocaleString()} Zeilen)`, "ok");
}

async function scrapeForms(opts: FormsOpts): Promise<void> {
  const supabase = await makeClient();
  const list = await readCandidates(supabase, opts);
  log(`${list.length.toLocaleString()} Gemeinden zu prüfen${opts.bl ? ` (BL-Prefix ${opts.bl})` : ""}...`);

  const now = new Date().toISOString();
  const found: FoundUrl[] = [];
  let done = 0;
  let errors = 0;
  await pool(list, CONCURRENCY, async (c) => {
    const html = await fetchText(c.website);
    done++;
    if (!html) {
      errors++;
    } else {
      const url = findKontaktUrl(html, c.website);
      if (url) found.push({ region_id: c.region_id, kontakt_url: url, updated_at: now });
    }
    if (done % 50 === 0) log(`  ${done}/${list.length} geprüft, ${found.length} gefunden`);
  });

  const rate = list.length ? ((100 * found.length) / list.length).toFixed(1) : "0";
  log(
    `${found.length}/${list.length} Kontaktlinks gefunden (${rate}%), ` +
      `${errors} Seiten nicht erreichbar`,
    "ok",
  );
  await saveKontaktUrls(supabase, found, opts.dry);
}

// ─── Billiger Nachschlag: Kontakt-Pfade direkt anklopfen ─────────────────────
// Fängt Seiten, deren Navigation per JavaScript nachlädt (kein <a> im HTML, das
// der --forms-Scan sieht). Gängige Gemeinde-Pfade in Prioritätsreihenfolge.

const PROBE_PATHS = ["kontakt", "kontaktformular", "rathaus/kontakt", "buergerservice/kontakt"];

async function fetchProbe(url: string): Promise<{ finalUrl: string; html: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    return { finalUrl: res.url, html: await res.text() };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Nur akzeptieren, wenn die (ggf. umgeleitete) End-URL noch "kontakt" trägt UND
// die Seite das Wort enthält — filtert Soft-404s, die still auf die Startseite
// umleiten und sonst als Falschtreffer durchgingen.
function probeAccept(finalUrl: string, html: string): boolean {
  let path = "";
  try {
    path = new URL(finalUrl).pathname.toLowerCase();
  } catch {
    return false;
  }
  return path.includes("kontakt") && /kontakt/i.test(html);
}

async function probeForms(opts: FormsOpts): Promise<void> {
  const supabase = await makeClient();
  const list = await readCandidates(supabase, opts);
  log(`${list.length.toLocaleString()} Lücken anklopfen (${PROBE_PATHS.join(", ")})...`);

  const now = new Date().toISOString();
  const found: FoundUrl[] = [];
  let done = 0;
  await pool(list, CONCURRENCY, async (c) => {
    for (const p of PROBE_PATHS) {
      let target: string;
      try {
        target = new URL(p, c.website).toString();
      } catch {
        continue;
      }
      const r = await fetchProbe(target);
      if (r && probeAccept(r.finalUrl, r.html)) {
        found.push({ region_id: c.region_id, kontakt_url: r.finalUrl, updated_at: now });
        break;
      }
    }
    done++;
    if (done % 50 === 0) log(`  ${done}/${list.length} geklopft, ${found.length} gefunden`);
  });

  const rate = list.length ? ((100 * found.length) / list.length).toFixed(1) : "0";
  log(`${found.length}/${list.length} zusätzliche Kontaktlinks gefunden (${rate}%)`, "ok");
  await saveKontaktUrls(supabase, found, opts.dry);
}

// ─── Politische Ausrichtung (BTW 2025 Zweitstimmen je Gemeinde) ──────────────
// Bundeswahlleiterin, Wahlbezirks-Ergebnisse (~95k Wahlbezirke) → je Gemeinde
// aggregiert. AGS = Land(2)+Regierungsbezirk(1)+Kreis(2)+Gemeinde(3). Misst die
// Bürger-Wahl (Zweitstimme), NICHT die Rathaus-Partei. Quelle amtlich/offen.

const WBZ_ZIP_URL =
  "https://www.bundeswahlleiterin.de/dam/jcr/e79a7bd3-0607-4e87-9752-8e601e299e00/btw25_wbz.zip";
const WBZ_ZIP = resolve(CACHE_DIR, "btw25_wbz.zip");
const WBZ_ENTRY = "btw25_wbz_ergebnisse.csv";

interface WahlRow {
  region_id: string;
  gruene_pct: number;
  linke_pct: number;
  spd_pct: number;
}

function padNum(s: string, n: number): string {
  return (s ?? "").padStart(n, "0").slice(-n);
}

async function ensureWahlZip(): Promise<void> {
  if (existsSync(WBZ_ZIP)) {
    log(`Wahl-ZIP im Cache: ${WBZ_ZIP}`);
    return;
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  log("Lade Wahlbezirks-Ergebnisse (Bundeswahlleiterin, ~6 MB)...");
  const res = await fetch(WBZ_ZIP_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(WBZ_ZIP, buf);
  log(`ZIP gespeichert (${(buf.length / 1e6).toFixed(1)} MB)`, "ok");
}

async function parseWahl(): Promise<WahlRow[]> {
  await ensureWahlZip();
  const dir = await unzipper.Open.file(WBZ_ZIP);
  const entry = dir.files.find((f) => f.path === WBZ_ENTRY);
  if (!entry) throw new Error(`Eintrag ${WBZ_ENTRY} nicht im ZIP`);
  const csv = (await entry.buffer()).toString("utf8");

  const lines = csv.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.replace(/^﻿/, "").startsWith("Wahlkreis;"));
  if (headerIdx < 0) throw new Error("Header-Zeile nicht gefunden");
  const H = lines[headerIdx].replace(/^﻿/, "").split(";");
  const col = (name: string): number => {
    const i = H.indexOf(name);
    if (i < 0) throw new Error(`Spalte fehlt: ${name}`);
    return i;
  };
  const iLand = col("Land");
  const iRB = col("Regierungsbezirk");
  const iKreis = col("Kreis");
  const iGem = col("Gemeinde");
  const iGueltig = col("Gültige - Zweitstimmen");
  const iGruene = col("GRÜNE - Zweitstimmen");
  const iLinke = col("Die Linke - Zweitstimmen");
  const iSpd = col("SPD - Zweitstimmen");

  const agg = new Map<string, { g: number; l: number; s: number; v: number }>();
  let wbz = 0;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const c = lines[i].split(";");
    if (c.length <= iGueltig || !c[iLand]) continue;
    wbz++;
    const ags = padNum(c[iLand], 2) + padNum(c[iRB], 1) + padNum(c[iKreis], 2) + padNum(c[iGem], 3);
    const cur = agg.get(ags) ?? { g: 0, l: 0, s: 0, v: 0 };
    cur.g += Number(c[iGruene]) || 0;
    cur.l += Number(c[iLinke]) || 0;
    cur.s += Number(c[iSpd]) || 0;
    cur.v += Number(c[iGueltig]) || 0;
    agg.set(ags, cur);
  }

  const rows: WahlRow[] = [];
  agg.forEach((t, region_id) => {
    if (t.v <= 0) return;
    rows.push({
      region_id,
      gruene_pct: Math.round((1000 * t.g) / t.v) / 10,
      linke_pct: Math.round((1000 * t.l) / t.v) / 10,
      spd_pct: Math.round((1000 * t.s) / t.v) / 10,
    });
  });
  log(`${rows.length.toLocaleString()} Gemeinden aggregiert (aus ${wbz.toLocaleString()} Wahlbezirken)`, "ok");
  return rows;
}

async function uploadWahl(dry: boolean): Promise<void> {
  const rows = await parseWahl();
  const supabase = await makeClient();
  const valid = await validGemeindeIds(supabase);
  const payload = rows.filter((r) => valid.has(r.region_id));
  log(
    `${payload.length.toLocaleString()} Zeilen zum Upsert ` +
      `(${(rows.length - payload.length).toLocaleString()} verworfen: kein Gemeinde-AGS)`,
  );

  if (dry) {
    const top = [...payload].sort((a, b) => b.gruene_pct - a.gruene_pct).slice(0, 12);
    const { data } = await supabase
      .from("mastr_regions")
      .select("region_id, name")
      .in("region_id", top.map((r) => r.region_id));
    const nm = new Map((data ?? []).map((r) => [(r as { region_id: string }).region_id, (r as { name: string }).name]));
    log("Top 12 nach Grünen-Anteil:");
    top.forEach((r) =>
      log(`  ${(nm.get(r.region_id) ?? r.region_id).padEnd(24)} Grüne ${r.gruene_pct}% · Linke ${r.linke_pct}% · SPD ${r.spd_pct}%`),
    );
    log("--dry: nichts geschrieben", "ok");
    return;
  }

  const now = new Date().toISOString();
  for (let i = 0; i < payload.length; i += 500) {
    const batch = payload.slice(i, i + 500).map((r) => ({ ...r, updated_at: now }));
    const { error } = await supabase.from("kommunen_kontakt").upsert(batch, { onConflict: "region_id" });
    if (error) throw new Error(`upsert failed (batch ${i}): ${error.message}`);
  }
  log(`Politik-Anteile gespeichert (${payload.length.toLocaleString()} Zeilen)`, "ok");
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
  const doForms = argv.includes("--forms");
  const doProbe = argv.includes("--probe");
  const doWahl = argv.includes("--wahl");
  const doStats = argv.includes("--stats");

  const blArg = argv.find((a) => a.startsWith("--bl="));
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  const formsOpts: FormsOpts = {
    bl: blArg?.slice(5),
    limit: limitArg ? parseInt(limitArg.slice(8), 10) : undefined,
    refetch: argv.includes("--refetch"),
    dry,
  };

  if (!doSetup && !doWikidata && !doUpload && !doForms && !doProbe && !doWahl && !doStats) {
    log(
      "Nichts zu tun. Flags: --setup --wikidata --upload --forms --probe --wahl --stats [--dry]\n" +
        "  --forms [--bl=10] [--limit=N] [--refetch]  Kontaktlink aus der Startseite\n" +
        "  --probe [--bl=10] [--limit=N]              Kontakt-Pfade direkt anklopfen (Lücken)\n" +
        "  --wahl [--dry]                             Grünen/Linke/SPD-Anteil je Gemeinde (BTW 2025)",
      "err",
    );
    process.exit(1);
  }

  if (doSetup) await setup();
  if (doWikidata) writeCache(await fetchWikidata());
  if (doUpload) await upload(dry);
  if (doForms) await scrapeForms(formsOpts);
  if (doProbe) await probeForms(formsOpts);
  if (doWahl) await uploadWahl(dry);
  if (doStats) await stats();
  log("Fertig", "ok");
}

main().catch((err) => {
  log((err as Error).message, "err");
  process.exit(1);
});
