import { observedFields } from "../lib/contact-evidence";
import { fetchContactPage, recordContactPage } from "./lib/contact-fetch";
/**
 * Presse- und Creator-Katalog — Erhebung in Phasen, jede mit Gedächtnis.
 *
 * Vierte Erhebung dieses Repos nach Gemeinden, Versorgern und Fachbetrieben; die
 * Mechanik ist dieselbe, das Vokabular ist ein anderes (Memory-Regel
 * „Erhebungs-Maschine teilen": Mechanik geteilt, Befunde NICHT).
 *
 * Nutzung:
 *   npm run presse -- --setup                 Tabellen anlegen (idempotent)
 *   npm run presse -- --saat                  Saat in die Datenbank schreiben
 *   npm run presse -- --eichen <domain>       EIN Medium vollständig ausgeben, ohne zu schreiben
 *   npm run presse -- --profil --paket 1      Websites lesen und auswerten
 *   npm run presse -- --profil --refetch      auch schon gelesene noch einmal
 *   npm run presse -- --csv > katalog.csv     Katalog ausgeben
 *   npm run presse -- --stats                 was drin ist
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DREI ENTSCHEIDUNGEN, DIE NICHT „AUFGERÄUMT" WERDEN DÜRFEN
 *
 * 1. KEIN MERKMAL OHNE BELEG. Jeder Fund landet mit Fundstelle, Quell-Adresse
 *    und Datum in `presse_belege`. Die Spalten in `presse_medien` sind die
 *    Auswertung daraus. Beim Fachbetriebe-Lauf hat genau das einen
 *    Schreibunfall gerettet, der 2.778 Merkmale gelöscht hatte.
 *
 * 2. KEINE ADRESSE OHNE FUNDSTELLE. Es wird nichts aus Namensmustern
 *    abgeleitet — weder `vorname.nachname@`, noch `redaktion@` „weil es das ja
 *    gibt". Eine erfundene Adresse geht in den Versand und kommt als
 *    Unzustellbarkeit zurück; schlimmer, sie kann bei jemand anderem ankommen.
 *
 * 3. „NICHT GEFUNDEN" UND „NICHT ANGESEHEN" BLEIBEN UNTERSCHEIDBAR. Auch der
 *    erfolglose Abruf behält den bisherigen Prüfstand und bekommt seinen Grund
 *    (`fehler`). Ohne das beginnt der nächste Lauf wieder bei denselben.
 */

import { resolve } from "node:path";
import { heuteInBerlin } from "../lib/zeit";
import { readFileSync, existsSync } from "node:fs";
import { sichtbarerText, entities, hostVon } from "../lib/fachbetrieb-extrakt";
import {
  redaktionsSeiten,
  PFAD_RUECKFALL,
  siehtNachImpressumAus,
  titelBrauchbar,
  istMarkeStattName,
  SEITENARTEN,
  ohneAdressVerschleierung,
  rollenAus,
  postfaecherAus,
  hatKontaktformular,
  medientypAus,
  themenAus,
  geschichtenZu,
  gattungAus,
  reichweiteAus,
  medienurteil,
  prioritaet,
  aufhaenger,
  type Rolle,
  type Themenfund,
  type Seitenart,
} from "../lib/presse-extrakt";
import { personenAus } from "../lib/personen-fund";
import {
  autorAmBeitrag,
  eigenerRechner,
  erzeugtEigeneDaten,
  kernfrageBehandelt,
  meldungsbetrieb,
  ueberschrift,
  istBeitrag,
  juengsterBeitragTage,
  urteile,
  verkauftDasProdukt,
  verweistAufFremdenRechner,
  zitiertFremdeQuelle,
  inhaltstext,
  type Befund,
} from "../lib/presse-eignung";
import { SAAT, doppelteInDerSaat, type Paket } from "../lib/presse-saat";
import {
  alsCsv,
  type KontaktZeile,
  type MediumZeile,
} from "../lib/presse-katalog";

// ─── Grundlagen ──────────────────────────────────────────────────────────────

/**
 * Zwei Kennungen, und die zweite ist keine Tarnung.
 *
 * Gemessen am 03.09.2026: spektrum.de antwortet der ersten Kennung mit 403 und
 * der zweiten mit 200 — der Filter greift an der fehlenden „Mozilla"-Vorsilbe,
 * die praktisch jede Bibliothek und jeder Browser trägt. Die zweite Kennung
 * nennt uns weiterhin beim Namen und mit Adresse; wer wissen will, wer da liest,
 * erfährt es. Was wir NICHT tun: uns als Browser ausgeben, Bot-Prüfungen lösen
 * oder Tarnwerkzeuge einsetzen (CLAUDE.md, Förderbereich).
 */
const UA = "solar-check.io presse/1.0 (+https://solar-check.io)";
const UA_KOMPATIBEL = "Mozilla/5.0 (compatible; solar-check.io presse/1.0; +https://solar-check.io)";
const FETCH_TIMEOUT_MS = 20000;
/** Wie viele Seiten je Medium höchstens geholt werden. Start + fünf Arten. */
const MAX_SEITEN = 6;

function log(msg: string, level: "info" | "ok" | "err" = "info"): void {
  const prefix = level === "ok" ? "✓ " : level === "err" ? "✗ " : "  ";
  // eslint-disable-next-line no-console
  console.log(prefix + msg);
}

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

async function makeClient(): Promise<SupabaseLike> {
  loadEnvFile();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen (.env.local)");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** PostgREST liefert stumm höchstens 1.000 Zeilen — deshalb immer blättern. */
async function alleZeilen<T>(
  sb: SupabaseLike,
  tabelle: string,
  spalten: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: (q: any) => any,
): Promise<T[]> {
  const out: T[] = [];
  const schritt = 1000;
  for (let von = 0; ; von += schritt) {
    let q = sb.from(tabelle).select(spalten).range(von, von + schritt - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${tabelle}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < schritt) break;
  }
  return out;
}

/** Ein Nullbyte aus fremdem HTML lässt den ganzen Stapel scheitern — beim
 *  Fachbetriebe-Lauf real nach 4.019 von 4.792 Zeilen passiert. */
function ohneSteuerzeichen<T>(wert: T): T {
  if (typeof wert === "string") {
    // eslint-disable-next-line no-control-regex
    return wert.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ") as unknown as T;
  }
  if (Array.isArray(wert)) return wert.map(ohneSteuerzeichen) as unknown as T;
  return wert;
}

/**
 * EIN BATCH-UPSERT VEREINHEITLICHT DIE SPALTENMENGE — BLOCKER.
 *
 * PostgREST baut aus einem Batch EIN INSERT mit einer Spaltenliste; eine Zeile
 * mit weniger Feldern setzt bei allen anderen NULL. Am 29.08.2026 hat das im
 * Fachbetriebe-Bestand 2.778 Merkmale gelöscht, ohne Fehler und ohne Warnung.
 * Deshalb wird nach Feldmenge gruppiert, statt sich auf eine Regel zu verlassen,
 * an die sich jeder Aufrufer erinnern müsste.
 */
async function upsert(
  sb: SupabaseLike,
  tabelle: string,
  zeilen: Record<string, unknown>[],
  onConflict: string,
): Promise<void> {
  if (!zeilen.length) return;
  const gruppen = new Map<string, Record<string, unknown>[]>();
  for (const z of zeilen) {
    const form = Object.keys(z).sort().join("|");
    gruppen.set(form, [...(gruppen.get(form) ?? []), z]);
  }
  const schluessel = onConflict.split(",")[0].trim();
  for (const g of gruppen.values()) {
    const sortiert = [...g]
      .map((z) => {
        const rein: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(z)) rein[k] = ohneSteuerzeichen(v);
        return rein;
      })
      .sort((a, b) => String(a[schluessel] ?? "").localeCompare(String(b[schluessel] ?? "")));
    for (let i = 0; i < sortiert.length; i += 500) {
      const { error } = await sb
        .from(tabelle)
        .upsert(sortiert.slice(i, i + 500), { onConflict, ignoreDuplicates: false });
      if (error) throw new Error(`${tabelle} schreiben (ab ${i}): ${error.message}`);
    }
  }
}

function heute(): string {
  return heuteInBerlin();
}

// ─── Setup ───────────────────────────────────────────────────────────────────

async function setup(): Promise<void> {
  const sb = await makeClient();
  // Interne Erhebungsdaten — wie kommunen_kontakt, utilities und fachbetriebe
  // BEWUSST ohne anon-Read: Die Sätze enthalten Namen und Funktionen von
  // Journalistinnen und Journalisten, also personenbezogene Daten. RLS an, keine
  // Policy, Zugriff nur über den Dienstschlüssel.
  const sql = `
    CREATE TABLE IF NOT EXISTS presse_medien (
      domain text PRIMARY KEY,
      -- Saat: VORANNAHMEN, im Katalog als „ungeprüft" gekennzeichnet, solange
      -- die Messung nichts Eigenes hergibt.
      saat_name text,
      saat_typ text,
      saat_schwerpunkt text,
      saat_gebiet text,
      gruppe text,
      paket integer NOT NULL DEFAULT 1,
      notiz text,
      -- Messung
      start_url text,
      titel text,
      medientyp text[],
      themen jsonb,
      geschichten text[],
      reichweite text,
      reichweite_quelle text,
      ist_medium text,
      medium_grund text,
      medium_merkmale text[],
      seiten jsonb,
      formular_url text,
      impressum_url text,
      prioritaet text,
      aufhaenger text,
      -- Warum bei diesem Medium nichts herauskam. NIE eine Vermutung über die
      -- Ursache, nur die Beobachtung: „auf den gelesenen Seiten steht keine
      -- Adresse". Ob das an Skript-Nachladen, einem Bild oder daran liegt, dass
      -- es wirklich keine gibt, sagt uns die Seite nicht.
      hinweis text,
      profil_at timestamptz,
      fehler text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE presse_medien ENABLE ROW LEVEL SECURITY;

    CREATE TABLE IF NOT EXISTS presse_kontakte (
      domain text NOT NULL REFERENCES presse_medien(domain) ON DELETE CASCADE,
      -- Der Schlüssel ist Name ODER Adresse — ein Verantwortlicher nach § 18
      -- MStV steht oft ohne eigene Adresse da, ein Postfach ohne Namen.
      schluessel text NOT NULL,
      name text,
      funktion text,
      rang integer NOT NULL DEFAULT 0,
      mail text,
      -- 'person' · 'redaktion' · 'allgemein' · 'werblich' · 'formular'
      mail_art text,
      formular_url text,
      -- Woher der Fund stammt. OHNE das ist er nicht nachprüfbar.
      quelle_url text NOT NULL,
      seitenart text,
      -- 'funktion' (Anker war die Rollenbezeichnung) oder 'adresse'
      anker text,
      fundstelle text,
      geprueft_am date NOT NULL,
      PRIMARY KEY (domain, schluessel)
    );
    ALTER TABLE presse_kontakte ENABLE ROW LEVEL SECURITY;

    CREATE TABLE IF NOT EXISTS presse_belege (
      domain text NOT NULL REFERENCES presse_medien(domain) ON DELETE CASCADE,
      merkmal text NOT NULL,
      wert text,
      quelle_url text NOT NULL,
      fundstelle text,
      gefunden_am date NOT NULL,
      PRIMARY KEY (domain, merkmal, quelle_url)
    );
    ALTER TABLE presse_belege ENABLE ROW LEVEL SECURITY;

    -- Nachträglich hinzugekommene Spalten. Ein CREATE TABLE IF NOT EXISTS fasst
    -- eine bestehende Tabelle NICHT an — wer nur dort ergänzt, hat die Spalte im
    -- Code und nicht in der Datenbank, und das Schreiben scheitert erst zur
    -- Laufzeit. Genau die Fehlerklasse, gegen die der Spalten-Abgleich im
    -- Gesundheitscheck gebaut wurde.
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS hinweis text;
    -- Der Arbeitsstand hängt am KONTAKT, nicht am Medium: Angeschrieben wird
    -- ein Mensch, und „Medium angesehen" ist bei einem Fachtitel mit acht
    -- Redakteurinnen keine Auskunft, mit der sich arbeiten lässt. Diese drei
    -- Spalten gehören dem Menschen an der Ansicht — der Erhebungslauf fasst sie
    -- nie an, sonst hätte die Tabelle zwei Schreiber mit widersprüchlichen
    -- Annahmen.
    -- Fachmedium oder Publikumsmedium, und die Wortzahl, aus der es gemessen
    -- wurde. Die Wortzahl wird MITGESCHRIEBEN, damit die Einstufung nachprüfbar
    -- bleibt: Ohne sie steht dort ein Urteil, dessen Grundlage niemand mehr
    -- nachrechnen kann.
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS gattung text;
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS woerter integer;
    -- Die HANDENTSCHEIDUNG steht in einer eigenen Spalte und wird vom
    -- Erhebungslauf nie angefasst. Sie in dieselbe zu schreiben hieße, dass der
    -- nächste Lauf sie überschreibt — und dann korrigiert man dieselbe
    -- Fehleinschätzung jeden Monat neu, ohne dass es auffällt.
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS gattung_hand text;
    -- Der Arbeitsstand des MEDIUMS — die Antwort auf „lohnt sich eine Ansprache
    -- überhaupt". Sie lässt sich nicht messen: Ob eine Redaktion eine fremde
    -- Datengeschichte aufnimmt, steht weder auf ihrer Startseite noch in ihrem
    -- Impressum. Drei Runden Musterschärfen (Themenzahl, Dichte, Rechtsform)
    -- haben jeweils das zuletzt genannte Beispiel gefangen und das nächste
    -- verfehlt; die vierte Runde wäre dieselbe Schleife gewesen.
    --
    -- Deshalb urteilt hier ein Mensch, EINMAL, und der Erhebungslauf fasst es
    -- nie an. Die Zustände sind dieselben wie beim Kontakt — zwei Vokabulare
    -- für dieselbe Frage wären eines zu viel.
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS eignung text NOT NULL DEFAULT 'offen';
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS eignung_grund text;
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS eignung_at timestamptz;
    -- Die Seite, auf der das Urteil steht, und die Zeile, die es trägt. Ein
    -- Urteil ohne Fundstelle ist eine Behauptung — dieselbe Regel wie für jedes
    -- andere Merkmal dieses Katalogs. Sie hat sich beim ersten Durchgang sofort
    -- bezahlt gemacht: Das Nachlesen der Belegseiten hat sechs von 32 Urteilen
    -- gedreht, darunter zwei in beide Richtungen falsche.
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS eignung_beleg text;
    -- Seit der Lauf das Urteil selbst ermittelt, braucht die HANDENTSCHEIDUNG
    -- eine eigene Spalte — sonst überschreibt sie der nächste Lauf, und man
    -- korrigiert dieselbe Fehleinschätzung jeden Monat neu. Dieselbe Bauform
    -- wie bei der Einordnung Fach/Publikum; ein Wächter liest den Lauf und wird
    -- rot, wenn er sie je anfasst.
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS eignung_hand text;
    -- Die Kreise, in denen eine Zeitung in den Suchergebnissen steht — ihr
    -- GEMESSENES Verbreitungsgebiet. Die Titel selbst nennen es nur als
    -- Fließtext („Nordhessen"), und daran scheiterte die Zuordnung
    -- Gemeinde → Zeitung.
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS kreise text[];
    -- Der jüngste Beitrag zum Thema: Überschrift und Alter in Tagen. Ein Beleg,
    -- der nur „behandelt das Thema" sagt, trägt keinen ersten Satz im
    -- Anschreiben — „Ihr Beitrag vom 2. September über den Speicherzubau" tut es.
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS anknuepfung_titel text;
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS anknuepfung_tage integer;

    -- Die Rubrik bestimmt den AUFHÄNGER, nicht die Eignung: ein Fachmedium wird
    -- auf seinen Fachbeitrag angesprochen, ein regionales Blatt auf die Zahlen
    -- seiner Region, ein Hersteller gar nicht redaktionell, sondern über den
    -- Vertrieb. Es gibt kein Ausschlusskriterium — auch ein eigener Rechner ist
    -- keins, wir bieten unter Umständen das bessere Werkzeug.
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS rubrik text;
    -- Der EINE gelesene Beitrag, an dem eine Ansprache anknüpft. Die Notiz hält
    -- fest, was drinsteht; der Grund hält fest, welche Lücke er offenlässt und
    -- welches unserer Werkzeuge sie füllt. Das Urteil ist deshalb dreiwertig
    -- (ja/nein/unklar): „unklar" heißt, dass kein Wort gelesen werden konnte —
    -- eine Sperre oder eine tote Adresse sagt nichts darüber, ob dort ein
    -- Aufhänger stünde, und ein geratenes Urteil wäre schlimmer als keins.
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS beleg_titel text;
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS beleg_url text;
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS beleg_notiz text;
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS beleg_am date;
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS beleg_traegt text;
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS beleg_traegt_grund text;
    -- Der eine Satz, was der gelesene Beitrag OFFENLAESST -- getrennt vom
    -- ausfuehrlichen Grund, weil nur dieser Satz ins Anschreiben passt.
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS beleg_luecke text;
    -- Welches unserer Werkzeuge die Luecke fuellt, als Schluessel aus
    -- lib/presse-werkzeuge.ts. Als LISTE statt als Fliesstext, damit die
    -- Zuordnung gegenpruefbar ist: Ein Beitrag ueber die Einspeiseverguetung
    -- bekam als Fliesstext-Vorschlag "Zubau je Gemeinde" angeboten, und in
    -- einem Absatz faellt so etwas niemandem auf.
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS werkzeug text[];
    -- Erscheinungsdatum und Alter DES GELESENEN Beitrags. Getrennt von
    -- anknuepfung_tage, das aus der ersten Erhebung stammt und den juengsten
    -- Beitrag des Mediums zu unseren Themen meinte, nicht den gelesenen: Wo
    -- sich beide vergleichen liessen, gehoerte das Alter in 36 von 37 Faellen
    -- zu einem anderen Artikel, und der Filter "traegt und aktuell" rechnete
    -- darauf. Gewonnen wird es aus der Analyse (lib/presse-beleg-datum.ts),
    -- wo das Datum fast immer woertlich steht.
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS beleg_datum date;
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS beleg_alter_tage integer;

    -- Der Schlüssel ist (Kreis × Frage), nicht der Kreis: Drei Fragen je Kreis
    -- finden je zur Hälfte andere Titel. Die erste Fassung hatte den Kreis
    -- allein als Schlüssel; CREATE TABLE IF NOT EXISTS fasst eine bestehende
    -- Tabelle nicht an, deshalb wird sie hier ausdrücklich verworfen — sie
    -- trägt nur Laufprotokoll, keine Funde.
    DROP TABLE IF EXISTS presse_kreissuche;
    CREATE TABLE IF NOT EXISTS presse_kreissuche (
      kreis_id text NOT NULL,
      frage text NOT NULL,
      fehler text,
      gelaufen_am date NOT NULL,
      PRIMARY KEY (kreis_id, frage)
    );
    ALTER TABLE presse_kreissuche ENABLE ROW LEVEL SECURITY;
    ALTER TABLE presse_medien ADD COLUMN IF NOT EXISTS eignung_zitat text;
    ALTER TABLE presse_kontakte ADD COLUMN IF NOT EXISTS stand text NOT NULL DEFAULT 'offen';
    ALTER TABLE presse_kontakte ADD COLUMN IF NOT EXISTS notiz text;
    ALTER TABLE presse_kontakte ADD COLUMN IF NOT EXISTS stand_at timestamptz;

    CREATE INDEX IF NOT EXISTS presse_kontakte_domain_idx ON presse_kontakte(domain);
    CREATE INDEX IF NOT EXISTS presse_medien_paket_idx ON presse_medien(paket);
  `;
  const { error } = await sb.rpc("exec_sql", { sql });
  if (error) throw new Error(`Setup: ${error.message}`);
  // OHNE DAS MELDET DER NÄCHSTE SCHRITT „Tabelle gibt es nicht" — PostgREST hält
  // das Schema im Zwischenspeicher und erfährt von neuen Tabellen erst beim
  // Neuladen. Real passiert beim ersten Lauf: Setup grün, Saat rot.
  await sb.rpc("exec_sql", { sql: "NOTIFY pgrst, 'reload schema';" });
  log("Tabellen angelegt: presse_medien, presse_kontakte, presse_belege", "ok");
}

// ─── Saat ────────────────────────────────────────────────────────────────────

async function saat(): Promise<void> {
  const doppelt = doppelteInDerSaat();
  if (doppelt.length) throw new Error(`Saat enthält Dubletten: ${doppelt.join(", ")}`);
  const sb = await makeClient();
  const zeilen = SAAT.map((s) => ({
    domain: s.domain,
    saat_name: s.name,
    saat_typ: s.typ,
    saat_schwerpunkt: s.schwerpunkt,
    saat_gebiet: s.gebiet,
    gruppe: s.gruppe ?? null,
    paket: s.paket,
    notiz: s.notiz ?? null,
  }));
  const { error: seedError } = await sb.from("presse_medien").upsert(zeilen, { onConflict: "domain", ignoreDuplicates: true });
  if (seedError) throw new Error(seedError.message);
  // The seed only adds organizations; discovery and human work are never removed by a seed refresh.
  log(`${zeilen.length} Medien in der Saat`, "ok");
}

// ─── Abruf ───────────────────────────────────────────────────────────────────

interface Seite {
  url: string;
  html: string;
  art: Seitenart | "start";
}

async function holeText(url: string): Promise<{ html: string; url: string } | null> {
  return (await holeMit(url, UA)) ?? (await holeMit(url, UA_KOMPATIBEL));
}

async function holeMit(url: string, ua: string): Promise<{ html: string; url: string } | null> {
  const result = await fetchContactPage(url, { timeoutMs: FETCH_TIMEOUT_MS, userAgent: ua,
    record: o => recordContactPage("presse", o) });
  return result.html === null ? null : { html: ohneAdressVerschleierung(result.html), url: result.observation.finalUrl! };
}

/** Startseite über beide Schreibweisen. Ein `www`-Zwang ist bei Verlagen
 *  verbreitet und ohne den Vorsatz schlicht ein Fehlschlag. */
async function holeStart(domain: string): Promise<{ html: string; url: string } | null> {
  for (const u of [`https://${domain}/`, `https://www.${domain}/`, `http://${domain}/`]) {
    const r = await holeText(u);
    if (r) return r;
  }
  return null;
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      for (;;) {
        const k = i++;
        if (k >= items.length) return;
        await fn(items[k]);
      }
    }),
  );
}

function titelAus(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i);
  if (og) return entities(og[1]).trim().slice(0, 120) || null;
  const t = html.match(/<title[^>]*>([\s\S]{1,200}?)<\/title>/i);
  if (!t) return null;
  // „pv magazine Deutschland — Nachrichten" → der Teil vor dem Trenner.
  const roh = entities(t[1].replace(/<[^>]*>/g, " "))
    .split(/\s+[|–—]\s+|\s+-\s+|:\s+/)[0]
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
  return roh || null;
}

// ─── Auswertung eines Mediums ────────────────────────────────────────────────

interface Auswertung {
  domain: string;
  start_url: string;
  titel: string | null;
  medientyp: string[];
  themen: Themenfund[];
  geschichten: string[];
  reichweite: string | null;
  reichweite_quelle: string | null;
  ist_medium: string;
  medium_grund: string;
  medium_merkmale: string[];
  seiten: Record<string, string>;
  formular_url: string | null;
  impressum_url: string | null;
  prioritaet: string;
  gattung: string;
  woerter: number | null;
  aufhaenger: string;
  hinweis: string | null;
  kontakte: Record<string, unknown>[];
  belege: Record<string, unknown>[];
}

function werteAus(domain: string, seiten: Seite[]): Auswertung {
  // Ohne Startseite trägt die erste erreichbare Seite die Grundangaben. Themen
  // lassen sich dann NICHT messen — und das steht dann auch so im Katalog,
  // statt einer Null, die wie „kein Thema" aussieht.
  const start = seiten.find((s) => s.art === "start");
  const grund = start ?? seiten[0];
  const tag = heute();

  // Themen kommen von der STARTSEITE — sie sagt, worüber gerade berichtet wird.
  const startText = start ? sichtbarerText(start.html) : null;
  const themen = startText ? themenAus(startText) : [];
  // Die Wortzahl wird MITGEMESSEN, weil ohne sie die Zahl der Fundstellen nichts
  // aussagt: Eine Tageszeitung nennt unser Thema zweimal auf einer Startseite
  // mit viertausend Wörtern, ein Fachtitel fünfundvierzigmal auf einer kürzeren.
  const woerter = startText ? startText.split(/\s+/).filter(Boolean).length : null;
  const gattung = gattungAus(themen, woerter);
  const geschichten = geschichtenZu(themen);

  // Medientyp aus allen Seiten: Der Newsletter-Hinweis steht oft nur im Fuß der
  // Kontaktseite, das Podcast-Format nur unter „Über uns".
  const gesamtText = seiten.map((s) => sichtbarerText(s.html)).join("\n");
  const medientyp = medientypAus(gesamtText);

  const urteil = medienurteil(grund.html);

  // Reichweite NUR von Mediadaten- und Über-uns-Seiten. Auf einer Startseite ist
  // jede große Zahl genauso oft eine Fördersumme aus einer Schlagzeile.
  let reichweite: { wert: string; fundstelle: string } | null = null;
  let reichweiteQuelle: string | null = null;
  for (const s of seiten.filter((x) => x.art === "mediadaten" || x.art === "ueber-uns")) {
    const r = reichweiteAus(sichtbarerText(s.html));
    if (r) {
      reichweite = r;
      reichweiteQuelle = s.url;
      break;
    }
  }

  const rohTitel = titelAus(grund.html);
  const titel = titelBrauchbar(rohTitel) ? rohTitel : null;

  // ── Kontakte ──────────────────────────────────────────────────────────────
  const kontakte = new Map<string, Record<string, unknown>>();
  const belege: Record<string, unknown>[] = [];

  // 1. Menschen über die Funktionsbezeichnung (der gesetzliche Anker).
  //
  // AUSDRÜCKLICH NICHT VON DER STARTSEITE. Dort steht Artikeltext, und der ist
  // voll von Namen mit Funktion — nur eben nicht von Menschen dieser Redaktion.
  // GEMESSEN am 03.09.2026: Auf sueddeutsche.de landete ein Ministerpräsident
  // aus einer Schlagzeile als „Redakteur" im Katalog. Ein falscher Name geht in
  // eine Anrede; das ist teurer als ein fehlender.
  for (const s of seiten.filter((x) => x.art !== "start")) {
    for (const r of rollenAus(s.html)) {
      if (istMarkeStattName(r.name, domain, titel)) continue;
      const key = `name:${r.name.toLowerCase()}`;
      const vorher = kontakte.get(key);
      if (vorher && Number(vorher.rang) >= r.rang) continue;
      kontakte.set(key, {
        domain,
        schluessel: key,
        name: r.name,
        funktion: r.funktion,
        rang: r.rang,
        mail: r.mail,
        mail_art: r.mail ? "person" : null,
        formular_url: null,
        quelle_url: s.url,
        seitenart: s.art,
        anker: "funktion",
        fundstelle: r.fundstelle,
        geprueft_am: tag,
      });
    }
  }

  // 2. Menschen über ihre persönliche Adresse (geteilt mit der
  //    Versorger-Erhebung). Ergänzt die erste Runde: Auf Teamseiten steht die
  //    Adresse oft ohne jede Funktionsbezeichnung daneben.
  for (const s of seiten.filter((x) => x.art !== "start")) {
    for (const p of personenAus(s.html)) {
      if (istMarkeStattName(p.name, domain, titel)) continue;
      const key = `name:${p.name.toLowerCase()}`;
      const vorher = kontakte.get(key);
      if (vorher) {
        // Nur die Adresse nachtragen, die Funktion aus Runde 1 behalten — sie
        // ist die eingeordnete, diese hier die rohe.
        if (!vorher.mail) {
          vorher.mail = p.mail;
          vorher.mail_art = "person";
        }
        continue;
      }
      kontakte.set(key, {
        domain,
        schluessel: key,
        name: p.name,
        funktion: p.funktion,
        rang: 50,
        mail: p.mail,
        mail_art: "person",
        formular_url: null,
        quelle_url: s.url,
        seitenart: s.art,
        anker: "adresse",
        fundstelle: `${p.name} · ${p.funktion ?? ""} · ${p.abschnitt ?? ""}`.trim(),
        geprueft_am: tag,
      });
    }
  }

  // 3. Postfächer — als eigene Einträge, damit ein Medium ohne benannte Person
  //    trotzdem erreichbar ist. Werbliche nur, wenn sonst gar nichts da ist
  //    (Vorgabe: keine Anzeigenkontakte, sofern ein redaktioneller Weg da ist).
  const postfaecher: {
    mail: string;
    rang: number;
    werblich: boolean;
    persoenlich: boolean;
    url: string;
    art: string;
  }[] = [];
  for (const s of seiten) {
    for (const p of postfaecherAus(s.html, domain)) {
      if (postfaecher.some((x) => x.mail === p.mail)) continue;
      postfaecher.push({ ...p, url: s.url, art: s.art });
    }
  }
  const redaktionell = postfaecher.filter((p) => !p.werblich);
  const genommen = redaktionell.length ? redaktionell : postfaecher;
  for (const p of genommen.sort((a, b) => b.rang - a.rang).slice(0, 4)) {
    const key = `mail:${p.mail}`;
    kontakte.set(key, {
      domain,
      schluessel: key,
      name: null,
      funktion: null,
      rang: Math.min(p.rang, 60),
      mail: p.mail,
      mail_art: p.werblich
        ? "werblich"
        : p.persoenlich
          ? "person-ohne-namen"
          : p.rang >= 90
            ? "redaktion"
            : "allgemein",
      formular_url: null,
      quelle_url: p.url,
      seitenart: p.art,
      anker: "adresse",
      fundstelle: `Postfach auf der Seite „${p.art}"`,
      geprueft_am: tag,
    });
  }

  // 4. Kontaktformular als Weg, wenn keine Adresse da ist.
  // NUR ein Formular auf der EIGENEN Domain. Gemessen auf taz.de: Als Kontaktweg
  // stand dort die Adresse eines Newsletter-Dienstleisters im Katalog — ein
  // Formular, das nichts an die Redaktion schickt.
  const formularSeite = seiten.find(
    (s) => hatKontaktformular(s.html) && s.art !== "start" && (hostVon(s.url) ?? "").endsWith(domain),
  );
  const formularUrl = formularSeite?.url ?? null;
  if (formularUrl && !genommen.length) {
    kontakte.set("formular", {
      domain,
      schluessel: "formular",
      name: null,
      funktion: null,
      rang: 30,
      mail: null,
      mail_art: "formular",
      formular_url: formularUrl,
      quelle_url: formularUrl,
      seitenart: formularSeite!.art,
      anker: "funktion",
      fundstelle: "Kontaktformular auf der Seite",
      geprueft_am: tag,
    });
  }

  // ── Belege ────────────────────────────────────────────────────────────────
  for (const t of themen) {
    belege.push({
      domain,
      merkmal: `thema:${t.name}`,
      wert: String(t.treffer),
      quelle_url: grund.url,
      fundstelle: `${t.treffer} Fundstellen auf der Startseite`,
      gefunden_am: tag,
    });
  }
  for (const m of medientyp) {
    belege.push({
      domain,
      merkmal: `medientyp:${m}`,
      wert: m,
      quelle_url: grund.url,
      fundstelle: "Merkmal im Seitentext",
      gefunden_am: tag,
    });
  }
  if (reichweite && reichweiteQuelle) {
    belege.push({
      domain,
      merkmal: "reichweite",
      wert: reichweite.wert,
      quelle_url: reichweiteQuelle,
      fundstelle: reichweite.fundstelle,
      gefunden_am: tag,
    });
  }
  for (const m of urteil.merkmale) {
    belege.push({
      domain,
      merkmal: `medium:${m}`,
      wert: "ja",
      quelle_url: grund.url,
      fundstelle: m,
      gefunden_am: tag,
    });
  }

  const alle = [...kontakte.values()];
  const beste = alle
    .filter((k) => k.name)
    .sort((a, b) => Number(b.rang) - Number(a.rang))[0] as unknown as
    | { name: string; funktion: string }
    | undefined;
  const rolleFuerAufhaenger: Rolle | null = beste
    ? { name: beste.name, funktion: beste.funktion ?? "Redaktion", rang: 0, fundstelle: "", mail: null }
    : null;

  const prio = prioritaet({
    themen,
    hatPerson: alle.some((k) => k.name),
    hatRedaktionsPostfach: genommen.some((p) => !p.werblich),
    hatIrgendeinenWeg: alle.length > 0,
    gattung,
  });

  const seitenKarte: Record<string, string> = {};
  for (const s of seiten) seitenKarte[s.art] = s.url;

  return {
    domain,
    start_url: grund.url,
    // Ein nichtssagender Titel wird VERWORFEN, nicht übernommen — der Katalog
    // fällt dann auf den Namen aus der Saat zurück (mit Vermerk).
    titel,
    medientyp,
    themen,
    geschichten,
    reichweite: reichweite?.wert ?? null,
    reichweite_quelle: reichweiteQuelle,
    ist_medium: urteil.ist,
    medium_grund: urteil.grund,
    medium_merkmale: urteil.merkmale,
    seiten: seitenKarte,
    formular_url: formularUrl,
    impressum_url: seitenKarte["impressum"] ?? null,
    prioritaet: prio,
    gattung,
    woerter,
    aufhaenger: aufhaenger(themen, rolleFuerAufhaenger),
    hinweis: hinweisZu(seiten, alle.length),
    kontakte: alle,
    belege,
  };
}

/**
 * Was zu sagen ist, wenn nichts herauskam — als BEOBACHTUNG, nie als Ursache.
 *
 * Die Seiten sagen nicht, warum keine Adresse darauf steht. Sie kann per Skript
 * nachgeladen sein, als Bild vorliegen oder wirklich fehlen. Wer eine dieser
 * drei Möglichkeiten in den Katalog schreibt, behauptet eine Feststellung, die
 * es nicht gab — dieselbe Fehlerklasse wie ein erfundenes Prüfdatum.
 */
function hinweisZu(seiten: Seite[], anzahlKontakte: number): string | null {
  const ohneStart = !seiten.some((s) => s.art === "start");
  if (anzahlKontakte > 0) {
    return ohneStart
      ? "Startseite nicht abrufbar (Sperre) — Themen nicht gemessen, Kontakt aus dem Impressum"
      : null;
  }
  const gelesen = seiten.map((s) => s.art).join(", ");
  const ohneImpressum = !seiten.some((s) => s.art === "impressum");
  return ohneImpressum
    ? `kein Impressum verlinkt oder auffindbar; gelesen: ${gelesen} — von Hand nachsehen`
    : `auf den gelesenen Seiten (${gelesen}) steht keine Adresse und kein Formular — von Hand nachsehen`;
}

/** Startseite plus die Unterseiten, die etwas tragen können. */
type ReadPages = Seite[] & { incomplete?: boolean };

async function holeMedium(domain: string): Promise<ReadPages | { fehler: string }> {
  let incomplete = false;
  const start = await holeStart(domain);
  // EINE GESPERRTE STARTSEITE IST KEIN GESPERRTES MEDIUM. Gemessen am
  // 03.09.2026 an sechs Madsack-Titeln: haz.de antwortet der Startseite mit 403
  // und dem Impressum mit 200 — dort steht die Chefredaktion mit Namen. Die
  // erste Fassung gab an dieser Stelle auf und meldete „nicht erreichbar"; das
  // ist eine Auskunft über uns, nicht über das Medium.
  const basis = start?.url ?? `https://www.${domain}/`;
  const seiten: Seite[] = start
    ? [{ url: start.url, html: start.html, art: "start" }]
    : [];

  const gefunden = start ? redaktionsSeiten(start.html, start.url) : {};
  // NACH der gesetzlichen Wichtigkeit sortiert, nicht nach der Reihenfolge im
  // Menü: Das Impressum muss als Erstes geholt werden, weil es bei Gleichstand
  // die Quelle für einen Fund stellt — es ist die einzige Seite, deren Angaben
  // das Recht erzwingt. Gemessen an zfk.de: In Menü-Reihenfolge stand der
  // Chefredakteur unter „Über uns" statt unter dem Impressum, obwohl dort
  // „Chefredaktion (V.i.S.d.P.)" wörtlich steht. Zweiter Grund: Bei mehr
  // gefundenen Seiten als MAX_SEITEN fiele sonst ausgerechnet das Impressum weg.
  const reihenfolge = SEITENARTEN.map((s) => s.art) as readonly Seitenart[];
  const arten = (Object.entries(gefunden ?? {}) as [Seitenart, string][]).sort(
    (a, b) => reihenfolge.indexOf(a[0]) - reihenfolge.indexOf(b[0]),
  );
  for (const [art, url] of arten.slice(0, MAX_SEITEN - 1)) {
    const r = await holeText(url);
    if (r) seiten.push({ url: r.url, html: r.html, art });
    else incomplete = true;
  }

  // Rückfallebene: Was über die Links nicht gefunden wurde, wird an den üblichen
  // Adressen PROBIERT und am Inhalt geprüft. Ohne sie fehlt bei Verlagen, deren
  // Menü per Skript entsteht, ausgerechnet das Impressum — die einzige Seite,
  // deren Inhalt das Recht erzwingt.
  for (const art of ["impressum", "redaktion", "team", "kontakt"] as const) {
    if (seiten.some((s) => s.art === art)) continue;
    for (const pfad of PFAD_RUECKFALL[art]) {
      let ziel: string;
      try {
        ziel = new URL(pfad, basis).toString();
      } catch {
        continue;
      }
      if (seiten.some((s) => s.url === ziel)) continue;
      const r = await holeText(ziel);
      if (!r) continue;
      // Nur übernehmen, wenn wirklich etwas drauf steht. Eine 404-Seite mit
      // Menü antwortet genauso mit 200 wie ein echtes Impressum.
      const text = sichtbarerText(r.html);
      const traegt = art === "impressum" ? siehtNachImpressumAus(text) : /@[\w-]+\.[a-z]{2,}/i.test(text);
      if (!traegt) continue;
      seiten.push({ url: r.url, html: r.html, art });
      break;
    }
  }

  // Die Redaktionsseite ist oft erst EINE EBENE unter dem Impressum oder der
  // Kontaktseite verlinkt — bei den Versorgern war das der Regelfall (die
  // Ansprechpartner standen in keiner Menüleiste). Deshalb ein zweiter Blick von
  // dort aus, aber nur nach den zwei Arten, die den Ertrag bringen.
  if (!gefunden.redaktion && !gefunden.team) {
    for (const s of seiten.filter((x) => x.art === "kontakt" || x.art === "impressum")) {
      const tiefer = redaktionsSeiten(s.html, s.url);
      for (const art of ["redaktion", "team"] as const) {
        const url = tiefer[art];
        if (!url || seiten.some((x) => x.url === url)) continue;
        const r = await holeText(url);
        if (r) seiten.push({ url: r.url, html: r.html, art });
        else incomplete = true;
      }
    }
  }
  if (!seiten.length) return { fehler: "weder Startseite noch Impressum erreichbar" };
  return Object.assign(seiten, { incomplete: incomplete || !start });
}

// ─── Phase: Profil ───────────────────────────────────────────────────────────

async function profil(paket: Paket | null, limit: number, refetch: boolean): Promise<void> {
  const sb = await makeClient();
  const alle = await alleZeilen<{ domain: string; paket: number; profil_at: string | null; fehler: string | null }>(
    sb,
    "presse_medien",
    "domain, paket, profil_at, fehler",
  );
  const offen = alle
    .filter((m) => (paket === null || m.paket === paket) && (refetch || !m.profil_at || !!m.fehler))
    .slice(0, limit);
  if (!offen.length) {
    log("nichts offen — mit --refetch noch einmal", "ok");
    return;
  }
  log(`${offen.length} Medien werden gelesen`);

  let medienZeilen: Record<string, unknown>[] = [];
  let kontaktZeilen: Record<string, unknown>[] = [];
  let belegZeilen: Record<string, unknown>[] = [];
  let ok = 0;
  let leer = 0;
  let kontakteGesamt = 0;

  /**
   * ZWISCHENSTAND SCHREIBEN — sonst kostet ein Abbruch den ganzen Lauf.
   *
   * Gemessen am 05.09.2026: Zwei Läufe über je 500 Regionalmedien liefen zehn
   * Minuten, starben und hinterließen NICHTS — der Bestand stand danach exakt
   * dort, wo er vorher stand, während das Protokoll hunderte gelesener Seiten
   * zeigte. Dieselbe Lehre wie bei den teuren Erhebungsläufen: Was nur am Ende
   * geschrieben wird, existiert bis dahin nicht.
   */
  const STAPEL = 50;
  let pendingWrite = Promise.resolve();
  function ablegen(): Promise<void> {
    // Detach synchronously before yielding: concurrent workers cannot flush the same batch twice.
    const media = medienZeilen.splice(0);
    const contacts = kontaktZeilen.splice(0);
    const evidence = belegZeilen.splice(0);
    pendingWrite = pendingWrite.then(async () => {
      if (!media.length) return;
      await upsert(sb, "presse_medien", media, "domain");
      // No delete/reinsert window. Omitted workflow columns survive an upsert.
      await upsert(sb, "presse_kontakte", contacts, "domain,schluessel");
      await upsert(sb, "presse_belege", evidence, "domain,merkmal,quelle_url");
      kontakteGesamt += contacts.length;
    });
    return pendingWrite;
  }

  await pool(offen, 6, async (m) => {
    // EIN kaputtes Medium darf den Lauf nicht abreißen. Real passiert: eine
    // Seite ohne abrufbare Startseite ließ die ganze Erhebung nach 201 Abrufen
    // mit einer Typmeldung stehen — die Arbeit war weg, die Abrufe bezahlt.
    // Dieselbe Lehre wie beim Fachbetriebe-Lauf, den zweimal eine einzige
    // kaputte Adresse abgerissen hat.
    let res: ReadPages | { fehler: string };
    try {
      res = await holeMedium(m.domain);
    } catch (e) {
      res = { fehler: `Abruf abgebrochen: ${e instanceof Error ? e.message : String(e)}` };
    }
    if ("fehler" in res) {
      // Preserve prior facts and their verification date; record only this failed attempt.
      medienZeilen.push({ domain: m.domain, fehler: res.fehler, updated_at: new Date().toISOString() });
      leer++;
      log(`${m.domain}: ${res.fehler}`, "err");
      return;
    }
    const a = werteAus(m.domain, res);
    const partial = !!res.incomplete;
    medienZeilen.push({
      ...observedFields({
      domain: a.domain,
      start_url: a.start_url,
      titel: a.titel,
      medientyp: a.medientyp,
      themen: a.themen,
      geschichten: a.geschichten,
      reichweite: a.reichweite,
      reichweite_quelle: a.reichweite_quelle,
      ist_medium: partial ? null : a.ist_medium,
      medium_grund: partial ? null : a.medium_grund,
      medium_merkmale: a.medium_merkmale,
      seiten: a.seiten,
      formular_url: a.formular_url,
      impressum_url: a.impressum_url,
      prioritaet: partial ? null : a.prioritaet,
      gattung: a.gattung,
      woerter: a.woerter,
      aufhaenger: a.aufhaenger,
      hinweis: a.hinweis,
      profil_at: partial ? null : new Date().toISOString(),
      fehler: null,
      updated_at: new Date().toISOString(),
      }), fehler: partial ? "Teilabruf: mindestens eine bekannte Seite nicht gelesen" : null,
    });
    kontaktZeilen.push(...a.kontakte.map(k => observedFields(k)));
    belegZeilen.push(...a.belege);
    ok++;
    const personen = a.kontakte.filter((k) => k.name).length;
    log(
      `${a.domain}: ${a.ist_medium}, ${personen} Person(en), ${a.kontakte.length} Kontakt(e), Prio ${a.prioritaet}`,
      "ok",
    );
    if (medienZeilen.length >= STAPEL) await ablegen();
  });
  await ablegen();

  log(`${ok} gelesen, ${leer} nicht erreichbar, ${kontakteGesamt} Kontakte`, "ok");
}

// ─── Phase: Suche ────────────────────────────────────────────────────────────

/**
 * Was gefragt wird, um Medien zu finden, die in der Saat fehlen.
 *
 * Dieselbe Bauart wie die Ortssuche der Fachbetriebe, nur mit anderem Vokabular.
 * Der Zweck ist ausdrücklich die ERGÄNZUNG einer benannten Liste, nicht ihr
 * Ersatz: Eine Suchmaschine liest nicht, sie sortiert thematisch vor — grob die
 * Hälfte der Fundstellen im Förderbereich war nichts, und hier ist es nicht
 * anders. Was sie liefert, ist eine Adresse; ob dort ein redaktionelles Angebot
 * wohnt, entscheidet erst der Profil-Lauf am Inhalt.
 */
export const SUCHFRAGEN: { frage: string; paket: Paket }[] = [
  { frage: "Podcast Photovoltaik Solarenergie deutsch", paket: 3 },
  { frage: "Podcast Energiewende Deutschland hören", paket: 3 },
  { frage: "YouTube Kanal Photovoltaik Balkonkraftwerk deutsch", paket: 3 },
  { frage: "Newsletter Energiewende abonnieren Redaktion", paket: 3 },
  { frage: "Blog Balkonkraftwerk Erfahrungen Redaktion", paket: 3 },
  { frage: "Podcast Stromspeicher Batterie deutsch", paket: 3 },
  { frage: "Fachzeitschrift Photovoltaik Redaktion", paket: 1 },
  { frage: "Fachmagazin Stadtwerke Energieversorger Redaktion", paket: 1 },
  { frage: "Fachzeitschrift Wärmepumpe Heizung Redaktion", paket: 1 },
  { frage: "Magazin Eigenheim Photovoltaik Ratgeber Redaktion", paket: 1 },
  { frage: "Zeitschrift kommunale Energiewende Redaktion", paket: 1 },
  { frage: "Datenjournalismus Energie Redaktion Deutschland", paket: 1 },
];

interface SerpTreffer {
  url: string;
  rang: number;
  titel: string;
}

async function serp(frage: string): Promise<{ treffer: SerpTreffer[]; fehler: string | null }> {
  const login = process.env.DATAFORSEO_LOGIN;
  const passwort = process.env.DATAFORSEO_PASSWORD;
  if (!login || !passwort) return { treffer: [], fehler: "DATAFORSEO-Zugang fehlt" };
  const auth = Buffer.from(`${login}:${passwort}`).toString("base64");
  try {
    const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      // Nur EINE Aufgabe je Aufruf — mehrere quittiert die Schnittstelle mit
      // „You can set only one task at a time".
      body: JSON.stringify([{ keyword: frage, location_code: 2276, language_code: "de", depth: 30 }]),
    });
    if (!res.ok) return { treffer: [], fehler: `HTTP ${res.status}` };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const daten: any = await res.json();
    const aufgabe = daten?.tasks?.[0];
    if (aufgabe?.status_code && aufgabe.status_code >= 40000) {
      return { treffer: [], fehler: String(aufgabe.status_message ?? aufgabe.status_code) };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posten: any[] = aufgabe?.result?.[0]?.items ?? [];
    return {
      treffer: posten
        .filter((p) => p?.type === "organic" && typeof p.url === "string")
        .map((p) => ({ url: String(p.url), rang: Number(p.rank_absolute ?? 0), titel: String(p.title ?? "").slice(0, 200) })),
      fehler: null,
    };
  } catch (e) {
    return { treffer: [], fehler: e instanceof Error ? e.message : String(e) };
  }
}

/** Plattformen, die nie ein eigenes Medium sind — dieselbe kurze Liste wie bei
 *  den Fachbetrieben, plus die Verzeichnisse, auf denen Podcasts liegen. */
const NIE_EIN_MEDIUM = [
  "facebook.com", "instagram.com", "youtube.com", "linkedin.com", "xing.com",
  "wikipedia.org", "amazon.de", "ebay.de", "kleinanzeigen.de", "google.com",
  "pinterest.de", "tiktok.com", "x.com", "twitter.com", "spotify.com",
  "podcasts.apple.com", "deezer.com", "podigee.io", "podcast.de", "listennotes.com",
  "reddit.com", "quora.com", "pinterest.com", "threads.net",
];

async function suche(trocken: boolean, paketFilter: Paket | null): Promise<void> {
  const sb = await makeClient();
  loadEnvFile();
  const bestand = await alleZeilen<{ domain: string }>(sb, "presse_medien", "domain");
  const bekannt = new Set(bestand.map((b) => b.domain));

  // DIE NACHBARBESTÄNDE SIND DER BESTE FILTER, DEN WIR HABEN.
  //
  // Eine Suche nach „Fachmagazin Stadtwerke" liefert zuverlässig Stadtwerke —
  // und ein Stadtwerk mit Kundenmagazin sieht für die Merkmalsprüfung wie ein
  // Medium aus (Aktuelles, Nachrichten, Datierung). Gemessen am 03.09.2026:
  // Unter den 604 Zeilen aus der Suche standen Stadtwerke Menden, Merseburg und
  // Aue mit Priorität A. Sie sind nicht falsch erhoben — sie gehören nur in ein
  // anderes Modul, und dort stehen sie längst.
  const versorger = await alleZeilen<{ website: string | null }>(sb, "utilities", "website");
  const betriebe = await alleZeilen<{ domain: string | null }>(sb, "fachbetriebe", "domain");
  const nachbarn = new Set<string>();
  for (const v of versorger) {
    const h = v.website ? hostVon(v.website.startsWith("http") ? v.website : `https://${v.website}`) : null;
    if (h) nachbarn.add(h);
  }
  for (const b of betriebe) if (b.domain) nachbarn.add(b.domain.toLowerCase());
  const fragen = SUCHFRAGEN.filter((f) => paketFilter === null || f.paket === paketFilter);
  if (trocken) {
    log(`${fragen.length} Fragen, ${(fragen.length * 0.002).toFixed(3)} $ — nichts abgerufen`);
    for (const f of fragen) log(`  Paket ${f.paket}: ${f.frage}`);
    return;
  }

  const neu = new Map<string, { paket: Paket; titel: string; frage: string }>();
  for (const f of fragen) {
    const { treffer, fehler } = await serp(f.frage);
    if (fehler) {
      log(`„${f.frage}": ${fehler}`, "err");
      continue;
    }
    for (const t of treffer) {
      let host: string;
      try {
        host = new URL(t.url).host.replace(/^www\./, "").toLowerCase();
      } catch {
        continue;
      }
      if (bekannt.has(host) || neu.has(host)) continue;
      if (NIE_EIN_MEDIUM.some((p) => host === p || host.endsWith("." + p))) continue;
      if (nachbarn.has(host)) continue;
      neu.set(host, { paket: f.paket, titel: t.titel, frage: f.frage });
    }
    log(`„${f.frage}": ${treffer.length} Treffer`);
  }

  // NEU HEISST NICHT MEDIUM. Der Eintrag entsteht mit dem Vermerk, aus welcher
  // Frage er kam; ob dort ein redaktionelles Angebot wohnt, entscheidet der
  // Profil-Lauf am Inhalt — nicht die Suchmaschine.
  const zeilen = [...neu.entries()].map(([domain, v]) => ({
    domain,
    saat_name: v.titel.slice(0, 90) || domain,
    saat_typ: null,
    saat_schwerpunkt: null,
    saat_gebiet: "bundesweit",
    gruppe: null,
    // PAKET 4 IST DIE PRÜFLISTE, NICHT DER KATALOG.
    //
    // Ein Suchtreffer ist eine Adresse, kein Befund — grob die Hälfte ist
    // nichts, das ist im Förderbereich gemessen und hier nicht anders. Käme er
    // direkt in Paket 1 oder 3, stünde er ununterscheidbar neben den benannten
    // Medien; das wäre die Fehlerklasse „Vermutung sieht aus wie Messung".
    paket: 4,
    notiz: `über die Suche gefunden („${v.frage}", gedacht für Paket ${v.paket}) — Einordnung ungeprüft`,
  }));
  await upsert(sb, "presse_medien", zeilen, "domain");
  log(`${zeilen.length} neue Adressen aufgenommen`, "ok");
}

// ─── Phase: Regionalpresse je Landkreis ──────────────────────────────────────
//
// Betreiber, 05.09.2026: „es muss doch viel mehr als 65 regionalzeitungen geben.
// mindestens zu jedem landkreis eine." Er hat recht — die benannte Saat trug 55
// Titel, Deutschland hat rund 400 Kreise. Der Grund ist derselbe wie bei den
// Fachbetrieben: Eine benannte Liste kennt, wer bekannt ist.
//
// UND DER NEBENERTRAG IST DER EIGENTLICHE: Die Kreise, in denen eine Zeitung in
// den Ergebnissen steht, SIND ihr Verbreitungsgebiet — gemessen, nicht aus einer
// Selbstbeschreibung abgeschrieben. Genau daran scheiterte bisher die Zuordnung
// Gemeinde → Zeitung, denn die Titel nennen ihr Gebiet nur als Fließtext
// („Nordhessen"). Dieselbe Mechanik wie die Streuungsmessung, die bei den
// Fachbetrieben Betrieb von Portal trennt.

interface KreisZeile {
  id: string;
  name: string;
  kind: string;
  bl: string;
}

function ladeKreise(): KreisZeile[] {
  const pfad = resolve(process.cwd(), "public", "geo", "de-landkreise.geo.json");
  const geo = JSON.parse(readFileSync(pfad, "utf8")) as { features: { properties: KreisZeile }[] };
  return geo.features.map((f) => f.properties);
}

/** Wie der Kreis in der Suchanfrage heißt — dieselbe Regel wie bei den
 *  Fachbetrieben: „Landkreis Flensburg" gibt es nicht. */
function ortsname(k: KreisZeile): string {
  return k.kind === "Kreisfreie Stadt" ? k.name : `Landkreis ${k.name}`;
}

/**
 * DREI Fragen je Kreis, und der Unterschied ist nicht kosmetisch.
 *
 * Betreiber, 05.09.2026: „das war jetzt nur ein beispiel. vermutlich gibt's zig
 * mehr als nur je landkreis." Er hat recht — neben der Tageszeitung gibt es das
 * Wochen- und Anzeigenblatt (oft die einzige Zeitung, die in JEDEN Briefkasten
 * geht) und das reine Online-Lokalportal, das in keiner Zeitungsliste steht.
 * Eine Frage allein fände nur die erste Gattung.
 *
 * Dieselbe Systematik wie bei den Fachbetrieben, wo „Photovoltaik" und
 * „Solarteur" je zur Hälfte andere Betriebe finden — und wie dort gilt: Wer
 * eine vierte Frage vorschlägt, misst vorher, ob sie neue Adressen bringt.
 */
export const KREIS_FRAGEN = [
  { name: "tageszeitung", vorlage: (k: KreisZeile) => `Tageszeitung ${ortsname(k)} Lokalnachrichten` },
  { name: "wochenblatt", vorlage: (k: KreisZeile) => `Wochenblatt Anzeigenblatt ${ortsname(k)}` },
  { name: "lokalportal", vorlage: (k: KreisZeile) => `Lokalnachrichten online ${ortsname(k)} aktuell` },
] as const;

/** Was nie eine Regionalzeitung ist. Bewusst kurz — die eigentliche Trennung
 *  macht der Profil- und Eignungslauf am Inhalt, nicht diese Liste. */
const NIE_REGIONALPRESSE = [
  "facebook.com", "instagram.com", "youtube.com", "linkedin.com", "x.com", "twitter.com",
  "wikipedia.org", "wikiwand.com", "google.com", "amazon.de", "ebay.de", "kleinanzeigen.de",
  "meinestadt.de", "wer-zu-wem.de", "kalaydo.de", "stellenanzeigen.de", "indeed.com",
  "yumpu.com", "issuu.com", "pressreader.com", "zeitungen.de", "abo-direkt.de",
  // Branchenverzeichnisse — sie tragen jeden Ortsnamen und nie eine Redaktion.
  // Gemessen an drei Kreisen (05.09.2026): Von 95 gefundenen Adressen war die
  // Mehrheit Telefonbuch, Werbeplattform oder E-Paper-Spiegel.
  "11880.com", "dasoertliche.de", "dastelefonbuch.de", "gelbeseiten.de", "goyellow.de",
  "creditreform.de", "firmeneintrag.creditreform.de", "northdata.de", "companyhouse.de",
  "crossvertise.com", "wlw.de", "cylex.de", "branchenbuch.de",
  // E-Paper- und Kiosk-Dienste: dieselbe Zeitung ein zweites Mal, ohne Impressum
  // und ohne Redaktion.
  "e-pages.dk", "e-pages.pub", "united-kiosk.de", "readly.com", "sharemagazines.de",
  // Bundesweite Häuser mit Regionalauftritt — sie kommen über die benannte Saat,
  // nicht über die Kreissuche, sonst stehen sie 400 Mal darin.
  "bild.de", "t-online.de", "focus.de", "merkur.de", "web.de", "gmx.net",
];

/**
 * Ein E-Paper- oder Kiosk-Vorsatz gehört zur HAUPTDOMAIN.
 *
 * Gemessen: `epaper.kn-online.de` und `kn-online.de` sind dieselbe Zeitung, und
 * getrennt geführt hätte die eine ein Impressum und die andere keins. Dieselbe
 * Systematik wie bei den Fachbetrieben, wo die Domain die Identität ist.
 */
function hauptdomain(host: string): string {
  // Auch Marketing- und Service-Vorsätze gehören zur Zeitung:
  // `mediadaten.augsburger-allgemeine.de` ist keine zweite Redaktion.
  return host.replace(
    /^(?:epaper|e-paper|paper|mediadaten|abo|shop|jobs|anzeigen|trauer|immo|m|www\d?|amp)\./,
    "",
  );
}

async function regionalpresse(limit: number, trocken: boolean): Promise<void> {
  const sb = await makeClient();
  loadEnvFile();
  const kreise = ladeKreise();
  const bestand = await alleZeilen<{ domain: string; kreise: string[] | null }>(
    sb,
    "presse_medien",
    "domain, kreise",
  );
  const bekannt = new Map(bestand.map((b) => [b.domain, new Set(b.kreise ?? [])]));

  const gelaufen = await alleZeilen<{ kreis_id: string; frage: string }>(
    sb,
    "presse_kreissuche",
    "kreis_id, frage",
  );
  const erledigt = new Set(gelaufen.map((g) => `${g.kreis_id}|${g.frage}`));
  const paare: { k: KreisZeile; frage: string; art: string }[] = [];
  for (const k of kreise) {
    for (const f of KREIS_FRAGEN) {
      if (!erledigt.has(`${k.id}|${f.name}`)) paare.push({ k, frage: f.vorlage(k), art: f.name });
    }
  }
  const offen = paare.slice(0, limit);

  if (trocken) {
    log(`${offen.length} Abfragen offen, ${(offen.length * 0.002).toFixed(2)} $ — nichts abgerufen`);
    for (const p of offen.slice(0, 6)) log(`  ${p.frage}`);
    return;
  }
  if (!offen.length) {
    log("alle Kreise abgefragt", "ok");
    return;
  }
  log(`${offen.length} Abfragen (${(offen.length * 0.002).toFixed(2)} $)`);

  const gefunden = new Map<string, Set<string>>();
  const laufZeilen: Record<string, unknown>[] = [];
  let treffer = 0;

  await pool(offen, 4, async (p) => {
    const k = p.k;
    const { treffer: hits, fehler } = await serp(p.frage);
    laufZeilen.push({ kreis_id: k.id, frage: p.art, fehler, gelaufen_am: heute() });
    if (fehler) {
      log(`${k.name} (${p.art}): ${fehler}`, "err");
      return;
    }
    for (const h of hits) {
      const roh = hostVon(h.url);
      if (!roh) continue;
      const host = hauptdomain(roh);
      if (NIE_REGIONALPRESSE.some((p) => host === p || host.endsWith("." + p))) continue;
      const menge = gefunden.get(host) ?? new Set<string>();
      menge.add(k.id);
      gefunden.set(host, menge);
    }
    treffer++;
  });

  // Je Domain die Kreise, in denen sie aufgetaucht ist — bestehende bleiben
  // erhalten, damit ein Teillauf das Gebiet nicht beschneidet.
  const zeilen: Record<string, unknown>[] = [];
  for (const [domain, kreiseNeu] of gefunden) {
    const alt = bekannt.get(domain);
    const zusammen = [...new Set([...(alt ?? []), ...kreiseNeu])].sort();
    if (alt) {
      // Schon im Bestand: nur das Gebiet fortschreiben, nichts überschreiben.
      zeilen.push({ domain, kreise: zusammen });
      continue;
    }
    zeilen.push({
      domain,
      saat_name: domain,
      saat_typ: null,
      saat_schwerpunkt: null,
      saat_gebiet: null,
      gruppe: null,
      paket: 2,
      notiz: `über die Kreissuche gefunden (${kreiseNeu.size} Kreis(e))`,
      kreise: zusammen,
    });
  }
  await upsert(sb, "presse_medien", zeilen, "domain");
  await upsert(sb, "presse_kreissuche", laufZeilen, "kreis_id,frage");
  const neu = zeilen.filter((z) => z.paket !== undefined).length;
  log(`${treffer} Kreise abgefragt, ${zeilen.length} Adressen berührt, ${neu} neu`, "ok");
}

/**
 * Regional oder überregional? — die STREUUNG entscheidet, keine Sperrliste.
 *
 * Eine Regionalzeitung deckt ihren Kreis und ein paar Nachbarkreise ab; die
 * WELT, das RND und presseportal.de stehen in jedem. Dieselbe Messung, die bei
 * den Fachbetrieben Betrieb von Portal trennt — und aus demselben Grund: Eine
 * gepflegte Sperrliste veraltet, sobald ein neues Portal aufmacht, die Streuung
 * nie.
 *
 * WICHTIG: Die Schwelle wächst mit der Zahl der abgefragten Kreise. In einem
 * Teillauf über acht Kreise wäre sonst jede überregionale Adresse eine
 * „Regionalzeitung mit drei Kreisen" — und nach dem Vollauf sieht das niemand
 * mehr nach.
 */
export const UEBERREGIONAL_ANTEIL = 0.08;
export const UEBERREGIONAL_MIN = 12;

export function ueberregionalSchwelle(kreiseAbgefragt: number): number {
  return Math.max(UEBERREGIONAL_MIN, Math.round(kreiseAbgefragt * UEBERREGIONAL_ANTEIL));
}

async function streuung(dry: boolean): Promise<void> {
  const sb = await makeClient();
  const laeufe = await alleZeilen<{ kreis_id: string }>(sb, "presse_kreissuche", "kreis_id");
  const kreiseAbgefragt = new Set(laeufe.map((l) => l.kreis_id)).size;
  const schwelle = ueberregionalSchwelle(kreiseAbgefragt);
  const medien = await alleZeilen<{ domain: string; kreise: string[] | null; saat_gebiet: string | null }>(
    sb,
    "presse_medien",
    "domain, kreise, saat_gebiet",
  );
  const mitKreisen = medien.filter((m) => (m.kreise ?? []).length > 0);
  const ueber = mitKreisen.filter((m) => (m.kreise ?? []).length >= schwelle);

  log(`${kreiseAbgefragt} Kreise abgefragt, Schwelle ${schwelle} Kreise`);
  log(`${mitKreisen.length} Adressen mit Kreisbezug, davon ${ueber.length} in ${schwelle}+ Kreisen`);
  for (const m of ueber.slice(0, 15)) log(`  ${(m.kreise ?? []).length}× ${m.domain}`);
  if (dry) return;

  // Die Gebietsangabe wird GESCHRIEBEN, nicht behauptet: Für ein Regionalmedium
  // ist sie die Liste seiner Kreise, für ein überregionales der Vermerk.
  const zeilen = mitKreisen.map((m) => ({
    domain: m.domain,
    // NEUTRAL BESCHRIFTET: Die Zahl ist die Aussage, nicht ein Urteil.
    // „überregional" stand hier zuerst und war bei einer Mediengruppe mit 168
    // Lokalausgaben schlicht falsch — sie IST in 168 Kreisen präsent, nur eben
    // mit vielen Redaktionen statt einer. Wie viele davon eigene Ansprechpartner
    // haben, sagt erst der Profil-Lauf.
    saat_gebiet: `in ${(m.kreise ?? []).length} von ${kreiseAbgefragt} Kreisen gefunden`,
  }));
  await upsert(sb, "presse_medien", zeilen, "domain");
  log(`Gebiet für ${zeilen.length} Adressen fortgeschrieben`, "ok");
}

// ─── Phase: Eignung ──────────────────────────────────────────────────────────
//
// Beantwortet je Medium die neun mit dem Betreiber abgestimmten Fragen (05.09.2026)
// auf INHALTSSEITEN — nie im Impressum. Die Regel für das Urteil steht in
// lib/presse-eignung.ts, damit sie nicht bei jeder Durchsicht anders angewandt wird.

/** Welche Inhaltsseiten angesehen werden. Die Suchmaschine findet sie, weil eine
 *  Redaktionsseite keine Themenliste führt und der Crawl nur zwei Klicks tief
 *  ginge — dieselbe Lehre wie im Förderbereich. */
async function inhaltsseiten(domain: string): Promise<string[]> {
  const { treffer } = await serp(`site:${domain} photovoltaik`);
  return treffer
    .map((t) => t.url)
    .filter((u) => (hostVon(u) ?? "").endsWith(domain))
    // Rechtstexte tragen zur Frage nichts bei und würden den alten Fehler
    // wiederholen — geprüft wird der INHALT.
    .filter((u) => !/impressum|datenschutz|agb|kontakt|newsletter|mediadaten/i.test(u))
    .slice(0, 4);
}

/**
 * „UNKLAR" IST KEIN URTEIL — GEPRÜFT WIRD ES MIT.
 *
 * Eine erste Fassung sparte hier Geld, indem sie nur Medien mit BELEGTER
 * Redaktion prüfte. Die Stichprobe hat das widerlegt: Unter den 787 unklaren
 * Adressen stehen die Allgemeine Zeitung, 24rhein, detektor.fm, Clean Energy
 * Wire und das Akkudoktor-Forum neben Abfallkalendern und Bibliothekskatalogen.
 * „unklar" heißt in aller Regel nur, dass kein NAME gefunden wurde — nicht,
 * dass es keine Redaktion gibt. Wer hier spart, verliert Zeitungen stumm, und
 * das ist der teurere Fehler: Eine Fehlanzeige auf einem Abfallkalender kostet
 * 0,002 $ und macht die Liste sauber, eine verlorene Tageszeitung fällt
 * niemandem auf.
 *
 * Ausgeschlossen bleibt allein, was der Profil-Lauf als NICHT-Medium belegt hat.
 * `--nur-belegte` fährt den sparsamen Lauf, wenn das Guthaben knapp ist.
 */
async function eignung(
  paket: Paket | null,
  limit: number,
  neu: boolean,
  nurBelegte: boolean,
): Promise<void> {
  const sb = await makeClient();
  loadEnvFile();
  const alle = await alleZeilen<{
    domain: string;
    paket: number;
    ist_medium: string | null;
    eignung: string | null;
    eignung_at: string | null;
  }>(sb, "presse_medien", "domain, paket, ist_medium, eignung, eignung_at");
  const offen = alle
    .filter((m) => (paket === null || m.paket === paket))
    .filter((m) => (nurBelegte ? m.ist_medium === "medium" : m.ist_medium !== "kein-medium"))
    .filter((m) => neu || !m.eignung_at)
    .slice(0, limit);
  if (!offen.length) {
    log("nichts offen — mit --neu noch einmal", "ok");
    return;
  }
  log(`${offen.length} Medien werden auf Eignung geprüft (${(offen.length * 0.002).toFixed(2)} $ Suche)`);

  const jetzt = new Date();
  const medienZeilen: Record<string, unknown>[] = [];
  const belegZeilen: Record<string, unknown>[] = [];
  const zaehl: Record<string, number> = {};

  await pool(offen, 4, async (m) => {
    let seiten: string[] = [];
    try {
      seiten = await inhaltsseiten(m.domain);
    } catch {
      /* Suche fehlgeschlagen — dann bleibt die Startseite */
    }
    const start = await holeStart(m.domain);
    const geprueft: { url: string; html: string }[] = [];
    if (start) geprueft.push({ url: start.url, html: start.html });
    for (const u of seiten) {
      const r = await holeText(u);
      if (r) geprueft.push({ url: r.url, html: r.html });
    }
    if (!geprueft.length) {
      medienZeilen.push({
        domain: m.domain,
        eignung: "angesehen",
        eignung_grund: "keine Inhaltsseite abrufbar — von Hand nachsehen",
        eignung_beleg: null,
        eignung_zitat: null,
        eignung_at: jetzt.toISOString(),
      });
      zaehl["nicht abrufbar"] = (zaehl["nicht abrufbar"] ?? 0) + 1;
      return;
    }

    // Je Frage die STÄRKSTE Fundstelle über alle gelesenen Seiten. Ein Treffer
    // auf einer von vier Seiten genügt — gefragt ist, OB das Medium das Thema
    // behandelt, nicht ob jede Seite es tut.
    const beste = new Map<string, { b: Befund; url: string }>();
    const merke = (b: Befund, url: string) => {
      if (b.antwort === "unklar") return;
      const da = beste.get(b.frage.split(" ")[0]);
      if (da && da.b.antwort === "ja") return;
      beste.set(b.frage.split(" ")[0], { b, url });
    };
    // Der JÜNGSTE Beitrag, der eine unserer Fragen behandelt — das ist der
    // Satz, mit dem ein Anschreiben anfangen kann.
    let anknuepfung: { titel: string; alter: number; url: string } | null = null;
    for (const [i, s] of geprueft.entries()) {
      // OHNE NAVIGATION — sonst belegt das Menü jede Frage auf jeder Seite.
      const text = inhaltstext(s.html);
      // Die erste gelesene Seite ist die Startseite; nur sie darf den
      // Meldungsbetrieb VERNEINEN (eine Artikelseite ist immer alt).
      const istStart = i === 0 && !!start;
      merke(kernfrageBehandelt(text), s.url);
      merke(verweistAufFremdenRechner(s), s.url);
      merke(zitiertFremdeQuelle(text), s.url);
      merke(meldungsbetrieb(text, jetzt, s.html, istStart), s.url);
      merke(autorAmBeitrag(text), s.url);
      merke(eigenerRechner(s), s.url);
      merke(erzeugtEigeneDaten(text), s.url);
      merke(verkauftDasProdukt(s), s.url);

      // Nur ein echter BEITRAG taugt als Anknüpfung — eine Rubrikseite trägt
      // dieselbe Überschriftform und keinen Inhalt, auf den man sich beruft.
      if (!istStart && istBeitrag(s.html, jetzt) && kernfrageBehandelt(text).antwort === "ja") {
        const alter = juengsterBeitragTage(text, jetzt, s.html);
        const titel = ueberschrift(s.html);
        if (titel && alter !== null && alter >= 0 && (!anknuepfung || alter < anknuepfung.alter)) {
          anknuepfung = { titel, alter, url: s.url };
        }
      }
    }

    const kontakte = await alleZeilen<{ domain: string; mail_art: string | null }>(
      sb,
      "presse_kontakte",
      "domain, mail_art",
      (q) => q.eq("domain", m.domain),
    );
    const hatKontakt = kontakte.some((k) => k.mail_art === "redaktion" || k.mail_art === "person");

    const befunde = [...beste.values()].map((x) => x.b);
    const u = urteile(befunde, hatKontakt);
    const belegUrl = u.beleg ? [...beste.values()].find((x) => x.b === u.beleg)?.url ?? null : null;

    medienZeilen.push({
      domain: m.domain,
      eignung: u.eignung,
      eignung_grund: u.grund,
      eignung_beleg: anknuepfung?.url ?? belegUrl,
      eignung_zitat: u.beleg?.fundstelle ?? null,
      // Woran ein Anschreiben anknüpfen kann — Überschrift und Alter des
      // jüngsten Beitrags zum Thema.
      anknuepfung_titel: anknuepfung?.titel ?? null,
      anknuepfung_tage: anknuepfung?.alter ?? null,
      eignung_at: jetzt.toISOString(),
    });
    for (const [, x] of beste) {
      belegZeilen.push({
        domain: m.domain,
        merkmal: `eignung:${x.b.frage}`,
        wert: x.b.antwort,
        quelle_url: x.url,
        fundstelle: x.b.fundstelle.slice(0, 300),
        gefunden_am: heute(),
      });
    }
    zaehl[u.eignung] = (zaehl[u.eignung] ?? 0) + 1;
    log(`${m.domain}: ${u.eignung} — ${u.grund.slice(0, 70)}`, "ok");
  });

  await upsert(sb, "presse_medien", medienZeilen, "domain");
  await upsert(sb, "presse_belege", belegZeilen, "domain,merkmal,quelle_url");
  log(`fertig: ${JSON.stringify(zaehl)}`, "ok");
}

/** EIN Medium prüfen, ohne zu schreiben — für die Eichung. */
async function eichenEignung(domain: string): Promise<void> {
  loadEnvFile();
  const jetzt = new Date();
  let seiten: string[] = [];
  try {
    seiten = await inhaltsseiten(domain);
  } catch {
    /* ohne Suche nur die Startseite */
  }
  const start = await holeStart(domain);
  const geprueft: { url: string; html: string }[] = [];
  if (start) geprueft.push({ url: start.url, html: start.html });
  for (const u of seiten) {
    const r = await holeText(u);
    if (r) geprueft.push({ url: r.url, html: r.html });
  }
  // eslint-disable-next-line no-console
  console.log(`\n${domain} — gelesene Inhaltsseiten:`);
  for (const s of geprueft) console.log("  ·", s.url);

  const beste = new Map<string, { b: Befund; url: string }>();
  for (const [i, s] of geprueft.entries()) {
    const text = inhaltstext(s.html);
    for (const b of [
      kernfrageBehandelt(text),
      verweistAufFremdenRechner(s),
      zitiertFremdeQuelle(text),
      meldungsbetrieb(text, jetzt, s.html, i === 0 && !!start),
      autorAmBeitrag(text),
      eigenerRechner(s),
      erzeugtEigeneDaten(text),
      verkauftDasProdukt(s),
    ]) {
      if (b.antwort === "unklar") continue;
      const k = b.frage.split(" ")[0];
      if (beste.get(k)?.b.antwort === "ja") continue;
      beste.set(k, { b, url: s.url });
    }
  }
  // eslint-disable-next-line no-console
  console.log("\nAntworten:");
  for (const [, x] of beste) {
    console.log(`  ${x.b.antwort.toUpperCase().padEnd(5)} ${x.b.frage}`);
    console.log(`        „${x.b.fundstelle.slice(0, 130)}“`);
    console.log(`        ${x.url}`);
  }
  const u = urteile([...beste.values()].map((x) => x.b), true);
  // eslint-disable-next-line no-console
  console.log(`\nURTEIL: ${u.eignung} — ${u.grund}`);
}

// ─── Eichung: EIN Medium, nichts geschrieben ─────────────────────────────────

async function eichen(domain: string): Promise<void> {
  const res = await holeMedium(domain);
  if ("fehler" in res) {
    log(`${domain}: ${res.fehler}`, "err");
    return;
  }
  const a = werteAus(domain, res);
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        domain: a.domain,
        titel: a.titel,
        seiten: a.seiten,
        urteil: { ist: a.ist_medium, grund: a.medium_grund, merkmale: a.medium_merkmale },
        medientyp: a.medientyp,
        themen: a.themen,
        geschichten: a.geschichten,
        reichweite: a.reichweite,
        prioritaet: a.prioritaet,
        gattung: a.gattung,
        woerter: a.woerter,
        aufhaenger: a.aufhaenger,
        kontakte: a.kontakte.map((k) => ({
          name: k.name,
          funktion: k.funktion,
          rang: k.rang,
          mail: k.mail,
          art: k.mail_art,
          anker: k.anker,
          quelle: k.quelle_url,
          fundstelle: String(k.fundstelle ?? "").slice(0, 160),
        })),
      },
      null,
      2,
    ),
  );
}

// ─── CSV ─────────────────────────────────────────────────────────────────────
//
// Der Aufbau der Zeile steht in lib/presse-katalog.ts, nicht hier: Die Ansicht
// im Adminbereich exportiert dieselbe Tabelle, und zwei Fassungen derselben
// Spalten würden auseinanderlaufen, ohne dass es jemandem auffiele.

async function csv(paket: Paket | null, nurMedien: boolean, top: number): Promise<void> {
  const sb = await makeClient();
  const alleMedien = await alleZeilen<MediumZeile>(sb, "presse_medien", "*");
  const kontakte = await alleZeilen<KontaktZeile>(sb, "presse_kontakte", "*");
  const medien = alleMedien
    .filter((m) => paket === null || m.paket === paket)
    .filter((m) => !nurMedien || m.ist_medium === "medium");

  const text = alsCsv(medien, kontakte, { nurBesterKontakt: top > 0 });
  const zeilen = text.split("\n");
  const rest = top > 0 ? zeilen.slice(1, top + 1) : zeilen.slice(1);
  // eslint-disable-next-line no-console
  console.log([zeilen[0], ...rest].join("\n"));
}

// ─── Stats ───────────────────────────────────────────────────────────────────

async function stats(): Promise<void> {
  const sb = await makeClient();
  const medien = await alleZeilen<MediumZeile>(sb, "presse_medien", "*");
  const kontakte = await alleZeilen<KontaktZeile>(sb, "presse_kontakte", "*");
  const gelesen = medien.filter((m) => m.profil_at);
  const zaehl = (f: (m: MediumZeile) => boolean) => medien.filter(f).length;

  log(`Saat: ${medien.length} Medien, davon ${gelesen.length} gelesen`);
  log(`  redaktionelles Angebot belegt: ${zaehl((m) => m.ist_medium === "medium")}`);
  log(`  unklar: ${zaehl((m) => m.ist_medium === "unklar")}`);
  log(`  kein Medium: ${zaehl((m) => m.ist_medium === "kein-medium")}`);
  log(`  nicht erreichbar: ${zaehl((m) => !!m.fehler)}`);
  log(`Kontakte: ${kontakte.length}`);
  log(`  mit Namen: ${kontakte.filter((k) => k.name).length}`);
  log(`  persönliche Adresse: ${kontakte.filter((k) => k.mail_art === "person").length}`);
  log(`  Redaktionspostfach: ${kontakte.filter((k) => k.mail_art === "redaktion").length}`);
  log(`  nur Werbekontakt: ${kontakte.filter((k) => k.mail_art === "werblich").length}`);
  for (const p of ["A", "B", "C"]) {
    log(`  Priorität ${p}: ${zaehl((m) => m.prioritaet === p)}`);
  }
  const ohne = medien.filter((m) => m.profil_at && !kontakte.some((k) => k.domain === m.domain));
  if (ohne.length) log(`ohne jeden Kontaktweg: ${ohne.map((m) => m.domain).join(", ")}`);
}

// ─── main ────────────────────────────────────────────────────────────────────

function zahlArg(name: string, standard: number): number {
  const i = process.argv.indexOf(name);
  if (i < 0) return standard;
  const v = Number(process.argv[i + 1]);
  return Number.isFinite(v) ? v : standard;
}

function textArg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const paketArg = zahlArg("--paket", 0);
  const paket = (paketArg === 1 || paketArg === 2 || paketArg === 3 ? paketArg : null) as Paket | null;

  if (args.includes("--setup")) return setup();
  if (args.includes("--saat")) return saat();
  if (args.includes("--suche")) return suche(args.includes("--trocken"), paket);
  if (args.includes("--regionalpresse")) {
    return regionalpresse(zahlArg("--limit", 500), args.includes("--trocken"));
  }
  if (args.includes("--streuung")) return streuung(args.includes("--trocken"));
  if (args.includes("--eichen-eignung")) {
    const d = textArg("--eichen-eignung");
    if (!d) throw new Error("--eichen-eignung braucht eine Domain");
    return eichenEignung(d.replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
  }
  if (args.includes("--eignung")) {
    return eignung(
      paket,
      zahlArg("--limit", 500),
      args.includes("--neu"),
      args.includes("--nur-belegte"),
    );
  }
  if (args.includes("--eichen")) {
    const d = textArg("--eichen");
    if (!d) throw new Error("--eichen braucht eine Domain");
    return eichen(d.replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
  }
  if (args.includes("--profil")) {
    return profil(paket, zahlArg("--limit", 500), args.includes("--refetch"));
  }
  if (args.includes("--csv")) {
    return csv(paket, args.includes("--nur-medien"), zahlArg("--top", 0));
  }
  if (args.includes("--stats")) return stats();

  // eslint-disable-next-line no-console
  console.log(
    [
      "npm run presse -- --setup                 Tabellen anlegen",
      "npm run presse -- --saat                  Saat schreiben",
      "npm run presse -- --suche --trocken       was gefragt würde, ohne Geld",
      "npm run presse -- --suche --paket 3       weitere Medien über die Suche finden",
      "npm run presse -- --eichen <domain>       ein Medium ausgeben, ohne zu schreiben",
      "npm run presse -- --profil --paket 1      Websites lesen",
      "npm run presse -- --csv --paket 1         Katalog ausgeben",
      "npm run presse -- --csv --paket 1 --top 50   erstes 50er-Paket zur Kontrolle",
      "npm run presse -- --regionalpresse --trocken  was die Kreissuche kosten würde",
      "npm run presse -- --regionalpresse        Regionalzeitungen je Landkreis finden",
      "npm run presse -- --streuung --trocken    regional oder überregional (gemessen)",
      "npm run presse -- --eichen-eignung <domain>  Eignungsfragen an EINEM Medium",
      "npm run presse -- --eignung --paket 1     Eignung prüfen (Suche + Inhaltsseiten)",
      "npm run presse -- --stats                 Bestand",
    ].join("\n"),
  );
}

main().catch((e) => {
  log(e instanceof Error ? e.message : String(e), "err");
  process.exit(1);
});
