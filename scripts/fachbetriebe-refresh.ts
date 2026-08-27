/**
 * PV-Fachbetriebe — Erhebung in Phasen, jede mit Gedächtnis.
 *
 * WOZU: Der Wettbewerbsbefund vom 27.08.2026 (docs/seo/wettbewerb-solarcheck-
 * deutschland.md, Abschnitt 4) hat gemessen, wer einen unabhängigen Rechner ohne
 * Leadfunnel wirklich verlinkt. Größte Gruppe: Fachbetriebe. Sie sind nicht der
 * Gegner des leadfreien Rechners, sondern sein natürlicher Verteiler — und für
 * sie ist das Einbett-Widget das passendere Angebot als ein bloßer Link.
 *
 * WAS DIESES SKRIPT NICHT TUT: Es baut keinen Vermittlungsweg, kein Anschreiben,
 * kein Cockpit und verschickt nichts. Es erhebt. Die Zusage „ohne Verkaufsanrufe,
 * keine Lead-Erfassung, kein Vertriebskontakt" steht an vierzehn Stellen im Code
 * und in der Datenschutzerklärung; sie wird hier nicht angefasst.
 *
 * Nutzung:
 *   npm run fachbetriebe -- --setup                    Tabellen anlegen (idempotent)
 *   npm run fachbetriebe -- --suche --dry              was gefragt würde, ohne Geld
 *   npm run fachbetriebe -- --suche --limit 50         Ortssuche je Landkreis
 *   npm run fachbetriebe -- --art                      Portale von Betrieben trennen (gemessen)
 *   npm run fachbetriebe -- --profil --limit 100       Impressum + Startseite lesen
 *   npm run fachbetriebe -- --ags                      Adresse → amtlicher Gemeindeschlüssel
 *   npm run fachbetriebe -- --stats                    was drin ist
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WARUM DIE ORTSSUCHE UND NICHT EIN FERTIGES VERZEICHNIS
 *
 * Vier Quellen wurden am 27.08.2026 gemessen, drei sind verworfen — Begründung
 * je Quelle in docs/fachbetriebe-quellen.md, damit die nächste Sitzung den Weg
 * nicht noch einmal geht:
 *
 *  - GOOGLE PLACES / MAPS: rechtlich gesperrt, dreifach. Maps Platform Terms
 *    3.2.3(a)(iii) untersagt „copy and save business names, addresses, or user
 *    reviews", (b) das Zwischenspeichern über Kennnummern hinaus, und (d)(iii)
 *    ausdrücklich die Nutzung „in a listings or directory service" — also genau
 *    diesen Fall. Volltext-Auszug: docs/quellen/fachbetriebe/.
 *  - HANDWERKSKAMMER-VERZEICHNISSE: fachlich stark (amtliche Gewerke, Landkreis,
 *    58 % mit Website), aber der bequeme Freibrief trägt NICHT. § 2 Abs. 5 DNG
 *    („öffentliche Stellen berufen sich nicht auf § 87b UrhG") gilt nur im
 *    Anwendungsbereich des Gesetzes, und § 2 Abs. 3 Nr. 1 nimmt davon aus, was
 *    personenbezogen ist (Buchst. a Doppelbuchst. aa — Einzelunternehmer stehen
 *    dort mit Namen und Handynummer) und was nicht zum gesetzlichen Auftrag
 *    gehört (Buchst. d — die Betriebsdatenbank ist eine freiwillige
 *    Werbedatenbank, nicht die Handwerksrolle nach § 6 HwO).
 *  - OPENSTREETMAP: gemessen und zu dünn. 52 Objekte mit Solar-Bezug in ganz
 *    Deutschland, 3.716 Elektrobetriebe insgesamt — bei rund 50.000 realen
 *    Betrieben. Zufällig verteilt, ohne Aussage zum PV-Geschäft.
 *  - ORTSSUCHE (dieser Weg): liefert per Konstruktion nur Betriebe MIT Website,
 *    also genau die, die ein Widget einbetten könnten. Ein Betrieb ohne Website
 *    ist für den Zweck wertlos. Wir entnehmen keiner fremden Datenbank etwas,
 *    sondern lesen danach die Impressen, die § 5 DDG ohnehin öffentlich verlangt.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DREI ENTSCHEIDUNGEN, DIE NICHT „AUFGERÄUMT" WERDEN DÜRFEN
 *
 * 1. DIE DOMAIN IST DIE IDENTITÄT, nicht der Firmenname. Für die Verteilung
 *    zählt die Website; Firmennamen sind weder eindeutig noch stabil („Elektro
 *    Müller" gibt es hundertfach), und derselbe Betrieb kann mehrere führen.
 *
 * 2. KEIN MERKMAL OHNE BELEG. Jeder Fund landet mit Fundstelle, Textstelle und
 *    Datum in `fachbetrieb_belege`; die Spalte in `fachbetriebe` ist nur die
 *    Auswertung daraus. Wer später anders bewerten will, bewertet die Belege neu
 *    und braucht keinen zweiten Crawl. „Vermutlich Meisterbetrieb" gibt es nicht.
 *
 * 3. DIE EINORDNUNG IST GEMESSEN, NICHT GEPFLEGT. Ob eine Domain ein Betrieb
 *    oder ein Portal ist, entscheidet ihre Streuung: Ein Fachbetrieb erscheint
 *    in ein bis drei Landkreisen, ein Vergleichsportal in dreißig. Eine
 *    gepflegte Sperrliste wäre dasselbe Wettrennen wie beim Förder-Crawl — sie
 *    veraltet, sobald ein neues Portal aufmacht. Die Streuung veraltet nie.
 */

import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import {
  FRAGEN,
  type Kreis,
  hostVon,
  impressumUrl,
  istPlattform,
  normOrt,
  portalSchwelle,
  profilAus,
} from "../lib/fachbetrieb-extrakt";

// ─── Grundlagen ──────────────────────────────────────────────────────────────

const UA = "solar-check.io fachbetriebe/1.0 (+https://solar-check.io)";
const FETCH_TIMEOUT_MS = 15000;

/** Preis je SERP-Abruf, belegt in scripts/seo-verify.md (Stand 08/2026). */
const PREIS_JE_ABRUF = 0.002;

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

/**
 * Stapelweise schreiben — SORTIERT, und das ist keine Kosmetik.
 *
 * Postgres sperrt die Zeilen eines Upserts in der Reihenfolge, in der sie im
 * Stapel stehen. Laufen mehrere Abrufe parallel und überschneiden sich ihre
 * Domain-Mengen (was bei benachbarten Landkreisen der Normalfall ist), sperren
 * zwei Stapel dieselben Zeilen in verschiedener Reihenfolge — und Postgres
 * bricht einen davon mit „deadlock detected" ab. Real passiert am 27.08.2026
 * nach 375 von 735 Abrufen; der Lauf war weg, die Kosten dafür bezahlt.
 *
 * Ein Wiederholversuch wäre die schlechtere Antwort: Er macht den Deadlock
 * seltener, nicht unmöglich, und verdeckt ihn dann. Bei gleicher Sortierung in
 * jedem Stapel kann es ihn gar nicht mehr geben.
 */
async function upsertGestueckelt(
  sb: SupabaseLike,
  tabelle: string,
  zeilen: Record<string, unknown>[],
  onConflict: string,
): Promise<void> {
  const schluessel = onConflict.split(",")[0].trim();
  const sortiert = [...zeilen].sort((a, b) =>
    String(a[schluessel] ?? "").localeCompare(String(b[schluessel] ?? "")),
  );
  for (let i = 0; i < sortiert.length; i += 500) {
    const { error } = await sb
      .from(tabelle)
      .upsert(sortiert.slice(i, i + 500), { onConflict, ignoreDuplicates: false });
    if (error) throw new Error(`${tabelle} schreiben (ab ${i}): ${error.message}`);
  }
}

function heute(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Setup ───────────────────────────────────────────────────────────────────

async function setup(): Promise<void> {
  const sb = await makeClient();
  // Interne Erhebungsdaten — wie kommunen_kontakt und utilities BEWUSST ohne
  // anon-Read. Die Sätze enthalten bei Einzelunternehmern personenbezogene
  // Daten (Name, Telefon); RLS an + nur service_role, öffentlicher Zugriff
  // läuft ins Leere (default deny).
  const sql = `
    CREATE TABLE IF NOT EXISTS fachbetriebe (
      domain text PRIMARY KEY,
      firmenname text,
      rechtsform text,
      hr_gericht text,
      hr_nummer text,
      ust_id text,
      strasse text,
      plz text,
      ort text,
      -- 8-stelliger Gemeindeschlüssel. NUR gesetzt, wenn er gegen
      -- mastr_regions aufgeht — ein Schlüssel ohne Aussehen darf nicht geraten
      -- werden (CLAUDE.md, BLOCKER).
      region_id text REFERENCES mastr_regions(region_id),
      kreis_id text,
      ags_quelle text,
      impressum_url text,
      telefon text,
      email text,
      gruendungsjahr integer,
      meisterbetrieb boolean,
      innung text,
      handwerkskammer text,
      installateurverzeichnis boolean,
      zertifikate text[],
      -- Bewertung NUR als Selbstauskunft der eigenen Website. Nie aus Google:
      -- Maps Platform Terms 3.2.3(a)(iii) untersagt das Speichern von Reviews,
      -- (d)(iii) die Nutzung in einem Verzeichnisdienst.
      bewertung_wert numeric,
      bewertung_anzahl integer,
      bewertung_quelle text,
      geschaeftsfelder text[],
      -- 'unklar' als Voreinstellung ist Absicht: Ein stilles 'betrieb' wäre ein
      -- Urteil ohne Messung.
      art text NOT NULL DEFAULT 'unklar',
      art_grund text,
      kreise_gesehen integer NOT NULL DEFAULT 0,
      profil_at timestamptz,
      profil_fehler text,
      erfasst_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_fb_art ON fachbetriebe (art);
    CREATE INDEX IF NOT EXISTS idx_fb_kreis ON fachbetriebe (kreis_id);
    CREATE INDEX IF NOT EXISTS idx_fb_profil ON fachbetriebe (profil_at NULLS FIRST);

    -- Der Rohfund mit seiner Fundstelle. Die Spalten in fachbetriebe sind die
    -- Auswertung daraus; wer später anders bewerten will, liest hier neu und
    -- braucht keinen zweiten Crawl.
    CREATE TABLE IF NOT EXISTS fachbetrieb_belege (
      domain text NOT NULL REFERENCES fachbetriebe(domain) ON DELETE CASCADE,
      merkmal text NOT NULL,
      wert text NOT NULL,
      fundstelle text NOT NULL,
      textstelle text,
      gefunden_am date NOT NULL DEFAULT current_date,
      PRIMARY KEY (domain, merkmal, wert, fundstelle)
    );

    -- Jeder Ortstreffer einzeln. Trägt zwei Aussagen: das gemessene
    -- Einzugsgebiet (in welchen Kreisen erscheint der Betrieb) und die
    -- Streuung, aus der sich Betrieb von Portal trennen lässt.
    CREATE TABLE IF NOT EXISTS fachbetrieb_treffer (
      domain text NOT NULL,
      kreis_id text NOT NULL,
      frage text NOT NULL,
      rang integer,
      titel text,
      gesehen_am date NOT NULL DEFAULT current_date,
      PRIMARY KEY (domain, kreis_id, frage)
    );
    CREATE INDEX IF NOT EXISTS idx_fbt_kreis ON fachbetrieb_treffer (kreis_id);

    -- Gedächtnis der Suche: jeder Lauf macht dort weiter, wo der letzte aufhörte.
    CREATE TABLE IF NOT EXISTS fachbetrieb_suchlauf (
      kreis_id text NOT NULL,
      frage text NOT NULL,
      gesucht_am timestamptz NOT NULL DEFAULT now(),
      treffer integer NOT NULL DEFAULT 0,
      fehler text,
      PRIMARY KEY (kreis_id, frage)
    );

    ALTER TABLE fachbetriebe ENABLE ROW LEVEL SECURITY;
    ALTER TABLE fachbetrieb_belege ENABLE ROW LEVEL SECURITY;
    ALTER TABLE fachbetrieb_treffer ENABLE ROW LEVEL SECURITY;
    ALTER TABLE fachbetrieb_suchlauf ENABLE ROW LEVEL SECURITY;
    DO $$
    DECLARE t text;
    BEGIN
      FOREACH t IN ARRAY ARRAY['fachbetriebe','fachbetrieb_belege','fachbetrieb_treffer','fachbetrieb_suchlauf'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_service_all') THEN
          EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t || '_service_all', t);
        END IF;
      END LOOP;
    END $$;
  `;
  const { error } = await sb.rpc("exec_sql", { sql });
  if (error) throw new Error(`setup: ${error.message}`);
  log("fachbetriebe, _belege, _treffer, _suchlauf angelegt (RLS an, nur service_role)", "ok");
}

// ─── Landkreise ──────────────────────────────────────────────────────────────

function ladeKreise(): Kreis[] {
  const pfad = resolve(process.cwd(), "public", "geo", "de-landkreise.geo.json");
  const geo = JSON.parse(readFileSync(pfad, "utf8")) as {
    features: { properties: Kreis }[];
  };
  return geo.features.map((f) => f.properties);
}

const BUNDESLAND: Record<string, string> = {
  "01": "Schleswig-Holstein",
  "02": "Hamburg",
  "03": "Niedersachsen",
  "04": "Bremen",
  "05": "Nordrhein-Westfalen",
  "06": "Hessen",
  "07": "Rheinland-Pfalz",
  "08": "Baden-Württemberg",
  "09": "Bayern",
  "10": "Saarland",
  "11": "Berlin",
  "12": "Brandenburg",
  "13": "Mecklenburg-Vorpommern",
  "14": "Sachsen",
  "15": "Sachsen-Anhalt",
  "16": "Thüringen",
};

interface SerpTreffer {
  url: string;
  rang: number;
  titel: string;
}

async function serp(
  frage: string,
): Promise<{ treffer: SerpTreffer[]; fehler: string | null }> {
  const login = process.env.DATAFORSEO_LOGIN;
  const passwort = process.env.DATAFORSEO_PASSWORD;
  const auth = Buffer.from(`${login}:${passwort}`).toString("base64");
  try {
    const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      // Nur EIN Task je Aufruf — mehrere quittiert die Schnittstelle mit
      // „You can set only one task at a time" (scripts/seo-verify.md).
      body: JSON.stringify([
        { keyword: frage, location_code: 2276, language_code: "de", depth: 30 },
      ]),
    });
    if (!res.ok) return { treffer: [], fehler: `HTTP ${res.status}` };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const daten: any = await res.json();
    const aufgabe = daten?.tasks?.[0];
    // „No Search Results" ist ein ERGEBNIS, kein Fehlschlag.
    if (/no search results/i.test(String(aufgabe?.status_message ?? ""))) {
      return { treffer: [], fehler: null };
    }
    if (aufgabe?.status_code && aufgabe.status_code >= 40000) {
      return { treffer: [], fehler: String(aufgabe.status_message ?? aufgabe.status_code) };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posten: any[] = aufgabe?.result?.[0]?.items ?? [];
    const treffer = posten
      .filter((p) => p?.type === "organic" && typeof p.url === "string")
      .map((p) => ({
        url: String(p.url),
        rang: Number(p.rank_absolute ?? 0),
        titel: String(p.title ?? "").slice(0, 200),
      }));
    return { treffer, fehler: null };
  } catch (e) {
    return { treffer: [], fehler: e instanceof Error ? e.message : String(e) };
  }
}

interface SucheOpts {
  limit: number;
  deckel: number;
  dry: boolean;
  bl?: string;
  neu: boolean;
}

async function suche(opts: SucheOpts): Promise<void> {
  const sb = await makeClient();
  const kreise = ladeKreise().filter((k) => !opts.bl || k.bl === opts.bl);

  const gelaufen = await alleZeilen<{ kreis_id: string; frage: string; fehler: string | null }>(
    sb,
    "fachbetrieb_suchlauf",
    "kreis_id, frage, fehler",
  );
  const erledigt = new Set(
    gelaufen.filter((r) => !r.fehler || opts.neu === false).map((r) => `${r.kreis_id}|${r.frage}`),
  );

  const offen: { kreis: Kreis; frage: (typeof FRAGEN)[number] }[] = [];
  for (const k of kreise) {
    for (const f of FRAGEN) {
      if (!erledigt.has(`${k.id}|${f.name}`)) offen.push({ kreis: k, frage: f });
    }
  }
  // Größte Kreise zuerst? Nein — alphabetisch nach Schlüssel, damit derselbe
  // Aufruf dieselbe Reihenfolge liefert und ein abgebrochener Lauf lückenlos
  // fortsetzt. Eine Reihenfolge nach Größe würde beim Nachlaufen die kleinen
  // Kreise dauerhaft hinten halten.
  offen.sort((a, b) => a.kreis.id.localeCompare(b.kreis.id) || a.frage.name.localeCompare(b.frage.name));

  const zuTun = offen.slice(0, opts.limit);
  const kosten = zuTun.length * PREIS_JE_ABRUF;
  log(
    `${kreise.length} Kreise · ${offen.length} Abrufe offen · ` +
      `dieser Lauf: ${zuTun.length} ≈ ${kosten.toFixed(3)} $`,
  );

  if (kosten > opts.deckel) {
    log(
      `Kostendeckel ${opts.deckel.toFixed(2)} $ überschritten. Mit --deckel anheben ` +
        `oder --limit senken. Nichts abgerufen.`,
      "err",
    );
    process.exit(1);
  }

  if (opts.dry) {
    for (const t of zuTun.slice(0, 12)) {
      log(`  ${t.kreis.id} ${t.frage.vorlage(t.kreis)}`);
    }
    if (zuTun.length > 12) log(`  … und ${zuTun.length - 12} weitere`);
    log("--dry: nichts abgerufen, nichts geschrieben", "ok");
    return;
  }

  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
    throw new Error("DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD fehlen (.env.local)");
  }

  const tag = heute();
  let neueDomains = 0;
  let fehlgeschlagen = 0;
  let fertig = 0;

  // Ein Abruf dauert rund 15 Sekunden — die Schnittstelle scrapt live, während
  // wir warten. Nacheinander wären die 800 Abrufe vier Stunden; das Warten ist
  // reine Leitungszeit, keine Last bei uns. Sechs parallel bringt den Lauf auf
  // gut vierzig Minuten und bleibt weit unter dem, was die Schnittstelle
  // gleichzeitig zulässt. Jeder Abruf schreibt sein Ergebnis selbst, bevor der
  // nächste beginnt — ein Abbruch kostet deshalb höchstens die sechs laufenden.
  await pool(zuTun, 6, async ({ kreis, frage }) => {
    const text = frage.vorlage(kreis);
    const { treffer, fehler } = await serp(text);

    const eintraege = new Map<string, SerpTreffer>();
    for (const t of treffer) {
      const host = hostVon(t.url);
      if (!host || istPlattform(host)) continue;
      // Erster (bester) Rang je Domain gewinnt.
      if (!eintraege.has(host)) eintraege.set(host, t);
    }

    // ZUERST das Ergebnis ablegen, DANN weiterrechnen: Ein teurer Lauf, der bei
    // Abbruch nichts hinterlässt, muss beim nächsten Mal noch einmal bezahlt
    // werden.
    if (eintraege.size > 0) {
      // Sortiert, weil parallele Abrufe benachbarter Kreise dieselben Domains
      // treffen — siehe Hinweis an `upsertGestueckelt`.
      const domains = Array.from(eintraege.keys())
        .sort()
        .map((d) => ({ domain: d, updated_at: new Date().toISOString() }));
      // Nur anlegen, nie überschreiben — die Profil-Phase schreibt hier hinein.
      const { error: e1 } = await sb
        .from("fachbetriebe")
        .upsert(domains, { onConflict: "domain", ignoreDuplicates: true });
      if (e1) throw new Error(`fachbetriebe anlegen: ${e1.message}`);
      neueDomains += domains.length;

      const zeilen = Array.from(eintraege.entries()).map(([host, t]) => ({
        domain: host,
        kreis_id: kreis.id,
        frage: frage.name,
        rang: t.rang,
        titel: t.titel,
        gesehen_am: tag,
      }));
      await upsertGestueckelt(sb, "fachbetrieb_treffer", zeilen, "domain,kreis_id,frage");
    }

    const { error: e2 } = await sb.from("fachbetrieb_suchlauf").upsert(
      {
        kreis_id: kreis.id,
        frage: frage.name,
        gesucht_am: new Date().toISOString(),
        treffer: eintraege.size,
        fehler,
      },
      { onConflict: "kreis_id,frage" },
    );
    if (e2) throw new Error(`suchlauf schreiben: ${e2.message}`);

    if (fehler) fehlgeschlagen++;
    fertig++;
    if (fertig % 25 === 0) {
      log(`  ${fertig}/${zuTun.length} — zuletzt ${kreis.name} (${eintraege.size} Domains)`);
    }
  });

  log(
    `${zuTun.length} Abrufe · ${neueDomains} Domain-Treffer · ` +
      `${fehlgeschlagen} Abrufe kamen nicht durch · ≈ ${kosten.toFixed(3)} $ ausgegeben`,
    "ok",
  );
}

// ─── Phase: Betrieb oder Portal ──────────────────────────────────────────────

async function einordnen(dry: boolean): Promise<void> {
  const sb = await makeClient();

  const treffer = await alleZeilen<{ domain: string; kreis_id: string }>(
    sb,
    "fachbetrieb_treffer",
    "domain, kreis_id",
  );
  const laeufe = await alleZeilen<{ kreis_id: string }>(sb, "fachbetrieb_suchlauf", "kreis_id");
  const kreiseGelaufen = new Set(laeufe.map((r) => r.kreis_id)).size;
  if (kreiseGelaufen === 0) {
    log("Noch keine Suche gelaufen — nichts einzuordnen.", "err");
    return;
  }

  const kreiseJeDomain = new Map<string, Set<string>>();
  for (const t of treffer) {
    let s = kreiseJeDomain.get(t.domain);
    if (!s) kreiseJeDomain.set(t.domain, (s = new Set()));
    s.add(t.kreis_id);
  }

  const schwelle = portalSchwelle(kreiseGelaufen);
  const zeilen: Record<string, unknown>[] = [];
  let portale = 0;
  let betriebe = 0;

  for (const [domain, kreise] of kreiseJeDomain) {
    const n = kreise.size;
    const istPortal = n >= schwelle;
    if (istPortal) portale++;
    else betriebe++;
    zeilen.push({
      domain,
      // „betrieb" heißt hier: nach der Streuung KEIN Portal. Ob wirklich ein
      // PV-Fachbetrieb dahintersteht, entscheidet erst die Profil-Phase am
      // Impressum — die kann auf 'kein-betrieb' zurückstufen.
      art: istPortal ? "portal" : "betrieb",
      art_grund: istPortal
        ? `in ${n} von ${kreiseGelaufen} abgefragten Kreisen (Schwelle ${schwelle})`
        : `in ${n} Kreis${n === 1 ? "" : "en"} gesehen`,
      kreise_gesehen: n,
      updated_at: new Date().toISOString(),
    });
  }

  log(
    `${kreiseGelaufen} Kreise abgefragt · Schwelle ${schwelle} Kreise\n` +
      `  ${betriebe.toLocaleString()} als Betrieb eingeordnet · ${portale} als Portal`,
  );

  if (dry) {
    const top = zeilen
      .filter((z) => z.art === "portal")
      .sort((a, b) => (b.kreise_gesehen as number) - (a.kreise_gesehen as number))
      .slice(0, 25);
    for (const z of top) log(`  Portal: ${z.domain} — ${z.art_grund}`);
    log("--dry: nichts geschrieben", "ok");
    return;
  }

  await upsertGestueckelt(sb, "fachbetriebe", zeilen, "domain");
  log("Einordnung gespeichert", "ok");
}

// ─── Phase: Profil (Impressum + Startseite) ──────────────────────────────────

async function holeText(url: string): Promise<{ html: string; url: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    return { html: await res.text(), url: res.url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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

async function profil(limit: number, dry: boolean, refetch: boolean): Promise<void> {
  const sb = await makeClient();
  const alle = await alleZeilen<{
    domain: string;
    art: string;
    art_grund: string | null;
    profil_at: string | null;
  }>(sb, "fachbetriebe", "domain, art, art_grund, profil_at");
  // Portale gar nicht erst anfassen — wir wollen ihre Impressen nicht.
  const offen = alle
    .filter((r) => r.art !== "portal" && (refetch || !r.profil_at))
    .sort((a, b) => a.domain.localeCompare(b.domain))
    .slice(0, limit);

  log(`${alle.length} Domains bekannt · ${offen.length} in diesem Lauf`);
  if (dry) {
    for (const o of offen.slice(0, 15)) log(`  ${o.domain}`);
    log("--dry: nichts abgerufen", "ok");
    return;
  }

  const zeilen: Record<string, unknown>[] = [];
  const belege: Record<string, unknown>[] = [];
  let ohneStart = 0;
  let ohneImpressum = 0;
  let fertig = 0;

  await pool(offen, 6, async (r) => {
    const start =
      (await holeText(`https://${r.domain}/`)) ?? (await holeText(`http://${r.domain}/`));
    fertig++;
    if (fertig % 25 === 0) log(`  ${fertig}/${offen.length}`);
    if (!start) {
      ohneStart++;
      zeilen.push({
        domain: r.domain,
        // art/art_grund MÜSSEN mit, siehe Hinweis unten am Upsert.
        art: r.art,
        art_grund: r.art_grund,
        profil_at: new Date().toISOString(),
        profil_fehler: "Startseite nicht erreichbar",
        updated_at: new Date().toISOString(),
      });
      return;
    }
    const impUrl = impressumUrl(start.html, start.url);
    const imp = impUrl ? await holeText(impUrl) : null;
    if (!imp) ohneImpressum++;

    const p = profilAus(r.domain, start, imp, new Date().getFullYear());
    const { belege: bl, ...rest } = p;
    zeilen.push({
      ...rest,
      profil_at: new Date().toISOString(),
      profil_fehler: null,
      updated_at: new Date().toISOString(),
      // Die Profil-Phase darf nur ZURÜCKSTUFEN ('kein-betrieb'), nie die
      // gemessene Einordnung aus --art überschreiben. Hat sie nichts
      // festgestellt, wird der bestehende Wert zurückgeschrieben — NICHT
      // weggelassen: Ein Batch-Upsert vereinheitlicht in PostgREST die
      // Spaltenmenge über alle Objekte des Stapels und füllt fehlende Felder
      // mit NULL. Ein weggelassenes Feld wird also gelöscht, nicht übersprungen
      // (gemessen am 27.08.2026: „null value in column art violates not-null").
      art: p.art ?? r.art,
      art_grund: p.art ? p.art_grund : r.art_grund,
    });
    for (const b of bl) {
      belege.push({
        domain: r.domain,
        merkmal: b.merkmal,
        wert: b.wert.slice(0, 300),
        fundstelle: b.fundstelle.slice(0, 500),
        textstelle: b.textstelle?.slice(0, 400) ?? null,
        gefunden_am: heute(),
      });
    }
  });

  await upsertGestueckelt(sb, "fachbetriebe", zeilen, "domain");
  if (belege.length) {
    await upsertGestueckelt(sb, "fachbetrieb_belege", belege, "domain,merkmal,wert,fundstelle");
  }

  const mit = (f: string) => zeilen.filter((z) => z[f] !== null && z[f] !== undefined).length;
  log(
    `${zeilen.length} Profile · ${ohneStart} Startseite unerreichbar · ${ohneImpressum} ohne Impressum\n` +
      `  Anschrift ${mit("plz")} · Handelsregister ${mit("hr_nummer")} · ` +
      `Meisterbetrieb ${mit("meisterbetrieb")} · Gründungsjahr ${mit("gruendungsjahr")} · ` +
      `Bewertung ${mit("bewertung_wert")}\n` +
      `  ${belege.length} Belege abgelegt`,
    "ok",
  );
}

// ─── Phase: amtlicher Gemeindeschlüssel ──────────────────────────────────────

interface PlzEintrag {
  ort: string;
  ags: string;
  kreis: string;
  land: string;
}

/**
 * Adresse → amtlicher Gemeindeschlüssel, gegen mastr_regions gegengeprüft.
 *
 * Der Schlüssel kommt aus public/plz-ags.json (OpenPLZ, im Repo erzeugt). Das
 * ist eine DRITTE Quelle neben mastr_regions und funding_coverage — deshalb
 * gilt er hier nur, wenn ihn mastr_regions kennt. CLAUDE.md ist an dem Punkt
 * ausdrücklich: Ein achtstelliger Schlüssel ist eine Zahl ohne Aussehen, ein
 * falscher fällt nirgends auf, und Schlüssel gehören nie aus einer
 * Bildschirmliste.
 *
 * 1.464 der 8.298 Postleitzahlen decken mehrere Gemeinden ab. Dort entscheidet
 * der Ortsname aus dem Impressum; passt keiner, bleibt der Schlüssel LEER —
 * lieber keine Zuordnung als die falsche Gemeinde.
 */
async function ags(dry: boolean): Promise<void> {
  const sb = await makeClient();
  const tabelle = JSON.parse(
    readFileSync(resolve(process.cwd(), "public", "plz-ags.json"), "utf8"),
  ) as Record<string, PlzEintrag[]>;

  const gemeinden = new Set(
    (
      await alleZeilen<{ region_id: string }>(sb, "mastr_regions", "region_id", (q) =>
        q.eq("level", "gemeinde"),
      )
    ).map((r) => r.region_id),
  );
  log(`${gemeinden.size.toLocaleString()} Gemeinden in mastr_regions (Gegenprobe)`);

  const betriebe = await alleZeilen<{
    domain: string;
    plz: string | null;
    ort: string | null;
    region_id: string | null;
  }>(sb, "fachbetriebe", "domain, plz, ort, region_id", (q) => q.not("plz", "is", null));

  const zeilen: Record<string, unknown>[] = [];
  const zaehl = { eindeutig: 0, ueberOrt: 0, mehrdeutig: 0, unbekanntePlz: 0, nichtInDb: 0 };

  for (const b of betriebe) {
    const eintraege = tabelle[b.plz!];
    if (!eintraege || eintraege.length === 0) {
      zaehl.unbekanntePlz++;
      continue;
    }
    let treffer: PlzEintrag | null = null;
    let quelle = "";
    if (eintraege.length === 1) {
      treffer = eintraege[0];
      quelle = "plz-eindeutig";
      zaehl.eindeutig++;
    } else if (b.ort) {
      const ziel = normOrt(b.ort);
      treffer =
        eintraege.find((e) => normOrt(e.ort) === ziel) ??
        eintraege.find((e) => normOrt(e.ort).startsWith(ziel) || ziel.startsWith(normOrt(e.ort))) ??
        null;
      if (treffer) {
        quelle = "plz+ort";
        zaehl.ueberOrt++;
      }
    }
    if (!treffer) {
      zaehl.mehrdeutig++;
      continue;
    }
    if (!gemeinden.has(treffer.ags)) {
      // Die Gegenprobe hat angeschlagen: Der Schlüssel aus der PLZ-Tabelle ist
      // in unserem Bestand keine Gemeinde. Das ist ein BEFUND, kein Anlass, ihn
      // trotzdem zu setzen.
      zaehl.nichtInDb++;
      continue;
    }
    zeilen.push({
      domain: b.domain,
      region_id: treffer.ags,
      kreis_id: treffer.kreis,
      ags_quelle: quelle,
      updated_at: new Date().toISOString(),
    });
  }

  log(
    `${betriebe.length} mit Anschrift · ${zeilen.length} zugeordnet\n` +
      `  über eindeutige PLZ ${zaehl.eindeutig} · über PLZ + Ort ${zaehl.ueberOrt}\n` +
      `  offen: ${zaehl.mehrdeutig} mehrdeutig · ${zaehl.unbekanntePlz} PLZ unbekannt · ` +
      `${zaehl.nichtInDb} Schlüssel nicht in mastr_regions`,
  );
  if (dry) {
    log("--dry: nichts geschrieben", "ok");
    return;
  }
  await upsertGestueckelt(sb, "fachbetriebe", zeilen, "domain");
  log("Gemeindeschlüssel gespeichert", "ok");
}

// ─── Phase: Bestand melden ───────────────────────────────────────────────────

async function stats(): Promise<void> {
  const sb = await makeClient();
  const alle = await alleZeilen<{
    domain: string;
    art: string;
    kreis_id: string | null;
    region_id: string | null;
    plz: string | null;
    hr_nummer: string | null;
    gruendungsjahr: number | null;
    meisterbetrieb: boolean | null;
    innung: string | null;
    handwerkskammer: string | null;
    installateurverzeichnis: boolean | null;
    zertifikate: string[] | null;
    bewertung_wert: number | null;
    email: string | null;
    profil_at: string | null;
    profil_fehler: string | null;
  }>(
    sb,
    "fachbetriebe",
    "domain, art, kreis_id, region_id, plz, hr_nummer, gruendungsjahr, meisterbetrieb, innung, handwerkskammer, installateurverzeichnis, zertifikate, bewertung_wert, email, profil_at, profil_fehler",
  );
  const laeufe = await alleZeilen<{ kreis_id: string; frage: string; treffer: number; fehler: string | null }>(
    sb,
    "fachbetrieb_suchlauf",
    "kreis_id, frage, treffer, fehler",
  );
  const kreise = ladeKreise();

  const nachArt = new Map<string, number>();
  for (const r of alle) nachArt.set(r.art, (nachArt.get(r.art) ?? 0) + 1);

  const betriebe = alle.filter((r) => r.art === "betrieb");
  const geprueft = betriebe.filter((r) => r.profil_at);

  log("");
  log("── Bestand ──");
  for (const [k, v] of [...nachArt].sort((a, b) => b[1] - a[1])) {
    log(`  ${k.padEnd(14)} ${v.toLocaleString()}`);
  }
  const abgefragt = new Set(laeufe.map((l) => l.kreis_id)).size;
  const fehlgeschlagen = laeufe.filter((l) => l.fehler).length;
  log(
    `  Kreise abgefragt: ${abgefragt}/${kreise.length}` +
      (fehlgeschlagen ? ` (${fehlgeschlagen} Abrufe kamen nicht durch)` : ""),
  );

  log("");
  log("── Abdeckung je Bundesland (Betriebe mit Anschrift) ──");
  const jeLand = new Map<string, { betriebe: number; kreise: Set<string>; kreiseAbgefragt: Set<string> }>();
  for (const k of kreise) {
    const e = jeLand.get(k.bl) ?? { betriebe: 0, kreise: new Set(), kreiseAbgefragt: new Set() };
    jeLand.set(k.bl, e);
  }
  for (const l of laeufe) {
    const bl = l.kreis_id.slice(0, 2);
    jeLand.get(bl)?.kreiseAbgefragt.add(l.kreis_id);
  }
  for (const b of betriebe) {
    if (!b.kreis_id) continue;
    const bl = b.kreis_id.slice(0, 2);
    const e = jeLand.get(bl);
    if (!e) continue;
    e.betriebe++;
    e.kreise.add(b.kreis_id);
  }
  const kreiseJeLand = new Map<string, number>();
  for (const k of kreise) kreiseJeLand.set(k.bl, (kreiseJeLand.get(k.bl) ?? 0) + 1);
  for (const [bl, e] of [...jeLand].sort((a, b) => b[1].betriebe - a[1].betriebe)) {
    log(
      `  ${(BUNDESLAND[bl] ?? bl).padEnd(24)} ${String(e.betriebe).padStart(5)} Betriebe · ` +
        `${e.kreise.size}/${kreiseJeLand.get(bl) ?? 0} Kreise belegt · ` +
        `${e.kreiseAbgefragt.size}/${kreiseJeLand.get(bl) ?? 0} abgefragt`,
    );
  }

  log("");
  log(`── Trust-Signale (von ${geprueft.length.toLocaleString()} geprüften Betrieben) ──`);
  const quote = (n: number) =>
    geprueft.length ? `${n.toLocaleString()} (${Math.round((100 * n) / geprueft.length)} %)` : "–";
  const zaehl = (f: (r: (typeof geprueft)[number]) => unknown) => geprueft.filter((r) => f(r)).length;
  log(`  Anschrift                 ${quote(zaehl((r) => r.plz))}`);
  log(`  amtl. Gemeindeschlüssel   ${quote(zaehl((r) => r.region_id))}`);
  log(`  Handelsregisternummer     ${quote(zaehl((r) => r.hr_nummer))}`);
  log(`  Gründungsjahr             ${quote(zaehl((r) => r.gruendungsjahr))}`);
  log(`  Meisterbetrieb            ${quote(zaehl((r) => r.meisterbetrieb))}`);
  log(`  Innung                    ${quote(zaehl((r) => r.innung))}`);
  log(`  Handwerkskammer           ${quote(zaehl((r) => r.handwerkskammer))}`);
  log(`  Installateurverzeichnis   ${quote(zaehl((r) => r.installateurverzeichnis))}`);
  log(`  Zertifikat                ${quote(zaehl((r) => r.zertifikate && r.zertifikate.length))}`);
  log(`  Bewertung (Selbstauskunft) ${quote(zaehl((r) => r.bewertung_wert))}`);
  log(`  E-Mail                    ${quote(zaehl((r) => r.email))}`);
  const kaputt = betriebe.filter((r) => r.profil_fehler).length;
  if (kaputt) log(`  Startseite unerreichbar   ${kaputt.toLocaleString()}`);

  const { count } = await sb
    .from("fachbetrieb_belege")
    .select("domain", { count: "exact", head: true });
  log("");
  log(`Belege insgesamt: ${(count ?? 0).toLocaleString()}`);
}

// ─── main ────────────────────────────────────────────────────────────────────

function zahlArg(name: string, standard: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : standard;
}

function textArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dry = argv.includes("--dry");

  const phasen = {
    setup: argv.includes("--setup"),
    suche: argv.includes("--suche"),
    art: argv.includes("--art"),
    profil: argv.includes("--profil"),
    ags: argv.includes("--ags"),
    stats: argv.includes("--stats"),
  };

  if (!Object.values(phasen).some(Boolean)) {
    log(
      "Nichts zu tun.\n" +
        "  --setup                          Tabellen anlegen (idempotent)\n" +
        "  --suche [--limit N] [--deckel X] [--bl 09] [--dry]\n" +
        "                                   Ortssuche je Landkreis (0,002 $ je Abruf)\n" +
        "  --art [--dry]                    Betrieb oder Portal — gemessen an der Streuung\n" +
        "  --profil [--limit N] [--refetch] [--dry]\n" +
        "                                   Startseite + Impressum lesen\n" +
        "  --ags [--dry]                    Anschrift → amtlicher Gemeindeschlüssel\n" +
        "  --stats                          Bestand, Abdeckung, Trust-Signale",
      "err",
    );
    process.exit(1);
  }

  if (phasen.setup) await setup();
  if (phasen.suche) {
    await suche({
      limit: zahlArg("limit", 40),
      deckel: zahlArg("deckel", 0.5),
      dry,
      bl: textArg("bl"),
      neu: argv.includes("--neu"),
    });
  }
  if (phasen.art) await einordnen(dry);
  if (phasen.profil) await profil(zahlArg("limit", 100), dry, argv.includes("--refetch"));
  if (phasen.ags) await ags(dry);
  if (phasen.stats) await stats();
  log("Fertig", "ok");
}

main().catch((err) => {
  log((err as Error).message, "err");
  process.exit(1);
});
