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
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

// GETEILTE MECHANIK, GETRENNTE BESTÄNDE. Die Muster für Geschäftsfelder und die
// Auswahl der Angebots-Unterseiten sind dieselbe Frage an eine Website, egal wer
// dahintersteht — sie ein zweites Mal zu schreiben wäre ein Fehler, kein
// Duplikat. Was NICHT geteilt wird, ist das Vokabular des Marktes: Versorger
// haben andere Käufer, Budgets und Rechtsrahmen als Handwerksbetriebe.
import { FELDER, adresseLesbar, angebotsSeiten, sichtbarerText } from "../lib/fachbetrieb-extrakt";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

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

    -- Aus dem Marktstammdatenregister übernommene Stammdaten (Nachtrag,
    -- idempotent). Die MaStR-Nummer ist der Schlüssel für den wiederholten
    -- Import: sie bleibt gleich, der Firmenname kann sich ändern.
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS mastr_nummer text;
    -- Voller Unique-Index, KEIN Teil-Index: Ein Teil-Index (… WHERE mastr_nummer
    -- IS NOT NULL) taugt nicht als Konfliktziel eines Upserts — Postgres kann ihn
    -- nur nutzen, wenn dieselbe Bedingung mit angegeben wird, und das kann der
    -- Client nicht. Leere Werte stören hier nicht: Postgres behandelt sie in
    -- Unique-Indizes als voneinander verschieden, von Hand angelegte Versorger
    -- ohne Registernummer bleiben also nebeneinander möglich.
    DROP INDEX IF EXISTS idx_utilities_mastr;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_utilities_mastr ON utilities (mastr_nummer);
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS telefon text;
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS plz text;
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS ort text;
    -- Ergebnisse des Website-Laufs (Impressum + Themen). Getrennt von den
    -- Registerdaten, weil sie eine andere Herkunft und Haltbarkeit haben.
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS impressum_url text;
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS rollen_email text;
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS personen_email text;
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS verantwortlich_zeile text;
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS verantwortlich_funktion text;
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS verantwortlich_operativ boolean;
    -- Themen-Fundstellen: welches Thema, mit Direktlink. Kandidat, KEIN geprüftes
    -- Programm — die Förder-Fundstelle sagt nur „hier steht etwas von Förderung".
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS themen jsonb;
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS profil_geprueft_am timestamptz;
    -- Adresse auf FREMDER Domain: bei Versorgern ein Hinweis auf Konzernmutter
    -- oder Dienstleister. Kein Fehler, sondern ein Fund fuer den Menschen.
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS verbund_domain text;
    -- Ergebnis der systematischen Gebiets-Pruefung (gruen/gelb/rot + Befunde).
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS pruefung_ampel text;
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS pruefung jsonb;

    -- Was der Versorger ENDKUNDEN anbietet (Phase --angebot). Betreiber-Vorgabe
    -- 29.08.2026: Wer Hilfe bei der Balkonkraftwerk-Montage sucht, dem ist
    -- gleich, ob der Anbieter Handwerksbetrieb oder Stadtwerk ist. Das Merkmal
    -- wird deshalb in BEIDEN Beständen erhoben — die Bestände bleiben getrennt,
    -- nur die Frage ist dieselbe.
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS geschaeftsfelder text[];
    ALTER TABLE utilities ADD COLUMN IF NOT EXISTS angebot_geprueft_am timestamptz;

    -- Belege der gemessenen Zuordnung.
    ALTER TABLE utility_communes ADD COLUMN IF NOT EXISTS anlagen int;
    ALTER TABLE utility_communes ADD COLUMN IF NOT EXISTS anteil numeric;
    -- 'gemessen' als vierte Herkunft nachziehen (die Tabelle kann älter sein).
    DO $$ BEGIN
      ALTER TABLE utility_communes DROP CONSTRAINT IF EXISTS utility_communes_zuordnung_quelle_check;
      ALTER TABLE utility_communes ADD CONSTRAINT utility_communes_zuordnung_quelle_check
        CHECK (zuordnung_quelle IN ('gemessen', 'verlinkt', 'recherchiert', 'vermutet'));
    END $$;

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

// ─── Import aus dem Marktstammdatenregister ───────────────────────────────────

/** Marktfunktion 1 = Stromnetzbetreiber (Marktfunktionen.xml im Gesamtdatenexport). */
const MF_STROMNETZBETREIBER = "1";
/** Personenart 517 = Organisation/juristische Person (Katalog 27). */
const PERSONENART_ORGANISATION = "517";
/** Land 84 = Deutschland. */
const LAND_DEUTSCHLAND = "84";

/** Belastbarkeits-Schwelle der gemessenen Zuordnung: unter drei Anlagen ODER
 *  unter 5 % der Gemeinde ist ein Netzbetreiber dort ein Randfall — meist ein
 *  einzelner Anschluss am Ortsrand, nicht das Ortsnetz. Beides wird trotzdem
 *  gespeichert, aber nur oberhalb der Schwelle gilt die Gemeinde als Gebiet. */
const MIN_ANLAGEN = 3;
const MIN_ANTEIL = 0.05;

/** Ab so vielen Gemeinden ist es kein Stadtwerk mehr, sondern ein Flächennetz
 *  (Westnetz 1.368, Bayernwerk 1.186). Nur eine Vorbelegung — im Cockpit
 *  änderbar, weil die Grenze eine Einschätzung ist und keine Messung. */
const REGIONAL_AB_GEMEINDEN = 100;

type Akteur = {
  mastr_nummer: string;
  name: string;
  website: string | null;
  email: string | null;
  telefon: string | null;
  plz: string | null;
  ort: string | null;
};

function typVon(name: string, gemeinden: number): string {
  if (/genossenschaft|\beG\b|\be\.\s?G\b/i.test(name)) return "genossenschaft";
  if (gemeinden >= REGIONAL_AB_GEMEINDEN) return "regionalversorger";
  return "stadtwerk";
}

/** MaStR-Nummern sind Präfix + Ziffern (SEL982068309366). Für die Millionen
 *  Standort-Zuordnungen wird nur der Zahlenteil behalten: als Zahl statt als
 *  Zeichenkette braucht die Tabelle einen Bruchteil des Speichers, und mehr als
 *  die Identität wird hier nicht gebraucht. */
function nurZiffern(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/(\d{6,})$/);
  return m ? Number(m[1]) : null;
}

function saubereFirma(s: string): string {
  // Das Register verwendet an einigen Stellen das fernöstliche Und-Zeichen.
  return s.replace(/＆/g, "&").replace(/\s+/g, " ").trim();
}

function normWebsite(s: string | undefined): string | null {
  const roh = (s ?? "").trim();
  if (!roh || roh.length < 4) return null;
  return /^https?:\/\//i.test(roh) ? roh : `https://${roh}`;
}

/** Zwischenstand des Registerlaufs. Der Lauf liest 22 GB und dauert rund 20
 *  Minuten; ohne Ablage würde jeder Fehler beim Schreiben ihn komplett
 *  wiederholen. Genau das ist beim ersten Versuch passiert. */
type Zwischenstand = {
  gelesen_am: string;
  akteure: Akteur[];
  gebiete: Record<string, { ags: string; n: number; anteil: number }[]>;
};

const ZWISCHEN_DATEI = resolve(SCRIPT_DIR, ".cache", "utilities", "registerlauf.json");
const PROFIL_DATEI = resolve(SCRIPT_DIR, ".cache", "utilities", "profillauf.json");

function ladeZwischenstand(): Zwischenstand | null {
  if (!existsSync(ZWISCHEN_DATEI)) return null;
  try {
    return JSON.parse(readFileSync(ZWISCHEN_DATEI, "utf8")) as Zwischenstand;
  } catch {
    return null;
  }
}

function speichereZwischenstand(z: Zwischenstand): void {
  mkdirSync(dirname(ZWISCHEN_DATEI), { recursive: true });
  writeFileSync(ZWISCHEN_DATEI, JSON.stringify(z));
  log(`Zwischenstand abgelegt (${ZWISCHEN_DATEI.split("/").slice(-2).join("/")})`);
}

async function importRegister(dry: boolean, neuLesen: boolean): Promise<void> {
  const zwischen = neuLesen ? null : ladeZwischenstand();
  if (zwischen) {
    log(`Zwischenstand vom ${new Date(zwischen.gelesen_am).toLocaleString("de-DE")} wird verwendet (--refetch liest neu)`);
    await schreibeRegister(zwischen.akteure, new Map(Object.entries(zwischen.gebiete)), dry);
    return;
  }
  const { findCachedZip, listZipEntries, streamXmlRecords } = await import("./mastr-bnetza-refresh");
  const zipPath = findCachedZip();
  log(`Registerexport: ${zipPath.split("/").pop()}`);
  const entries = (await listZipEntries(zipPath)).map((e) => e.name);
  const passend = (re: RegExp) => entries.filter((n) => re.test(n)).sort();

  // ── 1. Netzbetreiber als Marktakteure ───────────────────────────────────────
  const akteure = new Map<string, Akteur>();
  for (const datei of passend(/^Marktakteure(_\d+)?\.xml$/i)) {
    await streamXmlRecords(zipPath, datei, "Marktakteur", (r) => {
      if (r.Marktfunktion !== MF_STROMNETZBETREIBER) return;
      if (r.Personenart !== PERSONENART_ORGANISATION) return;
      if (r.Land !== LAND_DEUTSCHLAND) return;
      const nr = r.MastrNummer;
      const name = saubereFirma(r.Firmenname ?? "");
      if (!nr || !name) return;
      akteure.set(nr, {
        mastr_nummer: nr,
        name,
        website: normWebsite(r.Webseite),
        email: (r.Email ?? "").trim() || null,
        telefon: (r.Telefon ?? "").trim() || null,
        plz: (r.Postleitzahl ?? "").trim() || null,
        ort: (r.Ort ?? "").trim() || null,
      });
    });
  }
  log(`${akteure.size} Stromnetzbetreiber in Deutschland`, "ok");

  // ── 2. Standort → Netzbetreiber ─────────────────────────────────────────────
  const nbIndex = new Map<string, number>();
  const indexNb: string[] = [];
  const lokNb = new Map<number, number>();
  const napDateien = passend(/^Netzanschlusspunkte(_\d+)?\.xml$/i);
  for (let i = 0; i < napDateien.length; i++) {
    const datei = napDateien[i];
    await streamXmlRecords(zipPath, datei, "Netzanschlusspunkt", (r) => {
      const lok = nurZiffern(r.LokationMaStRNummer);
      const nb = r.NetzbetreiberMaStRNummer;
      if (lok == null || !nb) return;
      let id = nbIndex.get(nb);
      if (id === undefined) {
        id = indexNb.length;
        nbIndex.set(nb, id);
        indexNb.push(nb);
      }
      lokNb.set(lok, id);
    });
    if ((i + 1) % 10 === 0 || i === napDateien.length - 1) {
      log(`  Standorte [${i + 1}/${napDateien.length}]: ${lokNb.size.toLocaleString("de-DE")}`);
    }
  }

  // ── 3. Anlagen → (Netzbetreiber, Gemeinde) ──────────────────────────────────
  // Solar allein genügt: Photovoltaik steht in praktisch jeder Gemeinde, und
  // gesucht ist nur, WELCHE Gemeinden an einem Netz hängen. Die Leistungszahlen
  // des Gebiets kommen später aus den vorhandenen Gemeinde-Summen.
  const paare = new Map<string, { n: number }>();
  const jeGemeinde = new Map<string, number>();
  let zugeordnet = 0;
  let ohneNetz = 0;
  const solarDateien = passend(/^EinheitenSolar(_\d+)?\.xml$/i);
  for (let i = 0; i < solarDateien.length; i++) {
    const datei = solarDateien[i];
    await streamXmlRecords(zipPath, datei, "EinheitSolar", (r) => {
      const ags = r.Gemeindeschluessel;
      if (!ags || ags.length !== 8) return;
      jeGemeinde.set(ags, (jeGemeinde.get(ags) ?? 0) + 1);
      const lok = nurZiffern(r.LokationMaStRNummer);
      const nb = lok == null ? undefined : lokNb.get(lok);
      if (nb === undefined) {
        ohneNetz++;
        return;
      }
      zugeordnet++;
      const key = `${nb}|${ags}`;
      const eintrag = paare.get(key);
      if (eintrag) eintrag.n++;
      else paare.set(key, { n: 1 });
    });
    if ((i + 1) % 8 === 0 || i === solarDateien.length - 1) {
      log(`  Anlagen [${i + 1}/${solarDateien.length}]: ${zugeordnet.toLocaleString("de-DE")} zugeordnet`);
    }
  }
  const quote = (zugeordnet / Math.max(zugeordnet + ohneNetz, 1)) * 100;
  log(`${zugeordnet.toLocaleString("de-DE")} Anlagen zugeordnet, ${ohneNetz.toLocaleString("de-DE")} ohne Netzbetreiber (${quote.toFixed(1)} %)`, "ok");

  // ── 4. Gebiete je Netzbetreiber ─────────────────────────────────────────────
  const gebiete = new Map<string, { ags: string; n: number; anteil: number }[]>();
  for (const [key, { n }] of Array.from(paare.entries())) {
    const [idStr, ags] = key.split("|");
    const nr = indexNb[Number(idStr)];
    const anteil = n / Math.max(jeGemeinde.get(ags) ?? 1, 1);
    const liste = gebiete.get(nr) ?? [];
    liste.push({ ags, n, anteil });
    gebiete.set(nr, liste);
  }

  speichereZwischenstand({
    gelesen_am: new Date().toISOString(),
    akteure: Array.from(akteure.values()),
    gebiete: Object.fromEntries(gebiete),
  });

  await schreibeRegister(Array.from(akteure.values()), gebiete, dry);
}

// ── Schreiben ─────────────────────────────────────────────────────────────────

async function schreibeRegister(
  akteure: Akteur[],
  gebiete: Map<string, { ags: string; n: number; anteil: number }[]>,
  dry: boolean,
): Promise<void> {
  if (dry) {
    log(`Trockenlauf: ${akteure.length} Versorger, ${gebiete.size} mit Gebiet — nichts geschrieben`, "ok");
    return;
  }

  const supabase = await makeClient();
  const gueltigeGemeinden = await ladeGemeindeIds(supabase);

  const zeilen = akteure.map((a) => {
    const gebiet = (gebiete.get(a.mastr_nummer) ?? []).filter(
      (g) => g.n >= MIN_ANLAGEN && g.anteil >= MIN_ANTEIL && gueltigeGemeinden.has(g.ags),
    );
    return { akteur: a, gebiet };
  });

  for (let i = 0; i < zeilen.length; i += 200) {
    const teil = zeilen.slice(i, i + 200);
    const { error } = await supabase.from("utilities").upsert(
      teil.map(({ akteur, gebiet }) => ({
        mastr_nummer: akteur.mastr_nummer,
        name: akteur.name,
        typ: typVon(akteur.name, gebiet.length),
        website: akteur.website,
        kontakt_email: akteur.email,
        telefon: akteur.telefon,
        plz: akteur.plz,
        ort: akteur.ort,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "mastr_nummer" },
    );
    if (error) throw new Error(`utilities upsert: ${error.message}`);
  }
  log(`${zeilen.length} Versorger geschrieben`, "ok");

  // IDs zurücklesen, um die Zuordnungen zu hängen.
  const idByMastr = new Map<string, string>();
  for (let von = 0; ; von += 1000) {
    const { data, error } = await supabase
      .from("utilities")
      .select("id, mastr_nummer")
      .not("mastr_nummer", "is", null)
      .range(von, von + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const r of data) idByMastr.set(r.mastr_nummer as string, r.id as string);
    if (data.length < 1000) break;
  }

  // Zuordnungen: nur die gemessenen ersetzen. Von Hand gepflegte Zuordnungen
  // (verlinkt/recherchiert/vermutet) gehören dem Menschen und bleiben stehen.
  const links: Record<string, unknown>[] = [];
  for (const { akteur, gebiet } of zeilen) {
    const uid = idByMastr.get(akteur.mastr_nummer);
    if (!uid) continue;
    for (const g of gebiet) {
      links.push({
        utility_id: uid,
        commune_id: g.ags,
        rolle: "versorgungsgebiet",
        zuordnung_quelle: "gemessen",
        anlagen: g.n,
        anteil: Number(g.anteil.toFixed(3)),
      });
    }
  }
  const { error: delErr } = await supabase.from("utility_communes").delete().eq("zuordnung_quelle", "gemessen");
  if (delErr) throw new Error(`alte Messung entfernen: ${delErr.message}`);
  for (let i = 0; i < links.length; i += 500) {
    const { error } = await supabase
      .from("utility_communes")
      .upsert(links.slice(i, i + 500), { onConflict: "utility_id,commune_id" });
    if (error) throw new Error(`utility_communes upsert: ${error.message}`);
  }
  log(`${links.length} gemessene Gemeinde-Zuordnungen geschrieben`, "ok");
}

/** Gemeinde-Schlüssel, die es in unserem Verzeichnis wirklich gibt. Das Register
 *  kennt auch stillgelegte Schlüssel (nach Gebietsreformen); die würden am
 *  Fremdschlüssel scheitern und den ganzen Stapel mitreißen. */
async function ladeGemeindeIds(supabase: SupabaseLike): Promise<Set<string>> {
  const out = new Set<string>();
  for (let von = 0; ; von += 1000) {
    const { data, error } = await supabase
      .from("mastr_regions")
      .select("region_id")
      .eq("level", "gemeinde")
      .range(von, von + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const r of data) out.add(r.region_id as string);
    if (data.length < 1000) break;
  }
  return out;
}

// ─── Systematische Gebiets-Prüfung ────────────────────────────────────────────

/** Mittelpunkte aller Gemeinden aus den Kreis-Geometrien des Solar-Atlas.
 *  Kein neuer Datensatz: dieselben Dateien, die die Karte zeichnet. */
function ladeGemeindeZentren(): Map<string, { lat: number; lon: number }> {
  const dir = resolve(SCRIPT_DIR, "..", "public", "geo", "gemeinden");
  const out = new Map<string, { lat: number; lon: number }>();
  if (!existsSync(dir)) return out;

  for (const datei of readdirSync(dir)) {
    if (!datei.endsWith(".geo.json")) continue;
    let fc: { features?: { properties?: { id?: string }; geometry?: { coordinates?: unknown } }[] };
    try {
      fc = JSON.parse(readFileSync(resolve(dir, datei), "utf8"));
    } catch {
      continue;
    }
    for (const f of fc.features ?? []) {
      const ags = f.properties?.id;
      if (!ags) continue;
      // Mittelpunkt aus allen Stützpunkten: für die Frage „liegt das beieinander"
      // genügt der Schwerpunkt der Umrisslinie bei Weitem.
      let sx = 0;
      let sy = 0;
      let n = 0;
      const lauf = (c: unknown): void => {
        if (Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number") {
          sx += c[0] as number;
          sy += c[1] as number;
          n++;
          return;
        }
        if (Array.isArray(c)) for (const k of c) lauf(k);
      };
      lauf(f.geometry?.coordinates);
      if (n > 0) out.set(ags, { lon: sx / n, lat: sy / n });
    }
  }
  return out;
}

/** Postleitzahl → mögliche Gemeindeschlüssel (eine PLZ kann mehrere treffen). */
function ladePlzAgs(): Map<string, string[]> {
  const datei = resolve(SCRIPT_DIR, "..", "public", "plz-ags.json");
  const out = new Map<string, string[]>();
  if (!existsSync(datei)) return out;
  const roh = JSON.parse(readFileSync(datei, "utf8")) as Record<string, { ags?: string }[]>;
  for (const [plz, eintraege] of Object.entries(roh)) {
    const ags = eintraege.map((e) => e.ags).filter((a): a is string => !!a);
    if (ags.length) out.set(plz, Array.from(new Set(ags)));
  }
  return out;
}

async function laufPruefung(dry: boolean): Promise<void> {
  const { pruefeGebiet } = await import("../lib/utility-check");
  const supabase = await makeClient();

  const zentren = ladeGemeindeZentren();
  const plzAgs = ladePlzAgs();
  log(`${zentren.size.toLocaleString("de-DE")} Gemeinde-Mittelpunkte, ${plzAgs.size.toLocaleString("de-DE")} Postleitzahlen`);

  const utils = (await alleZeilen(supabase, "utilities", "id, name, plz, ort")) as {
    id: string;
    name: string;
    plz: string | null;
    ort: string | null;
  }[];
  const links = (await alleZeilen(supabase, "utility_communes", "utility_id, commune_id, rolle, anteil, anlagen")) as {
    utility_id: string;
    commune_id: string;
    rolle: string;
    anteil: number | null;
    anlagen: number | null;
  }[];
  const regionen = (await alleZeilen(supabase, "mastr_regions", "region_id, name, level")) as {
    region_id: string;
    name: string;
    level: string;
  }[];
  const gemeindeNamen = regionen
    .filter((r) => r.level === "gemeinde")
    .map((r) => ({ ags: r.region_id, name: r.name }));
  const nameByAgs = new Map(gemeindeNamen.map((g) => [g.ags, g.name]));

  const jeVersorger = new Map<string, { ags: string; name: string; anteil: number; anlagen: number }[]>();
  for (const l of links) {
    if (l.rolle === "beteiligung") continue;
    const arr = jeVersorger.get(l.utility_id) ?? [];
    arr.push({ ags: l.commune_id, name: nameByAgs.get(l.commune_id) ?? l.commune_id, anteil: Number(l.anteil ?? 0), anlagen: Number(l.anlagen ?? 0) });
    jeVersorger.set(l.utility_id, arr);
  }

  // Je Gemeinde der hoechste Anteil irgendeines Netzbetreibers — Grundlage fuer
  // die Frage „ist er dort der Groesste".
  const maxJeGemeinde = new Map<string, number>();
  for (const l of links) {
    if (l.rolle === "beteiligung") continue;
    const a = Number(l.anteil ?? 0);
    if (a > (maxJeGemeinde.get(l.commune_id) ?? 0)) maxJeGemeinde.set(l.commune_id, a);
  }

  // Wer ist wo der bestimmende Netzbetreiber? Daraus folgt, welche Gemeinden
  // einem ANDEREN gehoeren — und damit, ob ein Firmensitz ausserhalb des eigenen
  // Gebiets erklaert ist.
  const bestimmenderJeGemeinde = new Map<string, string>();
  for (const l of links) {
    if (l.rolle === "beteiligung") continue;
    const a = Number(l.anteil ?? 0);
    if (a >= (maxJeGemeinde.get(l.commune_id) ?? 0)) bestimmenderJeGemeinde.set(l.commune_id, l.utility_id);
  }

  const zaehler = { gruen: 0, gelb: 0, rot: 0 };
  const auffaellige: string[] = [];
  const zeilen: { id: string; name: string; pruefung_ampel: string; pruefung: unknown }[] = [];

  for (const u of utils) {
    const gebiet = jeVersorger.get(u.id) ?? [];
    if (gebiet.length === 0) continue;
    const p = pruefeGebiet({
      name: u.name,
      sitzKandidaten: u.plz ? (plzAgs.get(u.plz) ?? []) : [],
      gebiet,
      zentren,
      gemeindeNamen,
      sitzOrt: u.ort,
      fremdVersorgteGemeinden: new Set(
        Array.from(bestimmenderJeGemeinde.entries())
          .filter(([, uid]) => uid !== u.id)
          .map(([ags]) => ags),
      ),
      groesstemAnteilJeGemeinde: maxJeGemeinde,
    });
    zaehler[p.ampel]++;
    if (p.ampel === "rot") auffaellige.push(`${u.name}: ${p.befunde.filter((b) => b.ergebnis === "auffaellig").map((b) => b.text).join(" ")}`);
    zeilen.push({ id: u.id, name: u.name, pruefung_ampel: p.ampel, pruefung: p.befunde });
  }

  log(`Geprüft: ${zeilen.length} Versorger mit Gebiet`, "ok");
  log(`  bestätigt ${zaehler.gruen} · teilweise prüfbar ${zaehler.gelb} · widersprüchlich ${zaehler.rot}`);

  // Woran hängt es? Ohne diese Aufschlüsselung optimiert man ins Blaue.
  const jeTest = new Map<string, { ok: number; auffaellig: number; unpruefbar: number }>();
  const gruendeUnpruefbar = new Map<string, number>();
  for (const z of zeilen) {
    for (const b of z.pruefung as { test: string; ergebnis: string; text: string }[]) {
      const e = jeTest.get(b.test) ?? { ok: 0, auffaellig: 0, unpruefbar: 0 };
      e[b.ergebnis as "ok" | "auffaellig" | "unpruefbar"]++;
      jeTest.set(b.test, e);
      if (b.ergebnis === "unpruefbar") {
        const kurz = b.text.split("—")[0].trim().slice(0, 60);
        gruendeUnpruefbar.set(kurz, (gruendeUnpruefbar.get(kurz) ?? 0) + 1);
      }
    }
  }
  log("  Je Test:");
  for (const [test, e] of Array.from(jeTest.entries())) {
    log(`    ${test.padEnd(10)} bestätigt ${String(e.ok).padStart(4)} · widerspricht ${String(e.auffaellig).padStart(3)} · unprüfbar ${String(e.unpruefbar).padStart(4)}`);
  }
  log("  Häufigste Gründe, warum ein Test nicht entscheiden konnte:");
  for (const [grund, n] of Array.from(gruendeUnpruefbar.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    log(`    ${String(n).padStart(4)}× ${grund}`);
  }
  if (auffaellige.length) {
    log(`Widersprüchliche Gebiete (erste 15):`, "err");
    for (const z of auffaellige.slice(0, 15)) log(`    ${z}`);
  }

  if (dry) {
    log("Trockenlauf — nichts geschrieben", "ok");
    return;
  }
  for (let i = 0; i < zeilen.length; i += 200) {
    const { error } = await supabase.from("utilities").upsert(zeilen.slice(i, i + 200), { onConflict: "id" });
    if (error) throw new Error(`Prüfung schreiben: ${error.message}`);
  }
  log(`${zeilen.length} Prüfergebnisse geschrieben`, "ok");
}

// ─── Gebiets-Beleg von der Website ────────────────────────────────────────────

/**
 * Nennt der Versorger auf seiner eigenen Website die Gemeinden, die wir gemessen
 * haben? Dann bestätigt er die Zuordnung selbst — ein dritter Identitätsbeleg
 * neben Anschrift und Firmenname, und der einzige, der von ihm selbst stammt.
 *
 * Läuft NUR über die unsicheren Fälle. Für die 654 bestätigten wäre es
 * unnötiger Verkehr auf fremden Servern.
 *
 * Abgrenzung zur Erfahrung der Kommunen-Session („Links aus der Navigation zu
 * verfolgen bringt 1 brauchbaren Treffer auf 15"): Dort wurde nach einer
 * unbekannten Adresse gesucht, deren Richtigkeit niemand nachprüfen konnte. Hier
 * ist die Frage geschlossen — wir suchen nach EINER bekannten Liste von
 * Ortsnamen und können jeden Treffer belegen. Verfolgt wird zudem nur ein
 * eindeutig benannter Link („Netzgebiet", „Versorgungsgebiet"), nicht die
 * ganze Navigation.
 */
const GEBIETS_LINK = /(netzgebiet|versorgungsgebiet|liefergebiet|versorgungsregion|unser[-\s]?netz|netzgebiete)/i;

/** Wie viele Gemeinden des Gebiets die Seite nennen muss, damit es als Beleg
 *  gilt. Eine einzelne Nennung kann die Adresse im Impressum sein. */
const WEB_MIN_TREFFER = 2;

function findeGebietsLink(html: string, basis: string): string | null {
  const treffer = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi));
  for (const m of treffer) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, " ");
    if (!GEBIETS_LINK.test(text) && !GEBIETS_LINK.test(href)) continue;
    try {
      return new URL(href, basis).toString();
    } catch {
      continue;
    }
  }
  return null;
}

/** Gemeindenamen, die in einem Text an Wortgrenzen vorkommen. */
function genannteOrte(text: string, orte: { ags: string; name: string }[]): Set<string> {
  const klein = text.toLowerCase();
  const out = new Set<string>();
  for (const o of orte) {
    const n = o.name.toLowerCase();
    if (n.length < 4) continue;
    const re = new RegExp(`(^|[^a-zäöüß])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-zäöüß]|$)`);
    if (re.test(klein)) out.add(o.ags);
  }
  return out;
}

async function laufWebPruefung(dry: boolean, nurAmpel: string[]): Promise<void> {
  const { toText } = await import("../lib/kommunen-profil");
  const supabase = await makeClient();

  const utils = (await alleZeilen(supabase, "utilities", "id, name, website, pruefung_ampel, pruefung")) as {
    id: string;
    name: string;
    website: string | null;
    pruefung_ampel: string | null;
    pruefung: { test: string; ergebnis: string; text: string }[] | null;
  }[];
  const links = (await alleZeilen(supabase, "utility_communes", "utility_id, commune_id, rolle")) as {
    utility_id: string;
    commune_id: string;
    rolle: string;
  }[];
  const regionen = (await alleZeilen(supabase, "mastr_regions", "region_id, name, level")) as {
    region_id: string;
    name: string;
    level: string;
  }[];
  const nameByAgs = new Map(regionen.filter((r) => r.level === "gemeinde").map((r) => [r.region_id, r.name]));

  const jeVersorger = new Map<string, { ags: string; name: string }[]>();
  for (const l of links) {
    if (l.rolle === "beteiligung") continue;
    const arr = jeVersorger.get(l.utility_id) ?? [];
    arr.push({ ags: l.commune_id, name: nameByAgs.get(l.commune_id) ?? l.commune_id });
    jeVersorger.set(l.utility_id, arr);
  }

  const offen = utils.filter(
    (u) => u.website && nurAmpel.includes(u.pruefung_ampel ?? "") && (jeVersorger.get(u.id)?.length ?? 0) > 0,
  );
  log(`${offen.length} unsichere Versorger mit Website werden gegen ihre eigene Seite geprüft`);

  const zaehler = { erreicht: 0, gebietsseite: 0, belegt: 0, widerspruch: 0 };
  const aenderungen: { id: string; name: string; pruefung_ampel: string; pruefung: unknown }[] = [];
  let naechster = 0;

  async function arbeiter(): Promise<void> {
    for (;;) {
      const i = naechster++;
      if (i >= offen.length) return;
      const u = offen[i];
      const gebiet = jeVersorger.get(u.id) ?? [];
      const start = /^https?:\/\//i.test(u.website!) ? u.website! : `https://${u.website}`;

      const html = await holeSeite(start);
      if (!html) continue;
      zaehler.erreicht++;

      let text = toText(html);
      const gebietsUrl = findeGebietsLink(html, start);
      if (gebietsUrl) {
        const seite = await holeSeite(gebietsUrl);
        if (seite) {
          zaehler.gebietsseite++;
          text += "\n" + toText(seite);
        }
      }

      const genannt = genannteOrte(text, gebiet);
      const befund =
        genannt.size >= WEB_MIN_TREFFER
          ? {
              test: "website" as const,
              ergebnis: "ok" as const,
              text: `Die eigene Website nennt ${genannt.size} der ${gebiet.length} zugeordneten Gemeinden${gebietsUrl ? " (auch auf der Gebietsseite)" : ""}.`,
            }
          : genannt.size === 1
            ? {
                test: "website" as const,
                ergebnis: "unpruefbar" as const,
                text: "Die eigene Website nennt nur eine der zugeordneten Gemeinden — das kann die Anschrift sein.",
              }
            : gebietsUrl
              ? {
                  // Nur wenn der Versorger sein Gebiet ueberhaupt ausweist, ist
                  // das Fehlen unserer Gemeinden eine Aussage.
                  test: "website" as const,
                  ergebnis: "auffaellig" as const,
                  text: "Der Versorger weist sein Gebiet auf der Website aus — unsere Gemeinden stehen nicht darin.",
                }
              : {
                  // Die meisten Seiten zaehlen ihre Gemeinden schlicht nicht auf.
                  // Das ist kein Widerspruch, sondern Schweigen.
                  test: "website" as const,
                  ergebnis: "unpruefbar" as const,
                  text: "Die Website nennt keine Gemeinden — sie weist ihr Gebiet nicht aus.",
                };
      if (befund.ergebnis === "ok") zaehler.belegt++;
      if (befund.ergebnis === "auffaellig") zaehler.widerspruch++;

      // Ampel neu bilden: die bisherigen Befunde plus der Website-Beleg.
      const befunde = [...(u.pruefung ?? []).filter((b) => b.test !== "website"), befund];
      const identitaet = befunde.filter((b) => ["sitz", "name", "website"].includes(b.test));
      const widerspricht = identitaet.filter((b) => b.ergebnis === "auffaellig").length;
      const bestaetigt = identitaet.filter((b) => b.ergebnis === "ok").length;
      const qualitaet = befunde.filter((b) => ["streuung", "dominanz"].includes(b.test) && b.ergebnis === "auffaellig").length;
      const ampel =
        widerspricht > 0 && bestaetigt === 0 ? "rot" : widerspricht > 0 || bestaetigt === 0 || qualitaet > 0 ? "gelb" : "gruen";

      aenderungen.push({ id: u.id, name: u.name, pruefung_ampel: ampel, pruefung: befunde });
      if ((i + 1) % 25 === 0) log(`  [${i + 1}/${offen.length}] belegt ${zaehler.belegt}`);
    }
  }

  await Promise.all(Array.from({ length: PARALLEL }, () => arbeiter()));

  const neuGruen = aenderungen.filter((a) => a.pruefung_ampel === "gruen").length;
  log(
    `Erreicht ${zaehler.erreicht} · eigene Gebietsseite gefunden ${zaehler.gebietsseite} · ` +
      `Gebiet belegt ${zaehler.belegt} · Website nennt keine der Gemeinden ${zaehler.widerspruch}`,
    "ok",
  );
  log(`  davon jetzt bestätigt: ${neuGruen}`);

  if (dry) {
    log("Trockenlauf — nichts geschrieben", "ok");
    return;
  }
  for (let i = 0; i < aenderungen.length; i += 200) {
    const { error } = await supabase.from("utilities").upsert(aenderungen.slice(i, i + 200), { onConflict: "id" });
    if (error) throw new Error(`Website-Prüfung schreiben: ${error.message}`);
  }
  log(`${aenderungen.length} Prüfergebnisse ergänzt`, "ok");
}

// ─── Website-Lauf: Ansprechpartner + Themen ───────────────────────────────────

/**
 * Was auf der Website steht: wer verantwortlich ist, welches Rollen-Postfach es
 * gibt und über welche Themen der Versorger berichtet.
 *
 * Die Auswertung selbst kommt aus `lib/kommunen-profil.ts` — dasselbe Modul, das
 * die Kommunen-Session an ~90 Gemeinden gemessen hat, nur mit dem
 * Versorger-Vokabular. KEINE zweite Kontaktsuche: die drei teuer erkauften Regeln
 * (nur eigene Domain zählt, fremde Domain ist ein Fund, Sonderzeichen VOR dem
 * Entfernen der Tags auflösen) sollen nicht in einer Kopie verlorengehen.
 *
 * Was dieser Lauf ausdrücklich NICHT tut, weil dort gemessen wurde, dass es
 * nichts bringt: Links aus der Navigation verfolgen (1 brauchbarer Treffer auf
 * 15, dazu mehrere falsche) und die Kontaktseite zusätzlich durchsuchen (0 %
 * zusätzliche Treffer — die Begriffe stehen im Menü, das auf jeder Unterseite
 * gleich ist).
 */

const UA = "solar-check.io versorger-profil/1.0 (+https://solar-check.io; hey@solar-check.io)";
const ABRUF_TIMEOUT_MS = 15000;
/** Gleichzeitige Abrufe. Vier verschiedene Hosts parallel ist höflich; mehr
 *  bringt wenig, weil ohnehin jeder Host nur einmal drankommt. */
const PARALLEL = 4;

async function holeSeite(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ABRUF_TIMEOUT_MS);
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    if (!res.ok) return null;
    const typ = res.headers.get("content-type") ?? "";
    if (typ && !/text\/html|application\/xhtml/i.test(typ)) return null;
    return await res.text();
  } catch {
    return null;
  }
}

type ProfilErgebnis = {
  id: string;
  /** Muss mit, obwohl unveraendert: Ein Einfuegen-oder-Aktualisieren ist im Kern
   *  ein INSERT und scheitert sonst an der Pflichtspalte. Genau daran ist der
   *  erste vollstaendige Lauf nach 814 abgeklopften Websites gestorben. */
  name: string;
  impressum_url: string | null;
  rollen_email: string | null;
  personen_email: string | null;
  verantwortlich_zeile: string | null;
  verantwortlich_funktion: string | null;
  verantwortlich_operativ: boolean | null;
  verbund_domain: string | null;
  themen: { thema: string; url: string; begriff: string }[];
  profil_geprueft_am: string;
};

async function profilFuer(
  u: { id: string; name: string; website: string },
  profil: typeof import("../lib/kommunen-profil"),
): Promise<ProfilErgebnis | null> {
  const start = /^https?:\/\//i.test(u.website) ? u.website : `https://${u.website}`;
  const html = await holeSeite(start);
  if (!html) return null;

  const dom = profil.domainOf(start);
  const vok = profil.VERSORGER_VOKABULAR;
  const themen = profil.extractThemen(html, start, vok);
  const impUrl = profil.findImpressumUrl(html, start);

  let rollen: string | null = null;
  let person: string | null = null;
  let verbund: string | null = null;
  let zeile: string | null = null;
  let funktion: string | null = null;
  let operativ: boolean | null = null;

  if (impUrl) {
    const imp = await holeSeite(impUrl);
    if (imp) {
      const text = profil.toText(imp);
      const v = profil.extractVerantwortlich(text, vok);
      // Fremde Domain gilt hier NICHT als verwandt: bei Gemeinden belegt sie die
      // gemeinsame Verwaltung, bei Versorgern wäre es eine Konzernmutter oder ein
      // Dienstleister — das ist ein Fund für den Menschen, keine eigene Adresse.
      const a = profil.extractAdressen(text, dom, () => false, vok);
      rollen = a.rollenEmail;
      person = a.personenEmail;
      verbund = a.verwaltungDomain;
      if (v) {
        zeile = v.zeile;
        funktion = v.funktion;
        operativ = v.operativ;
      }
    }
  }

  return {
    id: u.id,
    name: u.name,
    impressum_url: impUrl,
    rollen_email: rollen,
    personen_email: person,
    verantwortlich_zeile: zeile,
    verantwortlich_funktion: funktion,
    verantwortlich_operativ: operativ,
    verbund_domain: verbund,
    themen,
    profil_geprueft_am: new Date().toISOString(),
  };
}

async function laufProfil(opts: { limit?: number; erneut: boolean; dry: boolean }): Promise<void> {
  const supabase = await makeClient();
  const profil = await import("../lib/kommunen-profil");

  let query = supabase.from("utilities").select("id, name, website").not("website", "is", null);
  if (!opts.erneut) query = query.is("profil_geprueft_am", null);
  const { data, error } = await query.order("name").limit(opts.limit ?? 2000);
  if (error) throw new Error(error.message);

  const offen = (data ?? []) as { id: string; name: string; website: string }[];
  log(`${offen.length} Websites abzuklopfen (${opts.erneut ? "alle" : "noch ungeprüfte"})`);
  if (offen.length === 0) return;

  const zaehler = { erreicht: 0, impressum: 0, rollen: 0, verantwortlich: 0, operativ: 0, themen: 0, foerderung: 0 };
  const ergebnisse: ProfilErgebnis[] = [];
  let naechster = 0;

  async function arbeiter(): Promise<void> {
    for (;;) {
      const i = naechster++;
      if (i >= offen.length) return;
      const u = offen[i];
      const e = await profilFuer(u, profil);
      if (e) {
        zaehler.erreicht++;
        if (e.impressum_url) zaehler.impressum++;
        if (e.rollen_email) zaehler.rollen++;
        if (e.verantwortlich_zeile) zaehler.verantwortlich++;
        if (e.verantwortlich_operativ) zaehler.operativ++;
        if (e.themen.length) zaehler.themen++;
        if (e.themen.some((t) => t.thema === "foerderung")) zaehler.foerderung++;
        ergebnisse.push(e);
      }
      if ((i + 1) % 50 === 0) log(`  [${i + 1}/${offen.length}] erreicht ${zaehler.erreicht}`);
    }
  }

  await Promise.all(Array.from({ length: PARALLEL }, () => arbeiter()));

  log(
    `Erreicht ${zaehler.erreicht} · Impressum ${zaehler.impressum} · Rollen-Postfach ${zaehler.rollen} · ` +
      `Verantwortliche ${zaehler.verantwortlich} (operativ ${zaehler.operativ}) · ` +
      `Themen ${zaehler.themen} · davon Förder-Fundstelle ${zaehler.foerderung}`,
    "ok",
  );

  // Erst ablegen, dann schreiben. Beim ersten vollstaendigen Lauf sind 814
  // Ergebnisse verlorengegangen, weil das Schreiben scheiterte — und ein neuer
  // Lauf belastet nicht nur uns, sondern 910 fremde Server ein zweites Mal.
  mkdirSync(dirname(PROFIL_DATEI), { recursive: true });
  writeFileSync(PROFIL_DATEI, JSON.stringify(ergebnisse));
  log(`Ergebnisse abgelegt (utilities/profillauf.json)`);

  if (opts.dry) {
    log("Trockenlauf — nichts geschrieben", "ok");
    return;
  }
  for (let i = 0; i < ergebnisse.length; i += 200) {
    const teil = ergebnisse.slice(i, i + 200).map((e) => ({ ...e, themen: e.themen }));
    const { error: upErr } = await supabase.from("utilities").upsert(teil, { onConflict: "id" });
    if (upErr) throw new Error(`Profil schreiben: ${upErr.message}`);
  }
  log(`${ergebnisse.length} Profile geschrieben`, "ok");
}

// ─── Beispieldaten ────────────────────────────────────────────────────────────

/** Erkennungszeichen der Beispieldatensätze — nur so sind sie wieder restlos
 *  löschbar, ohne echte Erfassung anzufassen. */
const DEMO_MARKE = "DEMO";

/**
 * Beispieldatensätze anlegen, damit das Cockpit von der ersten Minute an etwas
 * zeigt (leere Rangliste = nichts zu sehen, und unter fünf Versorgern gibt es
 * bewusst gar keine Platzierung).
 *
 * WICHTIG — was hier echt ist und was nicht:
 *   ECHT sind die Zahlen. Sie kommen aus den amtlichen Anlagendaten der
 *   jeweiligen Gemeinde, genau wie im späteren Betrieb.
 *   PLATZHALTER ist der Versorger. „Stadtwerke <Ort>" ist aus dem Gemeindenamen
 *   gebildet, nicht recherchiert — in Köln heißt der Versorger RheinEnergie, in
 *   Nürnberg N-ERGIE. Deshalb tragen alle Einträge die Notiz „DEMO", keine
 *   Website, und die Sitz-Zuordnung die Herkunft „vermutet".
 *
 * Vor der echten Erfassung mit --clear-demo entfernen.
 */
/**
 * Was bietet der Versorger ENDKUNDEN an?
 *
 * Betreiber-Vorgabe vom 29.08.2026: „Nutzer suchen explizit nach Hilfe bei der
 * Montage. Dazu können wir passende Betriebe listen — egal ob Versorger oder
 * nicht." Das Merkmal wird deshalb in beiden Beständen erhoben.
 *
 * **Die Bestände bleiben getrennt.** Geteilt ist die Mechanik (Muster,
 * Seitenauswahl), nicht die Einordnung: Ein Stadtwerk, das Balkonkraftwerke
 * verkauft, ist kein Handwerksbetrieb und gehört nicht in dessen Tabelle.
 *
 * Der Weg ist derselbe wie dort und aus demselben Grund gewählt: Startseite,
 * dann die Unterseiten, die nach Angebot klingen. Die Sitemap wurde am selben
 * Tag gemessen und verworfen — sie ist vollständiger und dadurch schlechter.
 */
async function laufAngebot(opts: { limit?: number; erneut: boolean; dry: boolean }): Promise<void> {
  const supabase = await makeClient();
  const alle = (await alleZeilen(
    supabase,
    "utilities",
    "id, name, website, geschaeftsfelder, angebot_geprueft_am",
  )) as {
    id: string;
    name: string;
    website: string | null;
    geschaeftsfelder: string[] | null;
    angebot_geprueft_am: string | null;
  }[];

  const offen = alle
    .filter((u) => u.website)
    .filter((u) => opts.erneut || !u.angebot_geprueft_am)
    .slice(0, opts.limit ?? 200);

  log(`${offen.length} Versorger mit Website — Angebot lesen`);
  if (opts.dry) {
    for (const u of offen.slice(0, 10)) log(`  ${u.name}`);
    log("--dry: nichts abgerufen", "ok");
    return;
  }

  const zeilen: Record<string, unknown>[] = [];
  let fertig = 0,
    mitFeld = 0,
    mitBalkon = 0;

  const wegschreiben = async (alles: boolean) => {
    if (!alles && zeilen.length < 100) return;
    const z = zeilen.splice(0, zeilen.length);
    if (!z.length) return;
    const { error } = await supabase.from("utilities").upsert(z, { onConflict: "id" });
    if (error) throw new Error(`utilities schreiben: ${error.message}`);
  };

  for (const u of offen) {
    fertig++;
    if (fertig % 50 === 0) log(`  ${fertig}/${offen.length}`);
    const basis = u.website!.startsWith("http") ? u.website! : `https://${u.website}`;
    const start = await holeSeite(basis);
    if (!start) continue;

    const gefunden = new Set(u.geschaeftsfelder ?? []);
    const seiten = angebotsSeiten(start, basis);
    for (const f of FELDER) if (f.muster.test(sichtbarerText(start))) gefunden.add(f.name);
    // Eine Adresse, die das Wort trägt, ist der Beleg — null Abrufe.
    for (const s of seiten)
      for (const f of FELDER) if (f.muster.test(adresseLesbar(s))) gefunden.add(f.name);
    for (const s of seiten.slice(0, 5)) {
      if (gefunden.size === FELDER.length) break;
      const h = await holeSeite(s);
      if (h) for (const f of FELDER) if (f.muster.test(sichtbarerText(h))) gefunden.add(f.name);
    }

    if (gefunden.size) mitFeld++;
    if (gefunden.has("balkonkraftwerk")) mitBalkon++;
    zeilen.push({
      id: u.id,
      // Pflichtspalte: Ein Einfügen-oder-Aktualisieren ist im Kern ein INSERT.
      name: u.name,
      geschaeftsfelder: [...gefunden],
      angebot_geprueft_am: new Date().toISOString(),
    });
    await wegschreiben(false);
  }
  await wegschreiben(true);
  log(
    `${offen.length} geprüft, ${mitFeld} mit erkennbarem Angebot — Balkonkraftwerk: ${mitBalkon}`,
    "ok",
  );
}

async function seedDemo(): Promise<void> {
  const supabase = await makeClient();

  const { data: regions, error } = await supabase
    .from("mastr_regions")
    .select("region_id, name, population")
    .eq("level", "gemeinde")
    .gt("population", 0)
    .order("population", { ascending: false })
    .limit(12);
  if (error) throw new Error(error.message);

  for (const r of regions ?? []) {
    const name = `Stadtwerke ${r.name}`;
    const { data: vorhanden } = await supabase.from("utilities").select("id").eq("name", name).maybeSingle();
    if (vorhanden) {
      log(`${name} gibt es schon — übersprungen`);
      continue;
    }
    const { data: neu, error: insErr } = await supabase
      .from("utilities")
      .insert({
        name,
        typ: "stadtwerk",
        sitz_gemeinde_id: r.region_id,
        status: "offen",
        notiz: `${DEMO_MARKE} – Beispieldatensatz. Name ist ein Platzhalter, die Zahlen sind echt. Entfernen mit --clear-demo.`,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    const { error: linkErr } = await supabase.from("utility_communes").upsert(
      { utility_id: neu.id, commune_id: r.region_id, rolle: "sitz", zuordnung_quelle: "vermutet" },
      { onConflict: "utility_id,commune_id" },
    );
    if (linkErr) throw new Error(linkErr.message);
    log(`${name} angelegt (${(r.population as number).toLocaleString("de-DE")} Ew.)`, "ok");
  }
  log("Beispieldaten angelegt — Namen sind Platzhalter, Zahlen echt", "ok");
}

/** Alle Beispieldatensätze wieder entfernen (nur die mit der DEMO-Notiz). */
async function clearDemo(): Promise<void> {
  const supabase = await makeClient();
  const { data, error } = await supabase
    .from("utilities")
    .delete()
    .like("notiz", `${DEMO_MARKE}%`)
    .select("id");
  if (error) throw new Error(error.message);
  // Zuordnungen hängen per ON DELETE CASCADE mit dran.
  log(`${data?.length ?? 0} Beispieldatensätze entfernt`, "ok");
}

// ─── Bestand ──────────────────────────────────────────────────────────────────

/** Alle Zeilen einer Tabelle, seitenweise.
 *  Ein einfaches `select()` liefert nur die ersten 1.000 Zeilen — der Bericht
 *  meldete damit „1.000 Zuordnungen" bei 11.407 tatsächlichen und daraufhin 924
 *  Versorger als angeblich ohne Gebiet. Ein Bericht, der still bei 1.000 abschneidet,
 *  ist schlimmer als keiner. */
async function alleZeilen(supabase: SupabaseLike, tabelle: string, spalten: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await supabase.from(tabelle).select(spalten).range(von, von + 999);
    if (error) throw new Error(`${tabelle}: ${error.message}`);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function stats(): Promise<void> {
  const supabase = await makeClient();

  const u = (await alleZeilen(supabase, "utilities", "id, name, typ, status, pruefung_ampel")) as {
    id: string;
    name: string;
    typ: string;
    status: string;
    pruefung_ampel: string | null;
  }[];
  const l = (await alleZeilen(supabase, "utility_communes", "utility_id, commune_id, rolle, zuordnung_quelle")) as {
    utility_id: string;
    commune_id: string;
    rolle: string;
    zuordnung_quelle: string;
  }[];
  log(`${u.length} Versorger erfasst`);
  for (const typ of ["stadtwerk", "regionalversorger", "genossenschaft"]) {
    const n = u.filter((r) => r.typ === typ).length;
    if (n) log(`  ${typ}: ${n}`);
  }

  const gebiet = l.filter((r) => r.rolle !== "beteiligung");
  log(`${gebiet.length} Gemeinde-Zuordnungen im Gebiet (${l.length} insgesamt)`);
  for (const q of ["gemessen", "verlinkt", "recherchiert", "vermutet"]) {
    const n = gebiet.filter((r) => r.zuordnung_quelle === q).length;
    log(`  ${q}: ${n}`);
  }

  const proGemeinde = new Map<string, number>();
  for (const r of gebiet) proGemeinde.set(r.commune_id, (proGemeinde.get(r.commune_id) ?? 0) + 1);
  const doppelt = Array.from(proGemeinde.values()).filter((n) => n > 1).length;
  log(`${proGemeinde.size} Gemeinden abgedeckt, davon ${doppelt} bei mehreren Versorgern`);

  // Stand der Gebiets-Pruefung — die wichtigste Zahl fuer die Nacharbeit.
  const ampeln = new Map<string, number>();
  for (const r of u as unknown as { pruefung_ampel?: string }[]) {
    const k = r.pruefung_ampel ?? "ungeprüft";
    ampeln.set(k, (ampeln.get(k) ?? 0) + 1);
  }
  const AMPEL_WORT: Record<string, string> = {
    gruen: "bestätigt",
    gelb: "teilweise prüfbar",
    rot: "widersprüchlich",
    "ungeprüft": "ungeprüft",
  };
  log("Gebiets-Prüfung:");
  for (const [k, n] of Array.from(ampeln.entries()).sort((a, b) => b[1] - a[1])) {
    log(`  ${AMPEL_WORT[k] ?? k}: ${n}`);
  }

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
  const doImport = argv.includes("--import");
  const doProfil = argv.includes("--profil");
  const doPruefen = argv.includes("--pruefen");
  const doWebPruefen = argv.includes("--pruefen-web");
  const doAngebot = argv.includes("--angebot");
  const doStats = argv.includes("--stats");
  const doSeed = argv.includes("--seed-demo");
  const doClear = argv.includes("--clear-demo");
  const dry = argv.includes("--dry");

  if (!doSetup && !doImport && !doProfil && !doPruefen && !doWebPruefen && !doStats && !doSeed && !doClear && !doAngebot) {
    log(
      "Nichts zu tun. Flags:\n" +
        "  --setup       Tabellen anlegen/erweitern (idempotent)\n" +
        "  --import      Netzbetreiber + gemessene Netzgebiete aus dem Registerexport\n" +
        "  --profil      Websites abklopfen: Ansprechpartner + Themen\n" +
        "  --pruefen     Gebiete systematisch pruefen (Sitz, Name, Streuung, Dominanz)\n" +
        "  --pruefen-web Unsichere Gebiete gegen die eigene Website des Versorgers pruefen\n" +
        "  --angebot     Was der Versorger Endkunden anbietet (Balkonkraftwerk, PV, Waermepumpe)\n" +
        "  --stats       Bestand + Deckung melden\n" +
        "  --seed-demo   12 Beispieldatensätze (Namen Platzhalter, Zahlen echt)\n" +
        "  --clear-demo  Beispieldatensätze wieder entfernen\n" +
        "  --dry         nichts schreiben\n" +
        "  --refetch     Registerexport neu lesen statt Zwischenstand",
      "err",
    );
    process.exit(1);
  }
  if (doSetup) await setup();
  if (doClear) await clearDemo();
  if (doImport) await importRegister(dry, argv.includes("--refetch"));
  if (doPruefen) await laufPruefung(dry);
  if (doWebPruefen) await laufWebPruefung(dry, ["gelb", "rot"]);
  if (doProfil) {
    const limitArg = argv.find((a) => a.startsWith("--limit="));
    await laufProfil({
      limit: limitArg ? parseInt(limitArg.slice(8), 10) : undefined,
      erneut: argv.includes("--refetch"),
      dry,
    });
  }
  if (doAngebot) {
    const limitArg = argv.find((a) => a.startsWith("--limit="));
    await laufAngebot({
      limit: limitArg ? parseInt(limitArg.slice(8), 10) : undefined,
      erneut: argv.includes("--refetch"),
      dry,
    });
  }
  if (doSeed) await seedDemo();
  if (doStats) await stats();
  log("Fertig", "ok");
}

main().catch((err) => {
  log((err as Error).message, "err");
  process.exit(1);
});
