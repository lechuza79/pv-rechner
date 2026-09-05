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
import type { PresseQuelle } from "../lib/kommunen-presse";

/** Auf einen Versand-Schub eingrenzen (`--schub=mail-nrw`), sonst alle. */
const schubArg = process.argv.slice(2).find((a) => a.startsWith("--schub="))?.slice(8);

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
    -- Wurde der Entwurf von Hand bearbeitet? Nur dann darf er einen frisch
    -- erzeugten ueberleben. Ohne diesen Merker zeigte das Modal wochenalte
    -- Entwuerfe an, obwohl die Vorlage laengst korrigiert war.
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS draft_manuell boolean NOT NULL DEFAULT false;
    -- Politische Ausrichtung (Zweitstimmenanteil BTW 2025, je Gemeinde) für die
    -- Outreach-Priorisierung. Misst die Bürger-Wahl, NICHT die Rathaus-Partei.
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS gruene_pct numeric;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS linke_pct numeric;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS spd_pct numeric;
    -- Rang der Dach-Leistung pro Kopf (park-immun) für den Betreff-Catcher +
    -- späteren Award. Perzentil bundesweit + Rang im Landkreis (5-stelliger AGS).
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS dach_perzentil integer;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS dach_rang_kreis integer;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS kreis_gemeinden integer;
    -- Website-Profil (Phase --profil): wer ist ansprechbar, welcher Aufhänger
    -- passt, und wird die Gemeinde von einer anderen Stelle mitverwaltet.
    -- verantwortlich_operativ trennt die Person, die die Website wirklich pflegt,
    -- von der bloß gesetzlichen Vertretung (bei kleinen Gemeinden der
    -- Bürgermeister — der steht dort, betreut die Seite aber meist nicht).
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS impressum_url text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS verantwortlich_zeile text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS verantwortlich_funktion text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS verantwortlich_operativ boolean NOT NULL DEFAULT false;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS rollen_email text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS personen_email text;
    -- Fremde Kommunal-Domain im Impressum = BELEG für eine gemeinsame Verwaltung
    -- (nicht geraten wie bei der Domain-Heuristik, sondern dort benannt).
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS verwaltung_domain text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS thema_solar_url text;
    -- KANDIDAT, kein Programm: hier steht irgendwo etwas von Förderung. Ob es
    -- eines gibt, entscheidet die Pruefung nach scripts/foerder-verify.md.
    -- Nie automatisch nach funding_programs uebernehmen.
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS thema_foerderung_url text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS thema_klima_url text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS thema_blatt_url text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS thema_presse_url text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS profil_at timestamptz;
    -- WOHER das Postfach stammt. Nachtraeglich ergaenzt, deshalb nullable: die
    -- vorhandenen Zeilen kommen ausnahmslos aus dem Impressum, und ein
    -- Vorgabewert haette ueber jede Altzeile eine Herkunft behauptet, die
    -- niemand erhoben hat (dieselbe Fehlerklasse wie ein erfundenes Pruefdatum).
    --   impressum    im Impressum der eigenen Website gefunden
    --   kontaktseite auf der Kontaktseite gefunden
    --   verwaltung   Postfach der Gemeinde, die diese Gemeinde mitverwaltet
    -- Die dritte Herkunft ist die einzige, bei der wir NICHT an die Gemeinde
    -- selbst schreiben — das muss ablesbar bleiben, ohne die Adresse zu deuten.
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS rollen_email_quelle text;
    -- Wann zuletzt nach einem Postfach gesucht wurde, auch erfolglos. Ohne
    -- dieses Datum ist "nichts gefunden" nicht von "noch nie gesucht" zu
    -- unterscheiden, und der naechste Lauf beginnt wieder bei denselben.
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS luecke_at timestamptz;
    -- PRESSEPOSTFACH, getrennt vom allgemeinen. Der Brief bietet eine fertige
    -- Meldung an; er gehoert an die Stelle, die Meldungen veroeffentlicht.
    -- Gemessen am 03.09.2026: Von den 20 groessten Staedten des offenen
    -- NRW-Schubs fuehren mindestens 7 ein Pressepostfach, und wir schrieben bei
    -- 6 davon an info@ oder stadt@.
    --
    -- EIGENE SPALTE, kein Ueberschreiben: Eine falsch erhobene Presseadresse
    -- duerfte sonst die einzige bekannte Adresse zerstoeren, und die Herkunft
    -- der beiden Angaben ist verschieden.
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS presse_email text;
    --   presseseite   auf einer Presse-/Medienseite gefunden
    --   kontaktseite  auf der Kontaktseite gefunden
    --   impressum     im Impressum gefunden
    --   suche         ueber die Volltextsuche der eigenen Website gefunden
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS presse_email_quelle text;
    -- Wann zuletzt gesucht wurde, auch erfolglos — dieselbe Begruendung wie
    -- bei luecke_at: sonst ist "nichts gefunden" nicht von "nie gesucht" zu
    -- unterscheiden.
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS presse_at timestamptz;
    -- Der Textausschnitt, der eine MEHRDEUTIGE Adresse traegt (medien@,
    -- kommunikation@). Eindeutige Adressen brauchen ihn nicht und lassen ihn
    -- leer — ein Beleg, den niemand geprueft hat, waere schlechter als keiner.
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS presse_beleg text;
    -- Versandliste: die Auswahl wird FESTGESCHRIEBEN, nicht nur gefiltert. Der
    -- Aufhaenger aendert sich mit jedem Monatslauf der Anlagendaten — ein reiner
    -- Filter haette in Charge 2 andere Gemeinden als in Charge 1.
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS kampagne text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS charge integer;
    -- Verbund: Gemeinden, die sich eine Verwaltung teilen. Schluessel ist die im
    -- Impressum belegte fremde Domain, sonst der eigene Website-Host. Nie zwei
    -- aus einem Verbund in derselben Charge.
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS verbund_key text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS verbund_primary boolean;
    CREATE INDEX IF NOT EXISTS idx_kk_kampagne ON kommunen_kontakt (kampagne, charge);
    -- Ask-Variante: nur_meldung (fertige Meldung) oder meldung_plus_widget.
    -- variante_manuell schuetzt eine Aenderung im Admin vor dem naechsten Lauf.
    -- versendet_variante friert die Variante zum Versandzeitpunkt ein — wer
    -- spaeter umsortiert, darf die Auswertung nicht rueckwirkend kippen.
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS ask_variante text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS variante_manuell boolean NOT NULL DEFAULT false;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS versendet_variante text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS widget_anfrage boolean NOT NULL DEFAULT false;
    -- Klickzaehlung: kurzer Weiterleitungs-Token je Gemeinde. Kein Personenbezug,
    -- keine IP, kein Cookie — nur „wie oft wurde dieser Link geoeffnet".
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS ref_token text;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS ref_klicks integer NOT NULL DEFAULT 0;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS ref_erst_at timestamptz;
    ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS ref_letzt_at timestamptz;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_kk_ref_token ON kommunen_kontakt (ref_token) WHERE ref_token IS NOT NULL;
    -- Atomar zaehlen: zwei gleichzeitige Klicks duerfen sich nicht ueberschreiben.
    CREATE OR REPLACE FUNCTION kommunen_ref_hit(p_token text)
      RETURNS TABLE(region_id text) LANGUAGE sql AS $fn$
      UPDATE kommunen_kontakt
         SET ref_klicks = ref_klicks + 1,
             ref_erst_at = COALESCE(ref_erst_at, now()),
             ref_letzt_at = now()
       WHERE ref_token = p_token
      RETURNING kommunen_kontakt.region_id;
    $fn$;
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

// ─── Rang Dach-Leistung pro Kopf (Betreff-Catcher + Award-Fundament) ─────────
// Park-immun (nur Dach), aus dem Rollup mastr_gemeinde_solar. Perzentil bundesweit
// (unter allen bewohnten Gemeinden) + Rang im Landkreis. Kein GROUP BY auf der
// großen Tabelle — der Rollup hat je Gemeinde schon eine Zeile.

interface RangRow {
  region_id: string;
  dach_perzentil: number;
  dach_rang_kreis: number;
  kreis_gemeinden: number;
}

async function uploadRang(dry: boolean): Promise<void> {
  const supabase = await makeClient();

  const gs: { region_id: string; population: number | null; kwp_dach: number | null }[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("mastr_gemeinde_solar")
      .select("region_id, population, kwp_dach")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`read gemeinde_solar failed: ${error.message}`);
    if (!data || data.length === 0) break;
    gs.push(...(data as typeof gs));
    if (data.length < PAGE) break;
  }

  // Dach-Wp pro Kopf je Gemeinde (nur mit Einwohnern).
  const wpk = new Map<string, number>();
  for (const g of gs) {
    if (g.population && g.population > 0) {
      wpk.set(g.region_id, ((g.kwp_dach ?? 0) * 1000) / g.population);
    }
  }

  // Bundesweites Perzentil (aufsteigend sortiert → höchster Wert = 100).
  const sorted = Array.from(wpk.entries()).sort((a, b) => a[1] - b[1]);
  const n = sorted.length;
  const perzentil = new Map<string, number>();
  sorted.forEach(([id], i) => perzentil.set(id, n > 1 ? Math.round((100 * i) / (n - 1)) : 100));

  // Rang im Landkreis (5-stelliger AGS), 1 = höchste Dach-Leistung pro Kopf.
  const byKreis = new Map<string, string[]>();
  wpk.forEach((_v, id) => {
    const k = id.slice(0, 5);
    let arr = byKreis.get(k);
    if (!arr) {
      arr = [];
      byKreis.set(k, arr);
    }
    arr.push(id);
  });
  const rangKreis = new Map<string, number>();
  const kreisSize = new Map<string, number>();
  byKreis.forEach((ids) => {
    ids.sort((a, b) => (wpk.get(b) ?? 0) - (wpk.get(a) ?? 0));
    ids.forEach((id, i) => {
      rangKreis.set(id, i + 1);
      kreisSize.set(id, ids.length);
    });
  });

  const rows: RangRow[] = [];
  wpk.forEach((_v, region_id) => {
    rows.push({
      region_id,
      dach_perzentil: perzentil.get(region_id) ?? 0,
      dach_rang_kreis: rangKreis.get(region_id) ?? 0,
      kreis_gemeinden: kreisSize.get(region_id) ?? 0,
    });
  });
  log(`${rows.length.toLocaleString()} Gemeinden mit Rang berechnet`, "ok");

  if (dry) {
    const valid = await validGemeindeIds(supabase);
    const top = rows.filter((r) => valid.has(r.region_id)).sort((a, b) => b.dach_perzentil - a.dach_perzentil).slice(0, 8);
    const { data } = await supabase.from("mastr_regions").select("region_id, name").in("region_id", top.map((r) => r.region_id));
    const nm = new Map((data ?? []).map((r) => [(r as { region_id: string }).region_id, (r as { name: string }).name]));
    top.forEach((r) =>
      log(`  ${(nm.get(r.region_id) ?? r.region_id).padEnd(22)} Perzentil ${r.dach_perzentil} · Kreis-Rang ${r.dach_rang_kreis}/${r.kreis_gemeinden}`),
    );
    log("--dry: nichts geschrieben", "ok");
    return;
  }

  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500).map((r) => ({ ...r, updated_at: now }));
    const { error } = await supabase.from("kommunen_kontakt").upsert(batch, { onConflict: "region_id" });
    if (error) throw new Error(`upsert failed (batch ${i}): ${error.message}`);
  }
  log(`Rang gespeichert (${rows.length.toLocaleString()} Zeilen)`, "ok");
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

// ─── Profil: Verantwortliche, Rollen-Postfach, Themen-Aufhänger ──────────────
//
// Zwei Abrufe je Gemeinde (Startseite + Impressum). Gemessen an ~90 Gemeinden in
// BW/BY am 27.07.2026 — die Reihenfolge der Quellen ist das Ergebnis dieser
// Messung, nicht eine Vermutung:
//
//   Impressum   ist praktisch immer da (gesetzlich) und NIE per JavaScript
//               versteckt (20/22 abrufbar). Liefert Verantwortliche mit Funktion,
//               ein Rollen-Postfach und — der wertvollste Nebenfund — die
//               gemeinsame Verwaltung namentlich (Witzmannsberg → vg-tittling.de).
//   Navigation  liefert die Themen-Aufhänger. Die Kontaktseite bringt dazu NICHTS
//               (0 % über alle Begriffe), weil die Wörter im Menü stehen und das
//               auf jeder Unterseite gleich ist. Deshalb reicht die Startseite.
//   Mitarbeiter-
//   verzeichnis liefert die operative Person, ist aber JavaScript-gerendert und
//               braucht pro Website eigene Klicks — bewusst NICHT hier drin.
//
// Wichtig für die Erwartung: Bei kleinen Gemeinden steht die operative Person
// NIRGENDS öffentlich (von 21 geprüften nannte genau eine jemand anderen als den
// Bürgermeister). Das Ergebnis ist dort „Rathaus + Bitte um Weiterleitung", und
// das ist kein Mangel der Erhebung, sondern die Faktenlage.

type ProfilRow = {
  region_id: string;
  impressum_url: string | null;
  verantwortlich_zeile: string | null;
  verantwortlich_funktion: string | null;
  verantwortlich_operativ: boolean;
  rollen_email: string | null;
  personen_email: string | null;
  verwaltung_domain: string | null;
  thema_solar_url: string | null;
  thema_foerderung_url: string | null;
  thema_klima_url: string | null;
  thema_blatt_url: string | null;
  thema_presse_url: string | null;
  profil_at: string;
};

async function scrapeProfil(opts: FormsOpts): Promise<void> {
  const {
    findImpressumUrl,
    toText,
    domainOf,
    extractVerantwortlich,
    extractAdressen,
    extractThemen,
  } = await import("../lib/kommunen-profil.js");

  const supabase = await makeClient();
  const list = await readCandidates(supabase, { ...opts, refetch: true });
  // Alle bekannten Gemeinde-Domains: nur damit lässt sich eine fremde Adresse im
  // Impressum als „andere Kommune verwaltet uns mit" erkennen statt als Agentur.
  // BUNDESWEIT laden, nicht nur den aktuellen Durchlauf — eine Verwaltungs-
  // gemeinschaft reicht über Kreis- und Landesgrenzen, und bei einem Lauf mit
  // --bl oder --limit wäre der Partner sonst nicht im Vergleich und der Beleg
  // ginge still verloren.
  const domains = new Set<string>();
  for (const c of await readCandidates(supabase, { refetch: true, dry: true })) {
    const d = domainOf(c.website);
    if (d) domains.add(d);
  }
  log(`${list.length.toLocaleString()} Gemeinden, ${domains.size.toLocaleString()} bekannte Domains als Vergleich`);

  const now = new Date().toISOString();
  const rows: ProfilRow[] = [];
  let done = 0;
  let ohneImpressum = 0;

  await pool(list, CONCURRENCY, async (c) => {
    done++;
    const start = await fetchText(c.website);
    if (!start) return;
    const eigene = domainOf(c.website);
    const themen = extractThemen(start, c.website);
    const impUrl = findImpressumUrl(start, c.website);

    let verantwortlich = null as ReturnType<typeof extractVerantwortlich>;
    let adressen = { rollenEmail: null as string | null, personenEmail: null as string | null, verwaltungDomain: null as string | null };
    if (impUrl) {
      const imp = await fetchText(impUrl);
      if (imp) {
        const text = toText(imp);
        verantwortlich = extractVerantwortlich(text);
        adressen = extractAdressen(text, eigene, (d) => d !== eigene && domains.has(d));
      } else ohneImpressum++;
    } else ohneImpressum++;

    const url = (t: string) => themen.find((x) => x.thema === t)?.url ?? null;
    rows.push({
      region_id: c.region_id,
      impressum_url: impUrl,
      verantwortlich_zeile: verantwortlich?.zeile ?? null,
      verantwortlich_funktion: verantwortlich?.funktion ?? null,
      verantwortlich_operativ: verantwortlich?.operativ ?? false,
      rollen_email: adressen.rollenEmail,
      personen_email: adressen.personenEmail,
      verwaltung_domain: adressen.verwaltungDomain,
      thema_solar_url: url("solar"),
      thema_foerderung_url: url("foerderung"),
      thema_klima_url: url("klima"),
      thema_blatt_url: url("blatt"),
      thema_presse_url: url("presse"),
      profil_at: now,
    });
    if (done % 25 === 0) log(`  ${done}/${list.length} geprüft`);
  });

  const zahl = (f: (r: ProfilRow) => unknown) => rows.filter((r) => f(r)).length;
  const q = (n: number) => (rows.length ? `${((100 * n) / rows.length).toFixed(0)} %` : "–");
  const operativ = zahl((r) => r.verantwortlich_operativ);
  log(
    `Profil für ${rows.length}/${list.length} Gemeinden (${ohneImpressum} ohne erreichbares Impressum)\n` +
      `  Verantwortliche benannt: ${zahl((r) => r.verantwortlich_zeile)} (${q(zahl((r) => r.verantwortlich_zeile))}), davon operative Stelle: ${operativ}\n` +
      `  Rollen-Postfach: ${zahl((r) => r.rollen_email)} (${q(zahl((r) => r.rollen_email))}) · Personen-Adresse: ${zahl((r) => r.personen_email)}\n` +
      `  Gemeinsame Verwaltung belegt: ${zahl((r) => r.verwaltung_domain)}\n` +
      `  Aufhänger — Solar: ${zahl((r) => r.thema_solar_url)} · Förder-Kandidat: ${zahl((r) => r.thema_foerderung_url)} · Klima: ${zahl((r) => r.thema_klima_url)} · Blatt: ${zahl((r) => r.thema_blatt_url)} · Presse: ${zahl((r) => r.thema_presse_url)}`,
    "ok",
  );

  if (opts.dry) {
    for (const r of rows.slice(0, 15)) {
      log(`  ${r.region_id} ${r.rollen_email ?? "—"} | ${r.verantwortlich_funktion ?? "—"} | ${r.verwaltung_domain ?? ""}`);
    }
    log("--dry: nichts geschrieben", "ok");
    return;
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("kommunen_kontakt").upsert(rows.slice(i, i + 500), { onConflict: "region_id" });
    if (error) throw new Error(`Profil speichern: ${error.message}`);
  }
  log(`${rows.length} Profile gespeichert`, "ok");
}

// ─── Die Kontaktlücke schließen ──────────────────────────────────────────────
//
// GEMESSEN am 01.09.2026: 10.980 Gemeinden haben eine Website, 7.448 davon
// tragen bei uns kein Rollen-Postfach. Für den nächsten Versandschub bedeutete
// das konkret: von 399 in Frage kommenden Gemeinden fielen 300 aus, weil wir
// keine Adresse haben. Nicht der Kalender bremst den Ausbau, sondern das hier.
//
// Der Profil-Lauf liest ausschließlich das IMPRESSUM. Das war die richtige
// erste Quelle (gesetzlich vorgeschrieben, nie per JavaScript versteckt), aber
// es ist nicht die einzige. Drei Ursachen, alle an einer Stichprobe von 25
// Gemeinden ohne erfasstes Postfach belegt:
//
//   1. Die Adresse steht auf der KONTAKTSEITE statt im Impressum. Das ist der
//      große Posten: 5.051 der Lücken-Gemeinden haben eine bekannte
//      Kontaktseite, die noch nie auf Adressen hin gelesen wurde. Dazu 1.555,
//      bei denen gar kein Impressum auffindbar war — dort ist die Kontaktseite
//      der einzige verbleibende Weg.
//   2. Die Adresse ist VERSCHLEIERT („rathaus⚹huerth◦de"). Behoben in
//      lib/kommunen-profil.ts, wirkt für beide Quellen.
//   3. Die Gemeinde wird MITVERWALTET, und das Postfach gehört der
//      verwaltenden Gemeinde. Der kleinste der drei Posten (289 Fälle), aber
//      der billigste: die Verwaltung ist bereits belegt, bei 167 davon haben
//      wir deren Postfach schon.
//
// WAS DIESER LAUF NICHT TUT: raten. Eine Adresse auf einer fremden Domain, die
// nicht zur Grundgesamtheit der Kommunen gehört, ist der Dienstleister der
// Website und wird verworfen — dieselbe Regel wie im Profil-Lauf, und sie hat
// dort schon zwei Agenturadressen abgefangen. Lieber keine Adresse als eine
// falsche: eine falsche geht in den Versand und kommt zurück.

type LueckeRow = {
  region_id: string;
  rollen_email: string;
  rollen_email_quelle: string;
  luecke_at: string;
};

type LueckeKandidat = {
  region_id: string;
  website: string;
  kontakt_url: string | null;
  verwaltung_domain: string | null;
};

async function schliesseLuecke(opts: FormsOpts): Promise<void> {
  const { toText, domainOf, extractAdressen } = await import("../lib/kommunen-profil.js");
  const supabase = await makeClient();

  // Alle Gemeinden EINMAL lesen: die Lücken-Liste und der Domain-Vergleich
  // kommen aus demselben Bestand. Der Vergleich muss bundesweit sein, auch bei
  // einem Lauf mit --bl — eine Verwaltungsgemeinschaft reicht über Landesgrenzen,
  // und der Partner wäre sonst nicht im Vergleich.
  type Alle = {
    region_id: string;
    website: string | null;
    rollen_email: string | null;
    kontakt_url: string | null;
    verwaltung_domain: string | null;
    luecke_at: string | null;
  };
  const alle: Alle[] = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await supabase
      .from("kommunen_kontakt")
      .select("region_id, website, rollen_email, kontakt_url, verwaltung_domain, luecke_at")
      .order("region_id")
      .range(von, von + 999);
    if (error) throw new Error(`Lücken lesen: ${error.message}`);
    if (!data?.length) break;
    alle.push(...(data as Alle[]));
    if (data.length < 1000) break;
  }

  const domains = new Set<string>();
  const postfachJeDomain = new Map<string, string>();
  for (const r of alle) {
    if (!r.website) continue;
    const d = domainOf(r.website);
    if (!d) continue;
    domains.add(d);
    if (r.rollen_email) postfachJeDomain.set(d, r.rollen_email);
  }

  let luecken = alle.filter((r): r is Alle & { website: string } => !!r.website && !r.rollen_email);
  if (opts.bl) luecken = luecken.filter((r) => r.region_id.startsWith(opts.bl!));
  // Die am längsten nicht gesehenen zuerst; nie gesuchte vor schon gesuchten.
  // Ohne diese Reihenfolge beginnt jeder Lauf wieder bei denselben Gemeinden.
  if (!opts.refetch) {
    luecken.sort((a, b) => (a.luecke_at ?? "").localeCompare(b.luecke_at ?? ""));
  }
  const liste: LueckeKandidat[] = (opts.limit ? luecken.slice(0, opts.limit) : luecken).map((r) => ({
    region_id: r.region_id,
    website: r.website,
    kontakt_url: r.kontakt_url,
    verwaltung_domain: r.verwaltung_domain,
  }));

  log(
    `${luecken.length.toLocaleString()} Gemeinden ohne Postfach` +
      (opts.limit ? `, davon ${liste.length.toLocaleString()} in diesem Lauf` : "") +
      ` · ${domains.size.toLocaleString()} bekannte Domains als Vergleich`,
  );

  const now = new Date().toISOString();
  const rows: LueckeRow[] = [];
  const gesehen: string[] = [];
  let done = 0;
  let ausKontaktseite = 0;
  let ausVerwaltung = 0;
  let ohneSeite = 0;

  await pool(liste, CONCURRENCY, async (c) => {
    done++;
    gesehen.push(c.region_id);
    const eigene = domainOf(c.website);
    const verwandt = (d: string) => d !== eigene && domains.has(d);

    // 1. Die Kontaktseite. Ist keine bekannt, aus der Startseite eine suchen —
    //    derselbe Weg wie --forms, nur hier gleich mitgelesen statt in einem
    //    zweiten Lauf.
    let ziel = c.kontakt_url;
    if (!ziel) {
      const start = await fetchText(c.website);
      if (!start) {
        ohneSeite++;
      } else {
        ziel = findKontaktUrl(start, c.website);
        // Steht die Adresse schon auf der Startseite, ist das ein gültiger Fund.
        const a = extractAdressen(toText(start), eigene, verwandt);
        if (a.rollenEmail) {
          rows.push({ region_id: c.region_id, rollen_email: a.rollenEmail, rollen_email_quelle: "kontaktseite", luecke_at: now });
          ausKontaktseite++;
          if (done % 50 === 0) log(`  ${done}/${liste.length} geprüft, ${rows.length} gefunden`);
          return;
        }
      }
    }
    if (ziel) {
      const html = await fetchText(ziel);
      if (html) {
        const a = extractAdressen(toText(html), eigene, verwandt);
        if (a.rollenEmail) {
          rows.push({ region_id: c.region_id, rollen_email: a.rollenEmail, rollen_email_quelle: "kontaktseite", luecke_at: now });
          ausKontaktseite++;
          if (done % 50 === 0) log(`  ${done}/${liste.length} geprüft, ${rows.length} gefunden`);
          return;
        }
      }
    }

    // 2. Die verwaltende Gemeinde. Nur wenn ihr Postfach schon erfasst ist —
    //    ein zweiter Abruf lohnt hier nicht, der nächste Lauf holt sie ein.
    const vw = c.verwaltung_domain ? postfachJeDomain.get(c.verwaltung_domain) : undefined;
    if (vw) {
      rows.push({ region_id: c.region_id, rollen_email: vw, rollen_email_quelle: "verwaltung", luecke_at: now });
      ausVerwaltung++;
    }
    if (done % 50 === 0) log(`  ${done}/${liste.length} geprüft, ${rows.length} gefunden`);
  });

  const quote = liste.length ? ((100 * rows.length) / liste.length).toFixed(1) : "0";
  log(
    `${rows.length}/${liste.length} Postfächer gefunden (${quote} %)\n` +
      `  von der Kontaktseite: ${ausKontaktseite} · von der verwaltenden Gemeinde: ${ausVerwaltung}\n` +
      `  Website nicht erreichbar: ${ohneSeite}`,
    "ok",
  );

  if (opts.dry) {
    for (const r of rows.slice(0, 20)) log(`  ${r.region_id} → ${r.rollen_email} (${r.rollen_email_quelle})`);
    log("--dry: nichts geschrieben", "ok");
    return;
  }

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("kommunen_kontakt").upsert(rows.slice(i, i + 500), { onConflict: "region_id" });
    if (error) throw new Error(`Postfächer speichern: ${error.message}`);
  }
  // Auch die ERFOLGLOSEN bekommen ihr Datum. Sonst ist „geprüft, nichts
  // gefunden" nicht von „noch nie geprüft" zu unterscheiden, und der nächste
  // Lauf beginnt wieder bei denselben Gemeinden.
  //
  // Getrennt geschrieben und NICHT über denselben Upsert: Ein Upsert mit
  // ungleicher Feldmenge vereinheitlicht die Spaltenliste und schriebe den
  // Zeilen ohne Fund ein NULL ins Postfach — dieselbe Klasse Unfall, die im
  // Fachbetriebe-Bestand 2.700 Merkmale gelöscht hat.
  const gefunden = new Set(rows.map((r) => r.region_id));
  const leer = gesehen.filter((id) => !gefunden.has(id));
  for (let i = 0; i < leer.length; i += 500) {
    const { error } = await supabase
      .from("kommunen_kontakt")
      .update({ luecke_at: now })
      .in("region_id", leer.slice(i, i + 500));
    if (error) throw new Error(`Prüfdatum speichern: ${error.message}`);
  }
  log(`${rows.length} Postfächer gespeichert, ${leer.length} als geprüft vermerkt`, "ok");
}

// ─── Pressepostfächer ────────────────────────────────────────────────────────

type PresseRow = {
  region_id: string;
  presse_email: string;
  presse_email_quelle: PresseQuelle;
  /** Der Textausschnitt, der die Einordnung traegt — nur bei mehrdeutigen
   *  Adressen. Ohne ihn waere spaeter nicht nachvollziehbar, worauf sie beruht. */
  presse_beleg: string | null;
  presse_at: string;
};

/**
 * Sucht das Presse- oder Redaktionspostfach einer Gemeinde.
 *
 * DREI WEGE, in dieser Reihenfolge, und die Reihenfolge ist die Belastbarkeit:
 *   1. Presse-/Medienseite — der stärkste Fund, dort steht die Stelle selbst.
 *   2. Kontaktseite und Impressum — schwächer, aber oft ergiebig.
 *   3. Volltextsuche der eigenen Website — nur wenn die ersten beiden leer
 *      ausgehen. Dieselbe Mechanik wie beim Förder-Crawl, und aus demselben
 *      Grund: Die Startseite verlinkt die Pressestelle oft NICHT. Bei
 *      Düsseldorf ist auf der Startseite kein einziger Presse-Link, das
 *      Postfach existiert trotzdem.
 *
 * GERATEN WIRD NICHTS: Eine Adresse zählt nur, wenn sie auf der Domain der
 * Gemeinde liegt und ihr Lokalteil ein Pressewort IST (nicht enthält).
 */
async function scrapePresse(opts: FormsOpts): Promise<void> {
  const { toText, domainOf } = await import("../lib/kommunen-profil.js");
  const { entschleiere } = await import("../lib/kommunen-profil.js");
  const { istPressePostfach, presseLinkRang, brauchtKontext, presseKontextBelegt } =
    await import("../lib/kommunen-presse.js");
  const { suchFormular, suchAdresse, suchseitenLink } = await import("../lib/funding-url-suche.js");
  const supabase = await makeClient();

  type Zeile = {
    region_id: string;
    website: string | null;
    kontakt_url: string | null;
    impressum_url: string | null;
    thema_presse_url: string | null;
    presse_email: string | null;
    presse_at: string | null;
    kampagne: string | null;
  };
  const alle: Zeile[] = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await supabase
      .from("kommunen_kontakt")
      .select("region_id, website, kontakt_url, impressum_url, thema_presse_url, presse_email, presse_at, kampagne")
      .order("region_id")
      .range(von, von + 999);
    if (error) throw new Error(`Presse lesen: ${error.message}`);
    if (!data?.length) break;
    alle.push(...(data as Zeile[]));
    if (data.length < 1000) break;
  }

  let offen = alle.filter((r): r is Zeile & { website: string } => !!r.website && !r.presse_email);
  if (opts.bl) offen = offen.filter((r) => r.region_id.startsWith(opts.bl!));
  if (schubArg) offen = offen.filter((r) => r.kampagne === schubArg);
  // Die am längsten nicht gesehenen zuerst — sonst beginnt jeder Lauf bei denselben.
  if (!opts.refetch) offen.sort((a, b) => (a.presse_at ?? "").localeCompare(b.presse_at ?? ""));
  const liste = opts.limit ? offen.slice(0, opts.limit) : offen;

  log(
    `${offen.length.toLocaleString()} Gemeinden ohne Pressepostfach` +
      (opts.limit ? `, davon ${liste.length.toLocaleString()} in diesem Lauf` : ""),
  );

  const now = new Date().toISOString();
  const rows: PresseRow[] = [];
  const gesehen: string[] = [];
  const jeQuelle = new Map<PresseQuelle, number>();
  let done = 0;

  /**
   * Presseadressen auf der Domain der Gemeinde aus einem HTML herausziehen.
   *
   * ZWEI DURCHGAENGE, und der zweite ist der wichtige: erst der sichtbare
   * Text, dann das rohe HTML. Duesseldorf schreibt seine Presseadresse als
   * Spamschutz ausschliesslich in ein Titel-Attribut („Email an:
   * presse@duesseldorf.de"); im sichtbaren Text steht sie nirgends, und der
   * Crawl lief deshalb an der groessten Stadt des Schubs vorbei.
   *
   * Im rohen HTML zu suchen ist hier ungefaehrlich, weil beide Schranken
   * bestehen bleiben: die Adresse muss auf der Domain der Gemeinde liegen und
   * ihr Lokalteil ein Pressewort SEIN. Eine fremde Agentur-Adresse im
   * Seitenquelltext faellt an der ersten Schranke.
   */
  const MAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

  /**
   * NICHT NUR DIE SCHREIBWEISE, SONDERN DER ZUSAMMENHANG (Einwand des
   * Betreibers, 03.09.2026: „wir müssen das immer im Kontext prüfen und nicht
   * nur anhand der Syntax").
   *
   * Für die eindeutigen Woerter — presse@, pressestelle@, redaktion@ — reicht
   * die Adresse: Sie bedeuten in einer Verwaltung nichts anderes. Fuer die
   * mehrdeutigen (medien@, kommunikation@) wird der Text UM den Fund herum
   * gelesen und muss eine Pressestelle benennen. Steht dort ein Gegenwort
   * („Medienzentrum", „Kommunikationstechnik"), faellt der Fund.
   *
   * Der Ausschnitt wird mitgegeben und gespeichert — ohne ihn ist spaeter
   * nicht mehr nachvollziehbar, worauf die Einordnung beruhte.
   */
  const finde = (html: string, domain: string): { email: string; beleg: string | null } | null => {
    const text = entschleiere(toText(html));
    const roh = entschleiere(html);
    for (const quelle of [text, roh]) {
      for (const treffer of quelle.match(MAIL_RE) ?? []) {
        const m = treffer.toLowerCase();
        const host = m.split("@")[1] ?? "";
        if (host !== domain && !host.endsWith(`.${domain}`)) continue;
        if (!istPressePostfach(m)) continue;
        if (!brauchtKontext(m)) return { email: m, beleg: null };
        // Der Ausschnitt kommt aus dem SICHTBAREN Text, auch wenn die Adresse
        // im Quelltext gefunden wurde: Was ein Leser dort sieht, ist die
        // Auskunft — Attribut-Salat ringsum waere keine.
        const i = text.toLowerCase().indexOf(m);
        const ausschnitt = i >= 0 ? text.slice(Math.max(0, i - 400), i + 400) : text.slice(0, 800);
        if (presseKontextBelegt(ausschnitt)) {
          return { email: m, beleg: ausschnitt.replace(/\s+/g, " ").trim().slice(0, 300) };
        }
      }
    }
    return null;
  };

  await pool(liste, CONCURRENCY, async (c) => {
    done++;
    gesehen.push(c.region_id);
    const domain = domainOf(c.website);
    if (!domain) return;

    const nimm = (email: string, quelle: PresseQuelle, beleg: string | null = null) => {
      rows.push({
        region_id: c.region_id,
        presse_email: email,
        presse_email_quelle: quelle,
        presse_beleg: beleg,
        presse_at: now,
      });
      jeQuelle.set(quelle, (jeQuelle.get(quelle) ?? 0) + 1);
    };

    // 1. Bekannte Presseseite, danach Kontaktseite und Impressum.
    for (const [url, quelle] of [
      [c.thema_presse_url, "presseseite"],
      [c.kontakt_url, "kontaktseite"],
      [c.impressum_url, "impressum"],
    ] as [string | null, PresseQuelle][]) {
      if (!url) continue;
      const html = await fetchText(url);
      const treffer = html ? finde(html, domain) : null;
      if (treffer) {
        nimm(treffer.email, quelle, treffer.beleg);
        return;
      }
    }

    // 2. Von der Startseite aus den Presse-Links folgen, zwei Ebenen tief.
    const start = await fetchText(c.website);
    if (!start) return;
    const direkt = finde(start, domain);
    if (direkt) {
      nimm(direkt.email, "presseseite", direkt.beleg);
      return;
    }
    // NACH RANG, nicht in der Reihenfolge des HTML. Auf der Startseite einer
    // Großstadt stehen Dutzende schwache Treffer („rathaus", „kontakt"); ohne
    // Rangfolge ist die Obergrenze erreicht, bevor der Presse-Link an der Reihe
    // ist. Genau daran ist Düsseldorf gescheitert, dessen Startseite das
    // Medienportal sehr wohl verlinkt.
    const besucht = new Set<string>();
    const nachRang = (liste: { href: string; text: string }[], basis: string): string[] =>
      liste
        .map((a) => ({ rang: presseLinkRang(a.href, a.text), a }))
        .filter((x) => x.rang > 0)
        .sort((x, y) => y.rang - x.rang)
        .map((x) => {
          try {
            return new URL(x.a.href, basis).toString().split("#")[0];
          } catch {
            return "";
          }
        })
        .filter((u) => u && safeHost(u) === safeHost(basis));
    // EIN GEMEINSAMER VORRAT, NICHT EBENE FÜR EBENE. Eine Obergrenze je Ebene
    // ist keine: Sie war global, und die Startseite einer Großstadt füllt sie
    // allein — die zweite Ebene kam dann nie an die Reihe. Düsseldorf verlinkt
    // sein Medienportal auf der Startseite, die Adresse steht eine Seite
    // weiter, und der Crawl hat sie trotzdem nie gesehen.
    //
    // Stattdessen: alle Kandidaten in einen Topf, immer den bestbewerteten
    // zuerst, bis das Abruf-Budget aufgebraucht ist.
    const vorrat = new Map<string, number>();
    const sammle = (html: string, basis: string, tiefe: number) => {
      if (tiefe > 2) return;
      for (const a of extractAnchors(html)) {
        const rang = presseLinkRang(a.href, a.text);
        if (rang <= 0) continue;
        let u: string;
        try {
          u = new URL(a.href, basis).toString().split("#")[0];
        } catch {
          continue;
        }
        if (safeHost(u) !== safeHost(c.website) || besucht.has(u)) continue;
        // Je tiefer, desto schwächer — sonst zieht ein „Kontakt" der dritten
        // Ebene an einem „Presseportal" der ersten vorbei.
        const wert = rang - tiefe * 5;
        if ((vorrat.get(u) ?? -1) < wert) vorrat.set(u, wert);
      }
    };
    sammle(start, c.website, 0);

    const BUDGET = 14;
    for (let i = 0; i < BUDGET && vorrat.size; i++) {
      const [url] = [...vorrat].sort((a, b) => b[1] - a[1])[0];
      vorrat.delete(url);
      besucht.add(url);
      const html = await fetchText(url);
      if (!html) continue;
      const treffer = finde(html, domain);
      if (treffer) {
        nimm(treffer.email, "presseseite", treffer.beleg);
        return;
      }
      sammle(html, url, 1);
    }

    // 3. Die Volltextsuche der Website — nur wenn der Crawl leer ausging.
    //    Genau der Fall Düsseldorf: kein Presse-Link auf der Startseite.
    const formular = suchFormular(start, c.website) ?? (() => null)();
    let sucheUrl: string | null = null;
    if (formular) sucheUrl = suchAdresse(formular, "pressestelle");
    else {
      const seite = suchseitenLink(start, c.website);
      if (seite) {
        const html = await fetchText(seite);
        const f = html ? suchFormular(html, seite) : null;
        if (f) sucheUrl = suchAdresse(f, "pressestelle");
      }
    }
    if (!sucheUrl) return;
    const treffer = await fetchText(sucheUrl);
    if (!treffer) return;
    const direktInSuche = finde(treffer, domain);
    if (direktInSuche) {
      nimm(direktInSuche.email, "suche", direktInSuche.beleg);
      return;
    }
    // Die Trefferliste selbst trägt selten eine Adresse — dem ersten Treffer folgen.
    for (const u of nachRang(extractAnchors(treffer), sucheUrl).slice(0, 12)) {
      if (safeHost(u) !== safeHost(c.website) || besucht.has(u)) continue;
      besucht.add(u);
      const html = await fetchText(u);
      const t = html ? finde(html, domain) : null;
      if (t) {
        nimm(t.email, "suche", t.beleg);
        return;
      }
      if (besucht.size >= 18) break;
    }
    if (done % 25 === 0) log(`  ${done}/${liste.length} geprüft, ${rows.length} gefunden`);
  });

  const quote = liste.length ? ((100 * rows.length) / liste.length).toFixed(1) : "0";
  log(
    `${rows.length}/${liste.length} Pressepostfächer gefunden (${quote} %)\n  ` +
      [...jeQuelle].map(([q, n]) => `${q}: ${n}`).join(" · "),
    "ok",
  );

  if (opts.dry) {
    for (const r of rows.slice(0, 40)) log(`  ${r.region_id} → ${r.presse_email} (${r.presse_email_quelle})`);
    log("--dry: nichts geschrieben", "ok");
    return;
  }

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("kommunen_kontakt").upsert(rows.slice(i, i + 500), { onConflict: "region_id" });
    if (error) throw new Error(`Pressepostfächer speichern: ${error.message}`);
  }
  // Auch die ERFOLGLOSEN bekommen ihr Datum — und getrennt geschrieben, damit
  // ein Upsert mit ungleicher Feldmenge nicht die Adress-Spalte auf NULL setzt.
  const gefunden = new Set(rows.map((r) => r.region_id));
  const leer = gesehen.filter((id) => !gefunden.has(id));
  for (let i = 0; i < leer.length; i += 500) {
    const { error } = await supabase
      .from("kommunen_kontakt")
      .update({ presse_at: now })
      .in("region_id", leer.slice(i, i + 500));
    if (error) throw new Error(`Prüfdatum speichern: ${error.message}`);
  }
  log(`${rows.length} Pressepostfächer gespeichert, ${leer.length} als geprüft vermerkt`, "ok");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dry = argv.includes("--dry");
  const doSetup = argv.includes("--setup");
  const doWikidata = argv.includes("--wikidata");
  const doUpload = argv.includes("--upload");
  const doForms = argv.includes("--forms");
  const doProbe = argv.includes("--probe");
  const doWahl = argv.includes("--wahl");
  const doRang = argv.includes("--rang");
  const doStats = argv.includes("--stats");
  const doProfil = argv.includes("--profil");
  const doLuecke = argv.includes("--luecke");
  const doPresse = argv.includes("--presse");

  const blArg = argv.find((a) => a.startsWith("--bl="));
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  const formsOpts: FormsOpts = {
    bl: blArg?.slice(5),
    limit: limitArg ? parseInt(limitArg.slice(8), 10) : undefined,
    refetch: argv.includes("--refetch"),
    dry,
  };

  if (!doSetup && !doWikidata && !doUpload && !doForms && !doProbe && !doWahl && !doRang && !doStats && !doProfil && !doLuecke && !doPresse) {
    log(
      "Nichts zu tun. Flags: --setup --wikidata --upload --forms --probe --wahl --rang --profil --luecke --presse --stats [--dry]\n" +
        "  --forms [--bl=10] [--limit=N] [--refetch]  Kontaktlink aus der Startseite\n" +
        "  --probe [--bl=10] [--limit=N]              Kontakt-Pfade direkt anklopfen (Lücken)\n" +
        "  --wahl [--dry]                             Grünen/Linke/SPD-Anteil je Gemeinde (BTW 2025)\n" +
        "  --rang [--dry]                             Dach-pro-Kopf Perzentil + Landkreis-Rang\n" +
        "  --profil [--bl=09] [--limit=N] [--dry]     Impressum + Themen: Verantwortliche, Rollen-Postfach, Aufhänger\n" +
        "  --luecke [--bl=09] [--limit=N] [--dry]     Gemeinden ohne Postfach: Kontaktseite lesen, Verwaltung erben\n" +
        "  --presse [--schub=X] [--limit=N] [--dry]   Presse-/Redaktionspostfach suchen (Presseseite, Kontakt, Volltextsuche)",
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
  if (doRang) await uploadRang(dry);
  if (doProfil) await scrapeProfil(formsOpts);
  if (doLuecke) await schliesseLuecke(formsOpts);
  if (doPresse) await scrapePresse(formsOpts);
  if (doStats) await stats();
  log("Fertig", "ok");
}

main().catch((err) => {
  log((err as Error).message, "err");
  process.exit(1);
});
