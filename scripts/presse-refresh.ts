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
 *    erfolglose Abruf bekommt sein Datum (`profil_at`) und seinen Grund
 *    (`fehler`). Ohne das beginnt der nächste Lauf wieder bei denselben.
 */

import { resolve } from "node:path";
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
  reichweiteAus,
  medienurteil,
  prioritaet,
  aufhaenger,
  type Rolle,
  type Themenfund,
  type Seitenart,
} from "../lib/presse-extrakt";
import { personenAus } from "../lib/personen-fund";
import { SAAT, doppelteInDerSaat, type Paket } from "../lib/presse-saat";

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
  return new Date().toISOString().slice(0, 10);
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
  await upsert(sb, "presse_medien", zeilen, "domain");
  // Was aus der Saat verschwunden ist, verschwindet auch aus dem Bestand.
  // Sonst bleibt eine falsch geratene Domain für immer als „nicht erreichbar"
  // stehen und sieht aus wie ein Befund über ein Medium — dabei ist sie nur ein
  // Tippfehler von uns. Gemessen: stadtundwerk.de und gebaeudeenergieberater.de
  // heißen in Wirklichkeit anders.
  const bestand = await alleZeilen<{ domain: string }>(sb, "presse_medien", "domain");
  const gewollt = new Set(SAAT.map((s) => s.domain));
  const weg = bestand.map((b) => b.domain).filter((d) => !gewollt.has(d));
  if (weg.length) {
    const { error } = await sb.from("presse_medien").delete().in("domain", weg);
    if (error) throw new Error(`Aufräumen: ${error.message}`);
    log(`${weg.length} nicht mehr in der Saat, entfernt: ${weg.join(", ")}`);
  }
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
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": ua,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "de-DE,de;q=0.9",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    // EINMAL entschlüsseln, direkt beim Abruf: Danach sehen Rollen-, Personen-
    // und Postfachsuche dieselbe Seite wie ein Mensch im Browser. Es je Sucher
    // zu tun wäre dreimal dieselbe Arbeit — und die vierte Stelle vergisst es.
    return { html: ohneAdressVerschleierung(await res.text()), url: res.url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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
  const themen = start ? themenAus(sichtbarerText(start.html)) : [];
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
async function holeMedium(domain: string): Promise<Seite[] | { fehler: string }> {
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
      }
    }
  }
  if (!seiten.length) return { fehler: "weder Startseite noch Impressum erreichbar" };
  return seiten;
}

// ─── Phase: Profil ───────────────────────────────────────────────────────────

async function profil(paket: Paket | null, limit: number, refetch: boolean): Promise<void> {
  const sb = await makeClient();
  const alle = await alleZeilen<{ domain: string; paket: number; profil_at: string | null }>(
    sb,
    "presse_medien",
    "domain, paket, profil_at",
  );
  const offen = alle
    .filter((m) => (paket === null || m.paket === paket) && (refetch || !m.profil_at))
    .slice(0, limit);
  if (!offen.length) {
    log("nichts offen — mit --refetch noch einmal", "ok");
    return;
  }
  log(`${offen.length} Medien werden gelesen`);

  const medienZeilen: Record<string, unknown>[] = [];
  const kontaktZeilen: Record<string, unknown>[] = [];
  const belegZeilen: Record<string, unknown>[] = [];
  let ok = 0;
  let leer = 0;

  await pool(offen, 6, async (m) => {
    // EIN kaputtes Medium darf den Lauf nicht abreißen. Real passiert: eine
    // Seite ohne abrufbare Startseite ließ die ganze Erhebung nach 201 Abrufen
    // mit einer Typmeldung stehen — die Arbeit war weg, die Abrufe bezahlt.
    // Dieselbe Lehre wie beim Fachbetriebe-Lauf, den zweimal eine einzige
    // kaputte Adresse abgerissen hat.
    let res: Seite[] | { fehler: string };
    try {
      res = await holeMedium(m.domain);
    } catch (e) {
      res = { fehler: `Abruf abgebrochen: ${e instanceof Error ? e.message : String(e)}` };
    }
    if ("fehler" in res) {
      // GEMESSENE FELDER LÖSCHEN, WENN DER ABRUF SCHEITERT.
      // Sonst bleibt die Einstufung des letzten geglückten Laufs stehen und
      // behauptet eine Messung, die es diesmal nicht gab. Real gemessen:
      // energieverbraucher.de stand mit Priorität A im Katalog, ohne einen
      // einzigen Kontakt — die A kam aus einem Lauf, dessen Abruf noch geklappt
      // hatte. Dieselbe Fehlerklasse wie ein Prüfdatum ohne Prüfung.
      medienZeilen.push({
        domain: m.domain,
        profil_at: new Date().toISOString(),
        fehler: res.fehler,
        titel: null,
        medientyp: null,
        themen: null,
        geschichten: null,
        reichweite: null,
        reichweite_quelle: null,
        ist_medium: null,
        medium_grund: null,
        medium_merkmale: null,
        seiten: null,
        formular_url: null,
        impressum_url: null,
        prioritaet: null,
        aufhaenger: null,
        hinweis: null,
        updated_at: new Date().toISOString(),
      });
      leer++;
      log(`${m.domain}: ${res.fehler}`, "err");
      return;
    }
    const a = werteAus(m.domain, res);
    medienZeilen.push({
      domain: a.domain,
      start_url: a.start_url,
      titel: a.titel,
      medientyp: a.medientyp,
      themen: a.themen,
      geschichten: a.geschichten,
      reichweite: a.reichweite,
      reichweite_quelle: a.reichweite_quelle,
      ist_medium: a.ist_medium,
      medium_grund: a.medium_grund,
      medium_merkmale: a.medium_merkmale,
      seiten: a.seiten,
      formular_url: a.formular_url,
      impressum_url: a.impressum_url,
      prioritaet: a.prioritaet,
      aufhaenger: a.aufhaenger,
      hinweis: a.hinweis,
      profil_at: new Date().toISOString(),
      fehler: null,
      updated_at: new Date().toISOString(),
    });
    kontaktZeilen.push(...a.kontakte);
    belegZeilen.push(...a.belege);
    ok++;
    const personen = a.kontakte.filter((k) => k.name).length;
    log(
      `${a.domain}: ${a.ist_medium}, ${personen} Person(en), ${a.kontakte.length} Kontakt(e), Prio ${a.prioritaet}`,
      "ok",
    );
  });

  await upsert(sb, "presse_medien", medienZeilen, "domain");
  // ALTE KONTAKTE EINES NEU GELESENEN MEDIUMS WEG, BEVOR DIE NEUEN KOMMEN.
  // Ein Upsert schreibt nur, was jetzt gefunden wurde — was ein früherer Lauf
  // fälschlich gefunden hat, bleibt sonst für immer stehen. Real gemessen am
  // 03.09.2026: „Rolle Vorstandsmitglied" und „National Geographic Magazin"
  // standen nach dem Fix weiter im Katalog, weil ihre Zeilen aus dem Lauf davor
  // stammten. Der Fix sah im Diff richtig aus und änderte nichts.
  const angefasst = medienZeilen.map((z) => String(z.domain));
  for (let i = 0; i < angefasst.length; i += 200) {
    const { error } = await sb
      .from("presse_kontakte")
      .delete()
      .in("domain", angefasst.slice(i, i + 200));
    if (error) throw new Error(`alte Kontakte entfernen: ${error.message}`);
  }
  await upsert(sb, "presse_kontakte", kontaktZeilen, "domain,schluessel");
  await upsert(sb, "presse_belege", belegZeilen, "domain,merkmal,quelle_url");
  log(`${ok} gelesen, ${leer} nicht erreichbar, ${kontaktZeilen.length} Kontakte`, "ok");
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

/** Stabile Spaltennamen — sie sind ab dem ersten gelieferten Katalog eine
 *  Schnittstelle und dürfen sich nicht mehr ändern. */
const SPALTEN = [
  "medium",
  "website",
  "medientyp",
  "schwerpunkt",
  "gebiet",
  "reichweite",
  "redaktion_oder_person",
  "funktion",
  "kontakt",
  "kontakt_art",
  "quelle_url",
  "geprueft_am",
  "passende_geschichten",
  "aufhaenger",
  "prioritaet",
  "mediengruppe",
  "paket",
  "notizen",
] as const;

function csvFeld(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

interface MediumZeile {
  domain: string;
  saat_name: string | null;
  saat_typ: string | null;
  saat_schwerpunkt: string | null;
  saat_gebiet: string | null;
  gruppe: string | null;
  paket: number;
  notiz: string | null;
  titel: string | null;
  medientyp: string[] | null;
  themen: Themenfund[] | null;
  geschichten: string[] | null;
  reichweite: string | null;
  ist_medium: string | null;
  medium_grund: string | null;
  formular_url: string | null;
  prioritaet: string | null;
  aufhaenger: string | null;
  hinweis: string | null;
  profil_at: string | null;
  fehler: string | null;
}

interface KontaktZeile {
  domain: string;
  name: string | null;
  funktion: string | null;
  rang: number;
  mail: string | null;
  mail_art: string | null;
  formular_url: string | null;
  quelle_url: string;
  geprueft_am: string;
}

async function csv(paket: Paket | null, nurMedien: boolean, top: number): Promise<void> {
  const sb = await makeClient();
  const medien = await alleZeilen<MediumZeile>(sb, "presse_medien", "*");
  const kontakte = await alleZeilen<KontaktZeile>(sb, "presse_kontakte", "*");
  const jeDomain = new Map<string, KontaktZeile[]>();
  for (const k of kontakte) jeDomain.set(k.domain, [...(jeDomain.get(k.domain) ?? []), k]);

  // Dieselbe Adresse unter zwei Domains ist eine DUBLETTE für den Versand —
  // gemessen bei pv magazine, dessen Redaktion auf der deutschen und der
  // internationalen Seite steht. Nicht löschen (beide Titel sind echt), aber
  // benennen: Wer beide anschreibt, schreibt demselben Menschen zweimal.
  const mailKommtVor = new Map<string, string[]>();
  for (const k of kontakte) {
    if (!k.mail) continue;
    mailKommtVor.set(k.mail, [...(mailKommtVor.get(k.mail) ?? []), k.domain]);
  }

  const zeilen: string[] = [SPALTEN.join(",")];
  const sortiert = medien
    .filter((m) => paket === null || m.paket === paket)
    .filter((m) => !nurMedien || m.ist_medium === "medium")
    .sort((a, b) => {
      const p = (x: string | null) => (x === "A" ? 0 : x === "B" ? 1 : 2);
      return p(a.prioritaet) - p(b.prioritaet) || a.domain.localeCompare(b.domain);
    });

  for (const m of sortiert) {
    const ks = (jeDomain.get(m.domain) ?? []).sort((a, b) => b.rang - a.rang);
    // Eine Zeile je KONTAKT, nicht je Medium — der Katalog wird zum Anschreiben
    // benutzt, und angeschrieben wird ein Mensch oder ein Postfach.
    // Mit --top wird je Medium nur der BESTE Kontakt ausgegeben. Das ist die
    // Fassung für die Qualitätskontrolle in Paketen von 50: Fünfzig Zeilen von
    // fünfzig verschiedenen Medien lassen sich lesen, fünfzig Zeilen von acht
    // Medien nicht.
    const auszugeben = ks.length ? (top > 0 ? ks.slice(0, 1) : ks) : [null];
    for (const k of auszugeben) {
      zeilen.push(
        [
          mediumName(m),
          `https://${m.domain}`,
          feldMitVermerk(m.medientyp?.join(" · ") ?? null, m.saat_typ),
          feldMitVermerk(themenText(m.themen), m.saat_schwerpunkt),
          `${m.saat_gebiet ?? ""} (ungeprüft)`,
          m.reichweite ?? "ungeprüft",
          k?.name ??
            (k?.mail_art === "person-ohne-namen"
              ? "Person (Name auf der Seite nicht zuzuordnen)"
              : k?.mail
                ? "Redaktion (Postfach)"
                : m.fehler
                  ? ""
                  : "ungeprüft"),
          k?.funktion ?? "",
          k?.mail ?? k?.formular_url ?? m.formular_url ?? "",
          kontaktArt(k, !!m.formular_url),
          k?.quelle_url ?? "",
          k?.geprueft_am ?? (m.profil_at ? m.profil_at.slice(0, 10) : ""),
          (m.geschichten ?? []).join(" · "),
          m.aufhaenger ?? "",
          zeilenPrioritaet(m.prioritaet, k),
          m.gruppe ?? "",
          String(m.paket),
          notizen(m, k, mailKommtVor),
        ].map(csvFeld).join(","),
      );
    }
  }
  const kopf = zeilen[0];
  const rest = top > 0 ? zeilen.slice(1, top + 1) : zeilen.slice(1);
  // eslint-disable-next-line no-console
  console.log([kopf, ...rest].join("\n"));
}

/**
 * Wie das Medium im Katalog heißt.
 *
 * Gemessen schlägt angenommen — mit EINER Ausnahme, und die ist ebenfalls
 * gemessen: energiezukunft.eu trägt als Seitentitel „EWS Schönau" (den Namen
 * seines Herausgebers), springerprofessional.de „Springer Professional". Beides
 * ist wahr und im Verteiler unbrauchbar: Wer die Zeile liest, sucht das Medium,
 * nicht den Verlag. Teilt der gemessene Titel kein tragendes Wort mit dem Namen
 * aus der Saat oder mit der Adresse, gilt der Name aus der Saat — und der
 * gemessene Titel steht in den Notizen, damit die Abweichung nicht verschwindet.
 */
function mediumName(m: MediumZeile): string {
  if (!m.titel) return m.saat_name ?? m.domain;
  if (!m.saat_name) return m.titel;
  if (teiltWort(m.titel, `${m.saat_name} ${m.domain}`)) return m.titel;
  return m.saat_name;
}

function teiltWort(a: string, b: string): boolean {
  const zerlege = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .split(/[^a-zäöüß0-9]+/)
        .filter((w) => w.length >= 4),
    );
  const eins = zerlege(a);
  for (const w of zerlege(b)) if (eins.has(w)) return true;
  return false;
}

function titelBrauchbarImKatalog(m: MediumZeile): boolean {
  return !!m.titel;
}

function themenText(t: Themenfund[] | null): string | null {
  if (!t || !t.length) return null;
  return t
    .filter((x) => x.treffer >= 2)
    .slice(0, 5)
    .map((x) => `${x.name} (${x.treffer})`)
    .join(" · ");
}

/** Gemessenes schlägt Vorannahme — und was nur aus der Saat kommt, trägt den
 *  Vermerk. Ohne ihn wäre eine Behauptung von einer Messung nicht zu
 *  unterscheiden, und genau das verbietet die Vorgabe. */
function feldMitVermerk(gemessen: string | null, saat: string | null): string {
  if (gemessen) return gemessen;
  return saat ? `${saat} (ungeprüft)` : "ungeprüft";
}

function kontaktArt(k: KontaktZeile | null, mediumHatFormular: boolean): string {
  if (!k) return "kein Kontakt gefunden";
  if (k.mail_art === "person") return "persönliche Adresse";
  if (k.mail_art === "redaktion") return "Redaktionspostfach";
  if (k.mail_art === "allgemein") return "allgemeines Postfach";
  if (k.mail_art === "werblich") return "nur Werbekontakt gefunden";
  if (k.mail_art === "formular") return "Kontaktformular";
  if (k.mail_art === "person-ohne-namen") return "persönliche Adresse, Name nicht zugeordnet";
  // Die Person ist benannt, die Adresse fehlt — dann steht in der Kontaktspalte
  // das Formular DES MEDIUMS. Das muss dranstehen: „Person ohne Adresse" neben
  // einer Adresse in derselben Zeile ist genau die Sorte Beschriftung, die etwas
  // anderes sagt als der Wert daneben.
  if (k.name) {
    return mediumHatFormular
      ? "Person benannt — erreichbar über das Kontaktformular des Mediums"
      : "Person benannt, keine Adresse veröffentlicht";
  }
  return "ungeprüft";
}

/**
 * Die Priorität der ZEILE, nicht des Mediums.
 *
 * Ein A-Medium kann einen C-Kontakt tragen: Bei pv magazine steht die
 * Australien-Redaktion auf derselben Seite wie die deutsche. Wer die Zeile nach
 * der Medien-Priorität abarbeitet, schreibt einer Kollegin in Sydney über den
 * Zubau in Nordrhein-Westfalen.
 */
function zeilenPrioritaet(medium: string | null, k: KontaktZeile | null): string {
  const p = medium ?? "C";
  if (!k) return p;
  if (AUSLAND.test(k.funktion ?? "")) return "C";
  // Eine Verlagsgeschäftsführung ist nie der Adressat einer Datengeschichte.
  if (k.rang <= 20) return p === "A" ? "B" : "C";
  return p;
}

const AUSLAND =
  /\b(?:France|Australia|Brasil|Brazil|Italia|Italy|España|Spain|India|China|Japan|Mexico|Chile|Argentina|USA|U\.S\.|America|UK|Ireland|Poland|Polska|Nederland|Netherlands|Türkiye|Turkey|Frankreich|Australien|Brasilien|Italien|Spanien|Indien|Polen|Niederlande|Türkei)\b/i;

function notizen(
  m: MediumZeile,
  k: KontaktZeile | null,
  mailKommtVor: Map<string, string[]>,
): string {
  const teile: string[] = [];
  if (m.fehler) teile.push(`Abruf: ${m.fehler}`);
  if (m.hinweis) teile.push(m.hinweis);
  if (m.ist_medium === "unklar") teile.push("redaktionelles Angebot nicht eindeutig belegt");
  if (m.ist_medium === "kein-medium") teile.push(`kein redaktionelles Angebot (${m.medium_grund})`);
  if (k && k.name && !k.mail) teile.push("Person benannt, Adresse nur über Postfach/Formular");
  if (k && k.mail_art === "werblich") teile.push("kein redaktioneller Weg gefunden");
  if (k?.funktion && AUSLAND.test(k.funktion)) {
    teile.push("Auslandsredaktion — berichtet nicht über Deutschland");
  }
  if (k?.mail) {
    const auch = (mailKommtVor.get(k.mail) ?? []).filter((d) => d !== m.domain);
    if (auch.length) teile.push(`dieselbe Adresse auch unter ${auch.join(", ")}`);
  }
  if (!titelBrauchbarImKatalog(m)) {
    teile.push("Name des Mediums aus der Saat (ungeprüft)");
  } else if (mediumName(m) !== m.titel) {
    teile.push(`Seitentitel lautet abweichend: „${m.titel}"`);
  }
  if (m.gruppe) teile.push(`Mediengruppe: ${m.gruppe}`);
  if (m.notiz) teile.push(m.notiz);
  return teile.join("; ");
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
      "npm run presse -- --stats                 Bestand",
    ].join("\n"),
  );
}

main().catch((e) => {
  log(e instanceof Error ? e.message : String(e), "err");
  process.exit(1);
});
