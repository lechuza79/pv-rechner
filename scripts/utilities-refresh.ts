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
    CREATE UNIQUE INDEX IF NOT EXISTS idx_utilities_mastr ON utilities (mastr_nummer)
      WHERE mastr_nummer IS NOT NULL;
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

async function importRegister(dry: boolean): Promise<void> {
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

  if (dry) {
    log(`Trockenlauf: ${akteure.size} Versorger, ${gebiete.size} mit Gebiet — nichts geschrieben`, "ok");
    return;
  }

  // ── 5. Schreiben ────────────────────────────────────────────────────────────
  const supabase = await makeClient();
  const gueltigeGemeinden = await ladeGemeindeIds(supabase);

  const zeilen = Array.from(akteure.values()).map((a) => {
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
  const doImport = argv.includes("--import");
  const doStats = argv.includes("--stats");
  const doSeed = argv.includes("--seed-demo");
  const doClear = argv.includes("--clear-demo");
  const dry = argv.includes("--dry");

  if (!doSetup && !doImport && !doStats && !doSeed && !doClear) {
    log(
      "Nichts zu tun. Flags:\n" +
        "  --setup       Tabellen anlegen/erweitern (idempotent)\n" +
        "  --import      Netzbetreiber + gemessene Netzgebiete aus dem Registerexport\n" +
        "  --stats       Bestand + Deckung melden\n" +
        "  --seed-demo   12 Beispieldatensätze (Namen Platzhalter, Zahlen echt)\n" +
        "  --clear-demo  Beispieldatensätze wieder entfernen\n" +
        "  --dry         nichts schreiben",
      "err",
    );
    process.exit(1);
  }
  if (doSetup) await setup();
  if (doClear) await clearDemo();
  if (doImport) await importRegister(dry);
  if (doSeed) await seedDemo();
  if (doStats) await stats();
  log("Fertig", "ok");
}

main().catch((err) => {
  log((err as Error).message, "err");
  process.exit(1);
});
