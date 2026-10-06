/**
 * Wind farm operators in Germany — from the register to a proven website.
 *
 *   npx tsx scripts/windbetreiber-refresh.ts --vorflug [--vor-register]  BEREIT / NICHT BEREIT before any run
 *   npx tsx scripts/windbetreiber-refresh.ts --setup
 *   npx tsx scripts/windbetreiber-refresh.ts --register [--neu-lesen]   operators from the export
 *   npx tsx scripts/windbetreiber-refresh.ts --neu-bewerten             re-judge every stored check under today's rules
 *   npx tsx scripts/windbetreiber-refresh.ts --impressum [--limit=N]   check register-given websites
 *   npx tsx scripts/windbetreiber-refresh.ts --geschwister [--auch-von-hand]  a proven sibling's website (same mailbox and address)
 *   npx tsx scripts/windbetreiber-refresh.ts --stand                    completeness; exit 1 on a violation
 *   npx tsx scripts/windbetreiber-refresh.ts --offen [--out=datei]      the list for the manual pass
 *   npx tsx scripts/windbetreiber-refresh.ts --manuell ABR…[,ABR…] <url> [--seite=<url>] [--ersetzen] [--subdomain-ok]
 *   npx tsx scripts/windbetreiber-refresh.ts --belegseiten-nachholen   fetch missing proof pages of hand decisions once
 *   npx tsx scripts/windbetreiber-refresh.ts --anschrift-gegenlesen    address proofs on non-energy sites, for reading
 *   npx tsx scripts/windbetreiber-refresh.ts --marke-gegenlesen [--namen]  brand (or short-name) proofs without mailbox or postcode backing, for reading
 *   npx tsx scripts/windbetreiber-refresh.ts --keine ABR…[,ABR…] "<what was tried>"
 *   npx tsx scripts/windbetreiber-refresh.ts --kein-kontakt <domain> "<which pages were read>"
 *   npx tsx scripts/windbetreiber-refresh.ts --zuruecknehmen ABR…[,ABR…] "<why it is not the operator's>"
 *   npx tsx scripts/windbetreiber-refresh.ts --uebergeben [--schreiben]  utilities to the utility stock
 *
 * The rules are in lib/windbetreiber.ts (when a website counts) and
 * lib/bestand-abgleich.ts (when a domain belongs to another stock). This script
 * only fetches, writes and reports. A website found by hand runs through the
 * SAME check as one found by the machine: the manual pass may point at a
 * different page as evidence, it may not skip the evidence.
 *
 * Nothing is sent.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { abgleichen, organisationsDomain, type Belegungen, type Entscheidungen } from "../lib/bestand-abgleich";
import { impressumUrl, sichtbarerText } from "../lib/fachbetrieb-extrakt";
import {
  PERSONENART_NATUERLICH, PERSONENART_ORGANISATION, STATUS_IN_BETRIEB,
  anschriftSchluessel, besterBeleg, beurteilen, abrufWiederholen, geschwisterWebsite, belegseiteTraegt, ENERGIE, traegtDomainwort, maildomain, marke, nameWoerter, kontaktFelder, ortsWoerterAus, registerKandidaten, standVon, websiteFelder, websiteHerkunft,
  type Akteur, type Beleg, type Kandidat, type Kandidatenquelle, type Stand,
} from "../lib/windbetreiber";
import { MASTR_WIND_SQL } from "../lib/mastr-wind-sql";
import { WINDBETREIBER_SQL } from "../lib/windbetreiber-sql";
import { nurBekannteSpalten, spaltenAusDdl } from "../lib/ddl-spalten";
import { heuteInBerlin } from "../lib/zeit";
import { ladeBelegungen, ladeEntscheidungen } from "./lib/bestand-belegung";
import { browserSchliessen, seiteGerendert } from "./lib/kontakt-browser";
import { abhaengigkeitenCheck, keineBezahlteSucheCheck, lastCheck, paralleleLaeufeCheck, platzCheck, vorflug, zugangCheck, type Check } from "./lib/vorflug";
import { fehlendeSpalten } from "../lib/ddl-spalten";
import { fetchLive } from "./lib/kontakt-lauf";
import { webKomponentenAusklappen } from "../lib/web-komponenten";
import { ERSTER_FEHLVERSUCH } from "./lib/kontakt-freigabe";
import { weitereSitesVon } from "./windbetreiber-kontakte";
import { siteOf } from "../lib/kontakt-suche";
import { findCachedZip, listZipEntries, streamXmlRecords } from "./mastr-bnetza-refresh";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const MAIN = resolve(SCRIPT_DIR, "..").replace(/\/\.claude\/worktrees\/[^/]+$/, "");
const CACHE = resolve(MAIN, "scripts/.cache/windbetreiber");
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const flag = (name: string) => process.argv.includes(`--${name}`);
const LIMIT = Number(arg("limit") ?? Infinity);
const HEUTE = heuteInBerlin();

function env(): void {
  for (const pfad of [resolve(SCRIPT_DIR, "../.env.local"), resolve(MAIN, ".env.local")]) {
    if (!existsSync(pfad)) continue;
    for (const zeile of readFileSync(pfad, "utf8").split("\n")) {
      const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
async function db(): Promise<Db> {
  env();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Paginated AND sorted — an unsorted page read returns rows twice and skips others. */
async function alle<T>(c: Db, tabelle: string, spalten: string, ordnung: string, filter?: (q: Db) => Db): Promise<T[]> {
  const out: T[] = [];
  for (let von = 0; ; von += 1000) {
    let q = c.from(tabelle).select(spalten).order(ordnung).range(von, von + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${tabelle}: ${error.message}`);
    out.push(...(data as T[]));
    if (!data || data.length < 1000) return out;
  }
}

/** Every write names only columns the DDL declares (lib/ddl-spalten.ts). */
const spalten = (tabelle: string, zeilen: Record<string, unknown>[]) => nurBekannteSpalten(tabelle, spaltenAusDdl(WINDBETREIBER_SQL, tabelle), zeilen);

/** Update existing rows one by one. An upsert would have to carry every NOT NULL
 *  column of a row it only wants to amend. */
async function aktualisieren(c: Db, tabelle: string, schluessel: string, zeilen: Record<string, unknown>[]) {
  spalten(tabelle, zeilen);
  await parallel(zeilen, 8, async (z) => {
    const { [schluessel]: id, ...felder } = z;
    const { error } = await c.from(tabelle).update(felder).eq(schluessel, id);
    if (error) throw new Error(`${tabelle} ${String(id)}: ${error.message}`);
  });
}

/** Every row of a batch carries the same columns, or the upsert nulls the missing ones. */
async function schreiben(c: Db, tabelle: string, zeilen: Record<string, unknown>[], onConflict: string) {
  const formen = new Set(zeilen.map((z) => Object.keys(z).sort().join("|")));
  if (formen.size > 1) throw new Error(`${tabelle}: Zeilen mit verschiedener Spaltenmenge in einem Schreibvorgang`);
  spalten(tabelle, zeilen);
  for (let i = 0; i < zeilen.length; i += 500) {
    const { error } = await c.from(tabelle).upsert(zeilen.slice(i, i + 500), { onConflict });
    if (error) throw new Error(`${tabelle} ab ${i}: ${error.message}`);
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

async function setup() {
  const c = await db();
  // The overview reads the operator column of the turbine table, so that
  // table's DDL runs first (idempotent).
  const vorher = await c.rpc("exec_sql", { sql: MASTR_WIND_SQL });
  if (vorher.error) throw new Error(`Windrad-Tabelle: ${vorher.error.message}`);
  const { error } = await c.rpc("exec_sql", { sql: WINDBETREIBER_SQL });
  if (error) throw new Error(`Setup: ${error.message}`);
  await new Promise((r) => setTimeout(r, 3000));
  console.log("windbetreiber, windbetreiber_kandidaten und windbetreiber_uebersicht angelegt (RLS an, nur Dienstschlüssel)");
}

// ─── Register ─────────────────────────────────────────────────────────────────

type Registerstand = {
  export: string;
  gelesen_am: string;
  organisationen: Akteur[];
  natuerlich: { betreiber: number; windraeder: number; kw: number };
  kwJeBetreiber: Record<string, number>;
};

async function registerLesen(neu: boolean): Promise<Registerstand> {
  const zip = findCachedZip();
  const exportName = zip.split("/").pop()!.replace(/\.zip$/, "");
  const datei = resolve(CACHE, `register-${exportName}.json`);
  if (!neu && existsSync(datei)) return JSON.parse(readFileSync(datei, "utf8"));
  const eintraege = (await listZipEntries(zip)).map((e) => e.name);

  const inBetrieb = new Map<string, { n: number; kw: number }>();
  for (const name of eintraege.filter((n) => /^EinheitenWind(_\d+)?\.xml$/i.test(n))) {
    await streamXmlRecords(zip, name, "EinheitWind", (r) => {
      if (r.EinheitBetriebsstatus !== STATUS_IN_BETRIEB || !r.AnlagenbetreiberMastrNummer) return;
      const o = inBetrieb.get(r.AnlagenbetreiberMastrNummer) ?? { n: 0, kw: 0 };
      o.n++;
      o.kw += Number(r.Bruttoleistung ?? 0) || 0;
      inBetrieb.set(r.AnlagenbetreiberMastrNummer, o);
    });
  }
  const katalog = new Map<string, string>();
  await streamXmlRecords(zip, "Katalogwerte.xml", "Katalogwert", (k) => { if (k.Id && k.Wert) katalog.set(k.Id, k.Wert); });
  if (katalog.size < 1000) throw new Error(`Katalog unvollständig (${katalog.size} Werte)`);

  const organisationen: Akteur[] = [];
  const natuerlich = { betreiber: 0, windraeder: 0, kw: 0 };
  const dateien = eintraege.filter((n) => /^Marktakteure_\d+\.xml$/i.test(n)).sort();
  for (let i = 0; i < dateien.length; i++) {
    await streamXmlRecords(zip, dateien[i], "Marktakteur", (r) => {
      const b = inBetrieb.get(r.MastrNummer);
      if (!b) return;
      if (r.Personenart === PERSONENART_NATUERLICH) {
        natuerlich.betreiber++; natuerlich.windraeder += b.n; natuerlich.kw += b.kw;
        return;
      }
      if (r.Personenart !== PERSONENART_ORGANISATION) return;
      organisationen.push({
        ...r,
        RechtsformText: katalog.get(r.Rechtsform) ?? (r.SonstigeRechtsform || r.Rechtsform || ""),
        BundeslandText: katalog.get(r.Bundesland) ?? "",
      });
    });
    process.stderr.write(`\r  Akteursverzeichnis ${i + 1}/${dateien.length}: ${organisationen.length} Organisationen`);
  }
  process.stderr.write("\n");
  const gesehen = organisationen.length + natuerlich.betreiber;
  if (gesehen < inBetrieb.size) {
    // An operator referenced by a turbine but missing from the directory would
    // silently fall out of the stock.
    throw new Error(`${inBetrieb.size - gesehen} Betreiber-Nummern fehlen im Akteursverzeichnis`);
  }
  const stand: Registerstand = {
    export: exportName, gelesen_am: new Date().toISOString(), organisationen, natuerlich,
    kwJeBetreiber: Object.fromEntries([...inBetrieb].map(([k, v]) => [k, v.kw])),
  };
  // Store first, then write: a failed write must not cost another 20-minute read.
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(datei, JSON.stringify(stand));
  return stand;
}

/**
 * The latest register read, without needing the 3-GB export next to it. A
 * worktree has no export, and looking for it there made every report count
 * 0 MW without a word (06.10.2026). The read is named after its export, and
 * export names sort by date.
 */
function registerCache(): Registerstand | null {
  if (!existsSync(CACHE)) return null;
  const neueste = readdirSync(CACHE).filter((n) => /^register-Gesamtdatenexport_\d{8}_.*\.json$/.test(n)).sort().pop();
  return neueste ? JSON.parse(readFileSync(resolve(CACHE, neueste), "utf8")) : null;
}

/** For a report: without the register read the capacity column would be 0 MW, which reads as a fact. */
function registerPflicht(): Registerstand {
  const st = registerCache();
  if (!st) throw new Error(`Kein Registerstand in ${CACHE} — erst --register laufen lassen`);
  return st;
}

const text = (s: string | undefined) => (s && s.trim() ? s.trim() : null);
/** The register's day, from the export name (Gesamtdatenexport_20261001_…). */
const registerTag = (exportName: string) => { const m = exportName.match(/_(\d{4})(\d{2})(\d{2})_/); return m ? `${m[1]}-${m[2]}-${m[3]}` : HEUTE; };

async function register() {
  const c = await db();
  const st = await registerLesen(flag("neu-lesen"));
  const tag = registerTag(st.export);
  const zeilen = st.organisationen.map((a) => ({
    mastr_nr: a.MastrNummer,
    name: a.Firmenname.replace(/＆/g, "&").replace(/\s+/g, " ").trim(),
    rechtsform: text(a.RechtsformText),
    strasse: text(a.Strasse), hausnummer: text(a.Hausnummer), plz: text(a.Postleitzahl), ort: text(a.Ort),
    bundesland: text(a.BundeslandText),
    register_webseite: text(a.Webseite), register_email: text(a.Email)?.toLowerCase() ?? null, register_telefon: text(a.Telefon),
    registergericht: text(a.Registergericht), registernummer: text(a.Registernummer),
    aktiv: true, register_stand: tag, updated_at: new Date().toISOString(),
  }));
  await schreiben(c, "windbetreiber", zeilen, "mastr_nr");
  spalten("windbetreiber", [{ aktiv: false }]);
  const { error, count } = await c.from("windbetreiber").update({ aktiv: false }, { count: "exact" }).lt("register_stand", tag).eq("aktiv", true);
  if (error) throw new Error(error.message);
  const mw = (n: number) => `${Math.round(n / 1000).toLocaleString("de-DE")} MW`;
  const orgKw = st.organisationen.reduce((s, a) => s + (st.kwJeBetreiber[a.MastrNummer] ?? 0), 0);
  console.log(`Register ${st.export}`);
  console.log(`  ${zeilen.length.toLocaleString("de-DE")} Organisationen geschrieben · ${mw(orgKw)}`);
  console.log(`  ${st.natuerlich.betreiber.toLocaleString("de-DE")} natürliche Personen gezählt, nicht gespeichert · ${st.natuerlich.windraeder} Windräder · ${mw(st.natuerlich.kw)}`);
  console.log(`  ${count ?? 0} Betreiber ohne Windrad in Betrieb auf „nicht mehr aktiv" gesetzt`);
}

// ─── Imprint check ────────────────────────────────────────────────────────────

type Impressum = { domain: string; abgerufen_am: string; start: string | null; impressum_url: string | null; text: string | null; startText?: string | null; fehler: string | null; via: "abruf" | "browser" | null; versuche?: number; browser_versucht?: boolean };

/** Legal pages of sites without a German "Impressum" — foreign groups name them in English. */
function rechtsseiteUrl(html: string, basis: string): string | null {
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  const treffer: { url: string; p: number }[] = [];
  while ((m = re.exec(html))) {
    const t = `${m[1]} ${m[2].replace(/<[^>]+>/g, " ")}`.toLowerCase();
    if (/^(mailto:|tel:|javascript:|#)/i.test(m[1])) continue;
    const p = /legal[- ]?notice|legal[- ]?information|corporate[- ]?information|company[- ]?information/.test(t) ? 80
      : /\blegal\b|disclaimer|terms of use/.test(t) ? 50 : 0;
    if (!p) continue;
    try { treffer.push({ url: new URL(m[1], basis).toString(), p }); } catch { /* unusable link */ }
  }
  return treffer.sort((a, b) => b.p - a.p)[0]?.url ?? null;
}

const IMPRESSUM_MARKER = /impressum|angaben gem(?:ae|ä)ss|anbieterkennzeichnung|diensteanbieter|verantwortlich (?:im sinne|für den inhalt)|handelsregister|registergericht|imprint|legal notice/i;

const impressumDatei = (domain: string) => resolve(CACHE, "impressum", `${domain.replace(/[^a-z0-9.-]/g, "_")}.json`);

/**
 * Fetch a domain's imprint once; later runs read the cached text. A failure
 * that says something about OUR attempt (timeout, server error, empty answer)
 * is no answer about the site: it was cached for good until 06.10.2026, and
 * about 40 operators stood as "unreachable" because of a busy hour. It is
 * tried again, at most three times, an hour apart.
 */
/** Visible text below this is an app shell, not a page (sab-windteam.de: 2.5 KB of markup, no text). */
const LEERE_HUELLE = 150;

/** How a check may read: only the cache (re-judging), fetch what is missing, or also fetch again what a browser might read (manual pass). */
type Lesart = "zwischenspeicher" | "abrufen" | "nachholen";
let LESART: Lesart = "abrufen";

async function impressumHolen(domain: string, mitBrowser = true): Promise<Impressum> {
  const datei = impressumDatei(domain);
  let versuche = 0;
  if (existsSync(datei)) {
    const alt: Impressum = JSON.parse(readFileSync(datei, "utf8"));
    // Re-judging reads the cache and nothing else: it ran for ten minutes
    // against the network once the retry rules below reached it (06.10.2026).
    if (LESART === "zwischenspeicher") return alt;
    // Fetched for a search hit, without a browser, and nothing came back: a
    // check that may use the browser (register candidate, manual pass) must
    // not inherit that answer — orsted.de answered 403 to the plain fetch and
    // could never be read by hand afterwards (06.10.2026).
    const ohneBrowser = LESART === "nachholen" && mitBrowser && !alt.text && !alt.startText && !alt.browser_versucht && alt.via !== "browser";
    if (!abrufWiederholen(alt) && !ohneBrowser) return alt;
    versuche = alt.versuche ?? 1;
  }
  const ergebnis: Impressum = { domain, abgerufen_am: new Date().toISOString(), start: null, impressum_url: null, text: null, fehler: null, via: null, versuche: versuche + 1, browser_versucht: mitBrowser };
  // Plain http last: a site with an expired certificate often still answers
  // there (Greifenwind, 100 operators, measured on the first sample).
  const starts = [`https://www.${domain}/`, `https://${domain}/`, `http://www.${domain}/`, `http://${domain}/`];
  let html: string | null = null;
  let huelle: { html: string; start: string } | null = null;
  for (const s of starts) {
    const r0 = await fetchLive(s, { auchServerfehler: true });
    const r = "html" in r0 ? { html: webKomponentenAusklappen(r0.html) } : r0;
    // A page with markup but no text is an app shell: the browser below reads it.
    // The start is where the redirect ENDED (uka-gruppe.de → uka-group.com):
    // resolved against the old address the imprint link pointed nowhere.
    if ("html" in r && r.html.length > 200 && sichtbarerText(r.html).length >= LEERE_HUELLE) { html = r.html; ergebnis.start = ("url" in r0 && r0.url) || s; ergebnis.via = "abruf"; break; }
    if ("html" in r && r.html.length > 200 && !huelle) huelle = { html: r.html, start: s };
    ergebnis.fehler = "error" in r ? r.error : "leere Seite";
  }
  if (!html && mitBrowser) {
    // Pages built by script, or a bot wall that a real browser passes.
    for (const s of starts.slice(0, 2)) {
      const g = await seiteGerendert(s);
      if (g && g.length > 200) { html = g; ergebnis.start = s; ergebnis.via = "browser"; ergebnis.fehler = null; break; }
    }
  }
  // Nothing better than the short page: a small site is still a site.
  if (!html && huelle) { html = huelle.html; ergebnis.start = huelle.start; ergebnis.via = "abruf"; ergebnis.fehler = null; }
  if (html && ergebnis.start) {
    ergebnis.startText = sichtbarerText(html).slice(0, 20000);
    const url = impressumUrl(html, ergebnis.start) ?? rechtsseiteUrl(html, ergebnis.start);
    const versuche = url ? [url] : ["impressum", "impressum/", "imprint", "impressum.html"].map((p) => new URL(p, ergebnis.start!).toString());
    for (const u of versuche) {
      let seite: string | null = null;
      const r0 = await fetchLive(u, { auchServerfehler: true });
      const r = "html" in r0 ? { html: webKomponentenAusklappen(r0.html) } : r0;
      if ("html" in r && (sichtbarerText(r.html).length >= LEERE_HUELLE || !mitBrowser)) seite = r.html;
      else if ("html" in r && mitBrowser) seite = await seiteGerendert(u);
      else if (ergebnis.via === "browser") seite = await seiteGerendert(u);
      if (!seite) continue;
      const t = sichtbarerText(seite);
      // A guessed path counts only when the page really is an imprint.
      if (url || IMPRESSUM_MARKER.test(t)) { ergebnis.impressum_url = u; ergebnis.text = t; ergebnis.fehler = null; break; }
    }
    if (!ergebnis.text) ergebnis.fehler = url ? "Impressum nicht lesbar" : "kein Impressum gefunden";
  }
  mkdirSync(dirname(datei), { recursive: true });
  writeFileSync(datei, JSON.stringify(ergebnis));
  return ergebnis;
}

type Zeile = {
  mastr_nr: string; name: string; strasse: string | null; hausnummer: string | null; plz: string | null; ort: string | null;
  register_webseite: string | null; register_email: string | null; register_telefon: string | null;
  website: string | null; website_beleg: string | null; website_beleg_url?: string | null; gesucht_am: string | null; aktiv: boolean; suche_notiz: string | null;
};
const SPALTEN = "mastr_nr,name,strasse,hausnummer,plz,ort,register_webseite,register_email,register_telefon,website,website_beleg,website_beleg_url,gesucht_am,aktiv,suche_notiz";
const akteurVon = (z: Zeile): Akteur => ({ Firmenname: z.name, Strasse: z.strasse ?? "", Hausnummer: z.hausnummer ?? "", Postleitzahl: z.plz ?? "", Ort: z.ort ?? "" });


let entscheidungenCache: Promise<Entscheidungen> | null = null;
const entscheidungenHolen = () => (entscheidungenCache ??= db().then(ladeEntscheidungen));

let ortsCache: Promise<Set<string>> | null = null;
/** Words of every municipality, district and state name — never a brand. */
function ortsWoerter(): Promise<Set<string>> {
  ortsCache ??= db().then((c) => alle<{ region_id: string; name: string }>(c, "mastr_regions", "region_id,name", "region_id")).then((r) => ortsWoerterAus(r.map((x) => x.name)));
  return ortsCache;
}

type Pruefung = { kandidat: Kandidat; ergebnis: string; beleg: Beleg | null; impressum: Impressum; grund: string | null };

async function pruefen(z: Zeile, k: Kandidat, belegungen: Belegungen): Promise<Pruefung> {
  // A search hit gets no browser: a directory that blocks plain requests is
  // not worth rendering, and those are most of the hits.
  const imp = await impressumHolen(k.domain, k.quelle !== "suche");
  const u = beurteilen(akteurVon(z), k.domain, k.quelle, { impressum: imp.text, startseite: imp.startText ?? null, impressumUrl: imp.impressum_url }, k.postfach ?? z.register_email, await ortsWoerter(), z.register_telefon);
  if (u.ergebnis !== "belegt") {
    const grund = u.ergebnis === "abgelehnt" ? "Impressum nennt weder Name noch Registeranschrift noch Marke"
      : u.ergebnis === "geparkt" ? "Domain steht zum Verkauf oder ist geparkt" : imp.fehler;
    return { kandidat: k, ergebnis: u.ergebnis, beleg: null, impressum: imp, grund };
  }
  // The other stocks are asked AFTER the proof: how official the link is
  // depends on how it was proven, not only on where the candidate came from.
  // juwi.de is a developer proven by the register address; that the installer
  // stock holds it too makes the installer entry wrong, not this one.
  const a = abgleichen(k.domain, "windbetreiber", belegungen, { herkunft: websiteHerkunft(k.quelle, u.beleg!.wie), entscheidungen: await entscheidungenHolen() });
  if (a.art === "entscheiden") {
    const wer = a.mit.map((b) => `${b.bestand}${b.name ? ` ${b.name}` : ""}`).join(", ");
    return { kandidat: k, ergebnis: "konflikt", beleg: u.beleg, impressum: imp, grund: `Domain gehört zum Bestand ${wer}` };
  }
  const seite = u.seite === "startseite" ? { ...imp, impressum_url: imp.start } : imp;
  return { kandidat: k, ergebnis: "belegt", beleg: u.beleg, impressum: seite, grund: null };
}

function kandidatZeile(z: Zeile, p: Pruefung) {
  return {
    mastr_nr: z.mastr_nr, domain: p.kandidat.domain, quelle: p.kandidat.quelle, ergebnis: p.ergebnis,
    beleg: p.beleg?.wie ?? null, textstelle: p.beleg?.textstelle.slice(0, 400) ?? null,
    impressum_url: p.impressum.impressum_url, grund: p.grund?.slice(0, 300) ?? null, geprueft_am: HEUTE,
  };
}


/** Run `n` workers over `items`; every domain is one host, so hosts are never hit in parallel. */
async function parallel<T>(items: T[], n: number, schritt: (x: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) { const i = next++; await schritt(items[i], i); }
  }));
}

async function impressumLauf() {
  const c = await db();
  const zeilen = await alle<Zeile>(c, "windbetreiber", SPALTEN, "mastr_nr", (q) => q.eq("aktiv", true));
  const { belegungen, bericht } = await ladeBelegungen(c, "windbetreiber");
  if (bericht.fehlt.length) console.log(`Hinweis: Bestand fehlt für den Abgleich: ${bericht.fehlt.join(", ")}`);
  const nachAnschrift = new Map<string, Zeile[]>();
  for (const z of zeilen) { const k = anschriftSchluessel(akteurVon(z)); if (k) nachAnschrift.set(k, [...(nachAnschrift.get(k) ?? []), z]); }

  // Everything without a website that no person has closed: a "none" written
  // by an earlier machine run is no answer (the paid search set its search date
  // for 779 operators whose register candidates were never all checked).
  const offen = zeilen.filter((z) => !z.website && !(z.suche_notiz ?? "").startsWith(VON_HAND)).map((z) => ({ z, kandidaten: registerKandidaten(z, nachAnschrift) })).filter((x) => x.kandidaten.length);
  const domains = [...new Set(offen.flatMap((x) => x.kandidaten.map((k) => k.domain)))].slice(0, LIMIT);
  console.log(`${offen.length} Betreiber mit Kandidaten aus dem Register · ${domains.length} Domains zu prüfen`);
  let fertig = 0;
  await parallel(domains, 4, async (d) => {
    await impressumHolen(d);
    if (++fertig % 50 === 0) process.stderr.write(`\r  Impressen ${fertig}/${domains.length}`);
  });
  process.stderr.write("\n");

  const zuPruefen = new Set(domains);
  const kandZeilen: ReturnType<typeof kandidatZeile>[] = [];
  const betrZeilen: Record<string, unknown>[] = [];
  const zahl: Record<string, number> = {};
  for (const { z, kandidaten } of offen) {
    const pr: Pruefung[] = [];
    for (const k of kandidaten.filter((k) => zuPruefen.has(k.domain))) {
      const p = await pruefen(z, k, belegungen);
      pr.push(p);
      kandZeilen.push(kandidatZeile(z, p));
      zahl[p.ergebnis] = (zahl[p.ergebnis] ?? 0) + 1;
    }
    const best = besterBeleg(pr);
    if (best) betrZeilen.push({ mastr_nr: z.mastr_nr, ...websiteFelder(best, HEUTE), updated_at: new Date().toISOString() });
  }
  await schreiben(c, "windbetreiber_kandidaten", kandZeilen, "mastr_nr,domain");
  if (betrZeilen.length) await aktualisieren(c, "windbetreiber", "mastr_nr", betrZeilen);
  console.log(`Prüfungen: ${JSON.stringify(zahl)} · Website belegt für ${betrZeilen.length} Betreiber`);
  await browserSchliessen();
}

/**
 * Operators whose sibling (same register mailbox AND address) has a proven
 * website on that mailbox's domain (lib/windbetreiber.ts → geschwisterWebsite).
 * A person's "no website" is reported, not changed — unless the person running
 * this says so with --auch-von-hand.
 */
async function geschwisterLauf() {
  const c = await db();
  type G = Zeile & { website_beleg: string | null };
  const zeilen = await alle<G>(c, "windbetreiber", `${SPALTEN}`, "mastr_nr", (q) => q.eq("aktiv", true));
  const mitAnschrift = zeilen.map((z) => ({ ...z, anschrift: anschriftSchluessel(akteurVon(z)) }));
  const jeAnschrift = new Map<string, typeof mitAnschrift>();
  for (const z of mitAnschrift) if (z.anschrift) jeAnschrift.set(z.anschrift, [...(jeAnschrift.get(z.anschrift) ?? []), z]);
  const auchVonHand = flag("auch-von-hand");
  const neu: Record<string, unknown>[] = [];
  let vonHandGemeldet = 0;
  for (const z of mitAnschrift) {
    if (z.website || !z.anschrift) continue;
    const d = geschwisterWebsite(z, jeAnschrift.get(z.anschrift) ?? []);
    if (!d) continue;
    // Shown, not just counted: a count asks the reader to go and find them.
    if (vonHandEntschieden(z) && !auchVonHand) { vonHandGemeldet++; console.log(`  ? ${z.mastr_nr} ${z.name}: ${d} — Notiz: ${(z.suche_notiz ?? "").slice(0, 160)}`); continue; }
    const s = (jeAnschrift.get(z.anschrift) ?? []).find((g) => g.website === d)!;
    const p = { kandidat: { domain: d, quelle: "geschwister" as const }, beleg: { wie: "geschwister" as const, textstelle: `gleiches Registerpostfach ${z.register_email} und gleiche Registeranschrift wie ${s.name} (${s.mastr_nr}), dessen Website ${d} belegt ist` }, impressum: { impressum_url: s.website_beleg_url ?? null } };
    neu.push({
      mastr_nr: z.mastr_nr,
      ...websiteFelder(p, HEUTE),
      gesucht_am: HEUTE, suche_notiz: `Schwesterbetreiber ${s.mastr_nr}`, updated_at: new Date().toISOString(),
    });
    // The candidate row carries the proof too, so the report's "proven check" holds.
    await schreiben(c, "windbetreiber_kandidaten", [{ mastr_nr: z.mastr_nr, domain: d, quelle: "geschwister", ergebnis: "belegt", beleg: "geschwister", textstelle: `Schwesterbetreiber ${s.mastr_nr}`, impressum_url: s.website_beleg_url ?? null, grund: null, geprueft_am: HEUTE }], "mastr_nr,domain");
  }
  await aktualisieren(c, "windbetreiber", "mastr_nr", neu);
  console.log(`${neu.length} Betreiber über einen Schwesterbetreiber belegt · ${vonHandGemeldet} von Hand entschiedene nicht geändert${vonHandGemeldet ? " (mit --auch-von-hand übernehmen, nachdem eine Person sie angesehen hat)" : ""}`);
}

// ─── Re-judge after a rule change ─────────────────────────────────────────────

/**
 * A rule change makes every stored verdict stale until it is judged again —
 * a wrong proof would otherwise simply stay (Cirrus GmbH, a wind operator,
 * stood on an aircraft maker's site until the brand needed an energy page).
 * Only the cached imprints are read; nothing is fetched. A website that no
 * longer proves itself is withdrawn and its operator comes back as open.
 */
async function neuBewerten() {
  LESART = "zwischenspeicher";
  const c = await db();
  const zeilen = await alle<Zeile>(c, "windbetreiber", SPALTEN, "mastr_nr", (q) => q.eq("aktiv", true));
  const nachNr = new Map(zeilen.map((z) => [z.mastr_nr, z]));
  const kand = await alle<{ mastr_nr: string; domain: string; quelle: Kandidatenquelle }>(c, "windbetreiber_kandidaten", "mastr_nr,domain,quelle", "mastr_nr");
  const { belegungen } = await ladeBelegungen(c, "windbetreiber");
  // A candidate the register no longer yields under today's domain rule is an
  // artefact of the old rule (three Fraunhofer institutes stood under
  // fraunhofer.de until institutes kept their own host, 06.10.2026). It is
  // removed, not judged again: judged, it would win as the old domain.
  const nachAnschrift = new Map<string, Zeile[]>();
  for (const z of zeilen) { const a = anschriftSchluessel(akteurVon(z)); if (a) nachAnschrift.set(a, [...(nachAnschrift.get(a) ?? []), z]); }
  const heutige = new Map(zeilen.map((z) => [z.mastr_nr, new Set(registerKandidaten(z, nachAnschrift).map((k) => k.domain))]));
  const veraltet = kand.filter((k) => k.quelle !== "manuell" && k.quelle !== "suche" && k.quelle !== "geschwister" && nachNr.has(k.mastr_nr) && !heutige.get(k.mastr_nr)!.has(k.domain));
  for (const k of veraltet) {
    const { error } = await c.from("windbetreiber_kandidaten").delete().eq("mastr_nr", k.mastr_nr).eq("domain", k.domain);
    if (error) throw new Error(error.message);
  }
  const weg = new Set(veraltet.map((k) => `${k.mastr_nr}|${k.domain}`));
  const jeBetreiber = new Map<string, Pruefung[]>();
  const wiederAuf: string[] = [];
  const kandZeilen: ReturnType<typeof kandidatZeile>[] = [];
  let ohneZwischenspeicher = 0;
  for (const k of kand) {
    const z = nachNr.get(k.mastr_nr);
    if (!z || weg.has(`${k.mastr_nr}|${k.domain}`)) continue;
    // A manual proof may rest on another page of the site (--seite); judged
    // again from the imprint cache it would fail and withdraw a person's
    // decision. A run never overwrites what a person decided (installers,
    // 06.10.2026: every crawl reset each demotion).
    // A "no website" a person confirmed may rest on a rejection the rule now
    // reverses (BMR's "914 41 – 0" with an en dash, 06.10.2026): the hand
    // candidate is judged again from the imprint and REPORTED, never taken.
    if (k.quelle === "manuell" && !z.website && vonHandEntschieden(z) && existsSync(impressumDatei(k.domain))) {
      const p = await pruefen(z, { domain: k.domain, quelle: k.quelle }, belegungen);
      if (p.ergebnis === "belegt") wiederAuf.push(`${z.mastr_nr} ${z.name}: als „keine" vermerkt, ${k.domain} trägt heute (${p.beleg!.wie}) — prüfen, dann --manuell`);
      continue;
    }
    if (k.quelle === "manuell" || k.quelle === "geschwister") continue;
    if (!existsSync(impressumDatei(k.domain))) { ohneZwischenspeicher++; continue; }
    const p = await pruefen(z, { domain: k.domain, quelle: k.quelle, postfach: k.quelle === "register-mail" ? z.register_email : null }, belegungen);
    kandZeilen.push(kandidatZeile(z, p));
    jeBetreiber.set(z.mastr_nr, [...(jeBetreiber.get(z.mastr_nr) ?? []), p]);
  }
  await schreiben(c, "windbetreiber_kandidaten", kandZeilen, "mastr_nr,domain");
  const aenderungen: Record<string, unknown>[] = [];
  let zurueck = 0, neu = 0, umbenannt = 0;
  const widerspruch: string[] = [];
  for (const [nr, pr] of jeBetreiber) {
    const z = nachNr.get(nr)!;
    const best = besterBeleg(pr);
    // Decided by hand ("keine Website" or found by hand): reported, never changed.
    if (vonHandEntschieden(z)) { if (best && best.kandidat.domain !== z.website) widerspruch.push(`${z.mastr_nr} ${z.name}: ${best.kandidat.domain}`); continue; }
    if (best && best.kandidat.domain !== z.website) { neu++; // A contact belongs to the website it was found on; the next contact run fills it again.
      aenderungen.push({ mastr_nr: nr, ...websiteFelder(best, HEUTE), ...kontaktFelder(null, null), updated_at: new Date().toISOString() }); }
    // Same website, another kind of proof: the stored kind follows the rule
    // (the phone proof was first written as "register", 06.10.2026). The
    // contact stays — it belongs to the website, which did not change.
    else if (best && best.beleg!.wie !== z.website_beleg) { umbenannt++;
      aenderungen.push({ mastr_nr: nr, ...websiteFelder(best, HEUTE), updated_at: new Date().toISOString() }); }
    else if (!best && z.website && (pr.some((p) => p.kandidat.domain === z.website) || weg.has(`${nr}|${z.website}`))) {
      zurueck++;
      aenderungen.push({ mastr_nr: nr, ...websiteFelder(null, HEUTE), ...kontaktFelder(null, null), gesucht_am: null, suche_notiz: `nach Regeländerung nicht mehr belegt: ${z.website}`, updated_at: new Date().toISOString() });
    }
  }
  for (const z of zeilen) {
    if (!z.website || jeBetreiber.has(z.mastr_nr) || !weg.has(`${z.mastr_nr}|${z.website}`) || vonHandEntschieden(z)) continue;
    zurueck++;
    aenderungen.push({ mastr_nr: z.mastr_nr, ...websiteFelder(null, HEUTE), ...kontaktFelder(null, null), gesucht_am: null, suche_notiz: `Kandidat unter alter Domain-Regel entfernt: ${z.website}`, updated_at: new Date().toISOString() });
  }
  // A sibling's proof holds only while the sibling's does.
  const mitA = zeilen.map((z) => ({ ...z, anschrift: anschriftSchluessel(akteurVon(z)) }));
  const jeA = new Map<string, typeof mitA>();
  for (const z of mitA) if (z.anschrift) jeA.set(z.anschrift, [...(jeA.get(z.anschrift) ?? []), z]);
  for (const z of mitA) {
    if (z.website_beleg !== "geschwister" || aenderungen.some((x) => x.mastr_nr === z.mastr_nr)) continue;
    if (z.anschrift && geschwisterWebsite(z, jeA.get(z.anschrift) ?? []) === z.website) continue;
    zurueck++;
    aenderungen.push({ mastr_nr: z.mastr_nr, ...websiteFelder(null, HEUTE), ...kontaktFelder(null, null), gesucht_am: null, suche_notiz: `Schwesterbeleg entfallen: ${z.website}`, updated_at: new Date().toISOString() });
  }
  await aktualisieren(c, "windbetreiber", "mastr_nr", aenderungen);
  // A hand-taken website is judged too, on the page it was proven on —
  // reported, never changed. Without that page it cannot be judged, and says so.
  const ow = await ortsWoerter();
  let nichtNachpruefbar = 0;
  for (const z of zeilen) {
    if (!z.website || !vonHandEntschieden(z) || !["name", "anschrift", "marke"].includes(z.website_beleg ?? "")) continue;
    const seite = z.website_beleg_url ? belegseiteDatei(z.website_beleg_url) : null;
    let traegt: boolean;
    if (seite && existsSync(seite)) traegt = !!belegseiteTraegt(readFileSync(seite, "utf8"), akteurVon(z), z.name, z.website, ow, z.register_email, z.register_telefon);
    else if (existsSync(impressumDatei(z.website)) && dieselbeSeite(z.website_beleg_url, (JSON.parse(readFileSync(impressumDatei(z.website), "utf8")) as { impressum_url: string | null }).impressum_url)) {
      traegt = (await pruefen(z, { domain: z.website, quelle: "manuell" }, belegungen)).ergebnis === "belegt";
    } else { nichtNachpruefbar++; continue; }
    if (!traegt) widerspruch.push(`${z.mastr_nr} ${z.name}: ${z.website} trägt nach heutiger Regel nicht mehr (${z.website_beleg}, ${z.website_beleg_url ?? "Impressum"})`);
  }
  if (nichtNachpruefbar) console.log(`${nichtNachpruefbar} von Hand übernommene Websites ohne gespeicherte Belegseite — nicht nachprüfbar`);
  console.log(`${veraltet.length} veraltete Kandidaten entfernt`);
  if (widerspruch.length) {
    console.log(`${widerspruch.length} von Hand entschiedene Betreiber, bei denen die Maschine heute anders urteilen würde — NICHT geändert, bitte ansehen:`);
    for (const w of widerspruch) console.log(`  ? ${w}`);
  }
  if (wiederAuf.length) {
    console.log(`${wiederAuf.length} von Hand als „keine Website" vermerkte Betreiber, deren Handkandidat heute trägt — NICHT geändert:`);
    for (const w of wiederAuf) console.log(`  + ${w}`);
  }
  console.log(`${kandZeilen.length} Prüfungen neu bewertet · ${neu} Websites neu oder gewechselt · ${umbenannt} mit anderer Belegart · ${zurueck} zurückgenommen · ${ohneZwischenspeicher} ohne Zwischenspeicher übersprungen`);
}

// ─── Manual pass ──────────────────────────────────────────────────────────────

/** A person decided this operator: "keine Website" or a website found by hand. No machine run changes it. */
function vonHandEntschieden(z: { suche_notiz: string | null }): boolean {
  const n = z.suche_notiz ?? "";
  return n.startsWith(VON_HAND) || n.startsWith(VON_HAND_GEFUNDEN);
}

/** The mark of a "no website" a person confirmed — the stock is complete when
 *  every operator without a website carries it. */
const VON_HAND = "von Hand geprüft:";
const VON_HAND_GEFUNDEN = "von Hand gefunden";

async function manuell() {
  LESART = "nachholen";
  // Several operators at once: the project companies of one address are found
  // together, but each one still runs through its own check.
  const [nrs, url] = process.argv.slice(process.argv.indexOf("--manuell") + 1);
  const liste = (nrs ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!liste.length || liste.some((n) => !n.startsWith("ABR")) || !url) throw new Error("Aufruf: --manuell ABR…[,ABR…] <url> [--seite=<url>]");
  const c = await db();
  const domain = organisationsDomain(url);
  if (!domain) throw new Error(`${url} ist keine Adresse`);
  const { belegungen } = await ladeBelegungen(c, "windbetreiber");
  const seite = arg("seite");
  // A refusal, not a stack trace: a helper read the trace as a tool failure (block 046).
  // The proof page lies on the domain, or on the site the domain redirects to
  // (windpark.eu → windpark.com: the imprint is only there, block 059).
  // Where the domain's site really is: the start after redirects, and — for
  // fetches stored before the start was kept after redirects — where its
  // imprint was found (windpark.eu → windpark.com, block 069).
  const zieleVon = (d: string): (string | null)[] => {
    const f = impressumDatei(d);
    if (!existsSync(f)) return [];
    const imp = JSON.parse(readFileSync(f, "utf8")) as { start: string | null; impressum_url: string | null };
    return [imp.start, imp.impressum_url].map((u) => (u ? organisationsDomain(u) : null));
  };
  const seiteFremd = () => !!seite && organisationsDomain(seite) !== domain && !zieleVon(domain).includes(organisationsDomain(seite));
  let belegseite: string | null | undefined;
  for (const nr of liste) {
    const [z] = await alle<Zeile>(c, "windbetreiber", SPALTEN, "mastr_nr", (q) => q.eq("mastr_nr", nr));
    if (!z) { console.log(`${nr}: steht nicht im Bestand`); process.exitCode = 1; continue; }
    // A proven website is not replaced in passing: a batch over a manager's
    // domain overwrote an operator's own site found minutes before
    // (Österwurth, 06.10.2026). Replacing takes the explicit --ersetzen.
    if (z.website && z.website !== domain && !flag("ersetzen")) { console.log(`${nr}: hat schon ${z.website} — NICHT ersetzt (mit --ersetzen, wenn ${domain} die bessere ist)`); process.exitCode = 1; continue; }
    let p = await pruefen(z, { domain, quelle: "manuell" }, belegungen);
    // Judged after the first fetch: only then is the redirect target known.
    if (seiteFremd()) { console.log(`NICHT übernommen: Die Belegseite ${seite} liegt weder auf ${domain} noch auf der Website, auf die ${domain} weiterleitet — Belegseite muss auf derselben Website liegen`); process.exitCode = 1; return; }
    // The manual pass may name another page of the same site as evidence — an
    // "About us" page, a project page. The check itself stays the same.
    if (p.ergebnis !== "belegt" && p.ergebnis !== "konflikt" && seite) {
      if (belegseite === undefined) {
        const r = await fetchLive(seite);
        // An app shell answers 200 with no text (sab-windteam.de, 2.5 KB): render it.
        belegseite = "html" in r && sichtbarerText(r.html).length >= LEERE_HUELLE ? r.html : await seiteGerendert(seite);
      }
      const text = belegseite ? sichtbarerText(belegseite) : "";
      // Kept, so a later rule change can judge this proof again.
      if (text) { mkdirSync(dirname(belegseiteDatei(seite)), { recursive: true }); writeFileSync(belegseiteDatei(seite), text); }
      const beleg = text ? belegseiteTraegt(text, akteurVon(z), z.name, domain, await ortsWoerter(), z.register_email, z.register_telefon) : null;
      // A proof on a SUBDOMAIN is no proof for the domain: the Bürgerwindpark
      // on buergerwindpark.suederdeich.de was stored as suederdeich.de, the
      // municipality's site (manual pass 06.10.2026). A person confirms the
      // two are one organisation with --subdomain-ok.
      const seitenHost = new URL(seite).hostname.replace(/^www\./, "");
      if (beleg && seitenHost !== domain && !flag("subdomain-ok")) {
        console.log(`${nr}: Beleg steht auf ${seitenHost}, gespeichert würde ${domain} — NICHT übernommen (mit --subdomain-ok, wenn beide dieselbe Organisation sind)`);
        process.exitCode = 1; continue;
      }
      if (beleg) p = { ...p, ergebnis: "belegt", beleg, impressum: { ...p.impressum, impressum_url: seite }, grund: null };
      // Say what happened to the named page too; the imprint's reason alone left
      // open whether it was read at all (block 027, 06.10.2026).
      else p = { ...p, grund: `${p.grund ?? ""}; Belegseite ${text ? "gelesen, nennt weder vollen Namen, kennzeichnenden Namen ohne Parkliste, Anschrift noch Marke" : "nicht lesbar"}` };
    }
    // A failed second try on the website already proven keeps the proof: it
    // overwrote it, and the website stood there without one (Waabs, 06.10.2026).
    if (p.ergebnis !== "belegt" && z.website === domain) { console.log(`${nr}: ${domain} ist schon belegt — dieser Versuch (${p.ergebnis}) ändert nichts`); continue; }
    await schreiben(c, "windbetreiber_kandidaten", [kandidatZeile(z, p)], "mastr_nr,domain");
    if (p.ergebnis !== "belegt") {
      console.log(`${nr} NICHT übernommen: ${p.ergebnis} — ${p.grund ?? ""}`);
      process.exitCode = 1;
    } else {
      await aktualisieren(c, "windbetreiber", "mastr_nr", [{ mastr_nr: nr, ...websiteFelder(p, HEUTE), gesucht_am: HEUTE, suche_notiz: `${VON_HAND_GEFUNDEN}, ${p.beleg!.wie} belegt`, updated_at: new Date().toISOString() }]);
      console.log(`${nr} übernommen: ${z.name} → ${domain} (${p.beleg!.wie}: „${p.beleg!.textstelle.slice(0, 120)}")`);
    }
  }
  await browserSchliessen();
}

/**
 * Fetches once, for hand-taken websites proven on another page, the page the
 * proof stands on — taken before that page was kept (06.10.2026). Without it a
 * rule change cannot judge them again.
 */
async function belegseitenNachholen() {
  const c = await db();
  const zeilen = await alle<Zeile>(c, "windbetreiber", SPALTEN, "mastr_nr", (q) => q.eq("aktiv", true).not("website", "is", null));
  const urls = new Set<string>();
  for (const z of zeilen) {
    if (!vonHandEntschieden(z) || !z.website_beleg_url || existsSync(belegseiteDatei(z.website_beleg_url))) continue;
    const imp = existsSync(impressumDatei(z.website!)) ? (JSON.parse(readFileSync(impressumDatei(z.website!), "utf8")) as { impressum_url: string | null }).impressum_url : null;
    if (!dieselbeSeite(z.website_beleg_url, imp)) urls.add(z.website_beleg_url);
  }
  let ok = 0;
  for (const url of urls) {
    const r = await fetchLive(url);
    const html = "html" in r && sichtbarerText(r.html).length >= LEERE_HUELLE ? r.html : await seiteGerendert(url);
    const text = html ? sichtbarerText(html) : "";
    if (!text) { console.log(`  nicht lesbar: ${url}`); continue; }
    mkdirSync(dirname(belegseiteDatei(url)), { recursive: true });
    writeFileSync(belegseiteDatei(url), text);
    ok++;
  }
  await browserSchliessen();
  console.log(`${ok} von ${urls.size} Belegseiten gespeichert`);
}

/**
 * Address proofs on a site with no energy at all, for reading by hand: a
 * manager there is right (fund, bank, office, family farm), a neighbour in a
 * business park is not — and no rule tells the two apart (121 cases measured,
 * most of them managers; docs/lehren/kontakt-engine-fehler.md, class 57).
 */
async function anschriftGegenlesen() {
  const c = await db();
  const zeilen = await alle<Zeile>(c, "windbetreiber", SPALTEN, "mastr_nr", (q) => q.eq("aktiv", true).eq("website_beleg", "anschrift"));
  const liste: unknown[] = [];
  for (const z of zeilen) {
    if (!z.website || !existsSync(impressumDatei(z.website))) continue;
    const imp = JSON.parse(readFileSync(impressumDatei(z.website), "utf8")) as { text: string | null; startText?: string | null; impressum_url: string | null };
    if (ENERGIE.test(`${imp.text ?? ""} ${imp.startText ?? ""}`) || traegtDomainwort(z.name, z.website)) continue;
    liste.push({ mastr_nr: z.mastr_nr, name: z.name, website: z.website, anschrift: `${z.strasse ?? ""} ${z.hausnummer ?? ""}, ${z.plz ?? ""} ${z.ort ?? ""}`, impressum_url: imp.impressum_url, von_hand: vonHandEntschieden(z) });
  }
  const out = arg("out") ?? resolve(CACHE, "anschrift-gegenlesen.json");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(liste, null, 1));
  console.log(`${liste.length} Anschriftsbelege auf Seiten ohne Energiebezug zum Gegenlesen → ${out}`);
}

/** Brand proofs a person reads: one line per brand and domain, only where
 *  neither the register mailbox nor the register postcode backs the brand.
 *  "Elements" (an ordinary word) proved a Frankfurt group for a Bassum company
 *  (manual pass, 06.10.2026); a rule against ordinary words would need a
 *  dictionary, and 28 of 29 such brands were real groups. */
async function markeGegenlesen() {
  const c = await db();
  // Short names too: "Böhm Energie" and "Flugplatz Barssel" proved a namesake's
  // site by the full name (block 073, 06.10.2026). Two words or fewer.
  const art = flag("namen") ? "name" : "marke";
  const zeilen = (await alle<Zeile>(c, "windbetreiber", SPALTEN, "mastr_nr", (q) => q.eq("aktiv", true).eq("website_beleg", art)))
    .filter((z) => art === "marke" || nameWoerter(z.name).length <= 2);
  const gruppen = new Map<string, Zeile[]>();
  for (const z of zeilen) {
    if (!z.website) continue;
    const text = existsSync(impressumDatei(z.website)) ? (JSON.parse(readFileSync(impressumDatei(z.website), "utf8")) as { text: string | null }).text ?? "" : "";
    const postfach = maildomain(z.register_email ?? "");
    if ((postfach && (postfach === z.website || postfach.endsWith(`.${z.website}`))) || (z.plz && text.includes(z.plz))) continue;
    const k = `${marke(z.name) ?? "?"} → ${z.website}`;
    gruppen.set(k, [...(gruppen.get(k) ?? []), z]);
  }
  const liste = [...gruppen].map(([k, zs]) => ({ marke: k, anzahl: zs.length, beispiel: `${zs[0].name} (${zs[0].ort ?? ""})`, mastr_nr: zs.map((z) => z.mastr_nr) }));
  const out = arg("out") ?? resolve(CACHE, `${art}-gegenlesen.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(liste, null, 1));
  console.log(`${liste.length} ${art === "marke" ? "Marken" : "kurze Namen"} ohne Rückhalt in Postfach oder Postleitzahl zum Gegenlesen (${zeilen.length} Belege) → ${out}`);
}

/** Same page, whatever the scheme, "www.", trailing slash or fragment. */
function dieselbeSeite(a: string | null | undefined, b: string | null | undefined): boolean {
  const n = (u: string | null | undefined) => (u ?? "").replace(/^https?:\/\/(www\.)?/, "").replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();
  return !a || n(a) === n(b);
}

/** The text of a page a person named as evidence (--seite), kept for the re-judge. */
function belegseiteDatei(url: string): string {
  return resolve(CACHE, "belegseite", `${url.replace(/^https?:\/\//, "").replace(/[^a-z0-9.-]/gi, "_").slice(0, 180)}.txt`);
}

async function keine() {
  const [nrs, notiz] = process.argv.slice(process.argv.indexOf("--keine") + 1);
  const liste = (nrs ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!liste.length || liste.some((n) => !n.startsWith("ABR")) || !notiz || notiz.length < 40) throw new Error('Aufruf: --keine ABR…[,ABR…] "<was gesucht wurde: Anfragen, geprüfte Seiten — mindestens 40 Zeichen>"');
  const c = await db();
  const felder = { gesucht_am: HEUTE, suche_notiz: `${VON_HAND} ${notiz}`.slice(0, 900), updated_at: new Date().toISOString() };
  spalten("windbetreiber", [felder]);
  for (const nr of liste) {
    const { error, count } = await c.from("windbetreiber").update(felder, { count: "exact" })
      .eq("mastr_nr", nr).is("website", null);
    if (error) throw new Error(error.message);
    if (!count) {
      // Say which of the two it is: a helper read "not found" for an operator
      // that was already proven and did nothing (block 025, 06.10.2026).
      const { data } = await c.from("windbetreiber").select("website").eq("mastr_nr", nr).maybeSingle();
      console.log(data ? `${nr}: hat schon die belegte Website ${data.website} — nichts geändert` : `${nr}: steht nicht im Bestand`);
      process.exitCode = 1; continue;
    }
    console.log(`${nr}: als „keine Website" vermerkt`);
  }
}

/**
 * A person withdraws a website the check accepted but that is not the
 * operator's (a bank that holds the majority, a planning office): website and
 * contact go, the operator stands as a person's "no website" with the reason.
 * The candidate stays as evidence, marked rejected by hand, so no later run
 * proves it again.
 */
async function zuruecknehmen() {
  const [nrs, grund] = process.argv.slice(process.argv.indexOf("--zuruecknehmen") + 1);
  const liste = (nrs ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!liste.length || liste.some((n) => !n.startsWith("ABR")) || !grund || grund.length < 40) throw new Error('Aufruf: --zuruecknehmen ABR…[,ABR…] "<warum die Website nicht die des Betreibers ist — mindestens 40 Zeichen>"');
  const c = await db();
  for (const nr of liste) {
    const [z] = await alle<Zeile>(c, "windbetreiber", SPALTEN, "mastr_nr", (q) => q.eq("mastr_nr", nr));
    if (!z?.website) { console.log(`${nr}: hat keine Website`); process.exitCode = 1; continue; }
    const ablehnung = { ergebnis: "abgelehnt", grund: `von Hand zurückgenommen: ${grund}`.slice(0, 300), geprueft_am: HEUTE };
    spalten("windbetreiber_kandidaten", [ablehnung]);
    const { error } = await c.from("windbetreiber_kandidaten").update(ablehnung).eq("mastr_nr", nr).eq("domain", z.website);
    if (error) throw new Error(error.message);
    await aktualisieren(c, "windbetreiber", "mastr_nr", [{ mastr_nr: nr, ...websiteFelder(null, HEUTE), ...kontaktFelder(null, null), gesucht_am: HEUTE, suche_notiz: `${VON_HAND} ${z.website} zurückgenommen: ${grund}`.slice(0, 900), updated_at: new Date().toISOString() }]);
    console.log(`${nr}: ${z.website} zurückgenommen`);
  }
}

/** A proven website on which a person found no contact. Applies to every operator of that website. */
async function keinKontakt() {
  const [domain, notiz] = process.argv.slice(process.argv.indexOf("--kein-kontakt") + 1);
  if (!domain || domain.startsWith("--") || !notiz || notiz.length < 40) throw new Error('Aufruf: --kein-kontakt <domain> "<welche Seiten gelesen, was dort stand — mindestens 40 Zeichen>"');
  const c = await db();
  const felder = { kontakt_hand_notiz: `${VON_HAND} ${notiz}`.slice(0, 900), updated_at: new Date().toISOString() };
  spalten("windbetreiber", [felder]);
  const { error, count } = await c.from("windbetreiber").update(felder, { count: "exact" })
    .eq("website", domain).eq("aktiv", true).or("kontakt_email.is.null,kontakt_sperrgrund.not.is.null");
  if (error) throw new Error(error.message);
  if (!count) throw new Error(`${domain}: kein aktiver Betreiber mit dieser Website ohne (freigegebenen) Kontakt`);
  console.log(`${domain}: „kein Kontakt" für ${count} Betreiber vermerkt`);
}

/**
 * Operators that are utilities by NAME (Stadtwerke, Gemeindewerke, …) and
 * whose proven website the utility stock does not know: handed over there as
 * candidates its own checks judge (herkunft 'suche'), the same way the
 * installer stock handed over 74 utilities (06.10.2026). The utility stock
 * holds mostly grid companies; these are the parents and sales companies it
 * lacks. The wind entry stays — a utility that runs turbines is an operator,
 * and the two stocks may share a domain.
 */
const VERSORGER_NAME = /stadtwerk|gemeindewerk|kreiswerk|elektrizit(?:ä|ae)tswerk|energieversorgung|\be-werk|(?:ü|ue)berlandwerk|versorgungsbetrieb/i;

async function uebergeben() {
  const c = await db();
  const u = await alle<{ website: string | null }>(c, "utilities", "website", "id");
  const bekannt = new Set(u.map((x) => organisationsDomain(x.website)).filter(Boolean));
  const zeilen = await alle<Zeile>(c, "windbetreiber", SPALTEN, "mastr_nr", (q) => q.eq("aktiv", true).not("website", "is", null));
  const jeDomain = new Map<string, Zeile>();
  // A citizens' company of a utility ("GSW-Stadtwerke Straubing Bürgerenergie")
  // runs its own site, which is no utility's: only strong cases are handed over.
  for (const z of zeilen) if (z.website && VERSORGER_NAME.test(z.name) && !/b(?:ü|ue)rger/i.test(z.name) && !bekannt.has(z.website) && !jeDomain.has(z.website)) jeDomain.set(z.website, z);
  console.log(`${jeDomain.size} Versorger-Websites aus dem Windbestand fehlen im Versorger-Bestand`);
  for (const [d, z] of jeDomain) console.log(`  → ${d} (${z.name})`);
  if (!flag("schreiben")) { console.log("Nur gemessen — mit --schreiben übergeben."); return; }
  for (const [d, z] of jeDomain) {
    const { error } = await c.from("utilities").insert({
      name: z.name, typ: /stadtwerk|gemeindewerk|kreiswerk/i.test(z.name) ? "stadtwerk" : "regionalversorger",
      website: `https://${d}`, status: "offen", herkunft: "suche",
      notiz: `aus den Windparkbetreibern übernommen am ${HEUTE}: betreibt Windräder (${z.mastr_nr}), Website am Impressum belegt`,
    });
    if (error) throw new Error(`utilities ${d}: ${error.message}`);
  }
  console.log(`${jeDomain.size} als Kandidaten übergeben`);
}

// ─── Completeness ─────────────────────────────────────────────────────────────

async function stand() {
  const c = await db();
  type V = Zeile & { website_quelle: string | null; website_beleg_url: string | null; suche_notiz: string | null;
    kontakt_email: string | null; kontakt_beleg_url: string | null; kontakt_freigabe_am: string | null; kontakt_sperrgrund: string | null; kontakt_hand_notiz: string | null };
  const zeilen = await alle<V>(c, "windbetreiber", `${SPALTEN},website_quelle,website_beleg_url,kontakt_email,kontakt_beleg_url,kontakt_freigabe_am,kontakt_sperrgrund,kontakt_hand_notiz`, "mastr_nr", (q) => q.eq("aktiv", true));
  const kand = await alle<{ mastr_nr: string; domain: string; ergebnis: string }>(c, "windbetreiber_kandidaten", "mastr_nr,domain,ergebnis", "mastr_nr");
  const belegtePaare = new Set(kand.filter((k) => k.ergebnis === "belegt").map((k) => `${k.mastr_nr}|${k.domain}`));
  const { belegungen } = await ladeBelegungen(c, "windbetreiber");
  // Only the cached read: a report must never start a 20-minute register read.
  const st = registerPflicht();

  const zaehl: Record<Stand, { n: number; kw: number }> = { "website-belegt": { n: 0, kw: 0 }, "nur-register": { n: 0, kw: 0 }, "keine-website": { n: 0, kw: 0 }, offen: { n: 0, kw: 0 } };
  const verstoesse: string[] = [];
  let mitKontakt = 0, freigegeben = 0, gesperrt = 0, kwKontakt = 0;
  for (const z of zeilen) {
    const s = standVon({ website_beleg: z.website_beleg, register_email: z.register_email, register_telefon: z.register_telefon, gesucht_am: z.gesucht_am });
    const kw = st.kwJeBetreiber[z.mastr_nr] ?? 0;
    zaehl[s].n++; zaehl[s].kw += kw;
    if (z.website && !z.website_beleg) verstoesse.push(`${z.mastr_nr} ${z.name}: Website ohne Beleg`);
    if (z.website && !belegtePaare.has(`${z.mastr_nr}|${z.website}`)) verstoesse.push(`${z.mastr_nr} ${z.name}: ${z.website} ohne belegte Prüfung`);
    if (z.website) {
      const u = abgleichen(z.website, "windbetreiber", belegungen, { herkunft: websiteHerkunft(z.website_quelle, z.website_beleg) });
      if (u.art === "entscheiden") verstoesse.push(`${z.mastr_nr} ${z.name}: ${z.website} steht in einem anderen Bestand`);
    }
    if (!z.website && z.gesucht_am && !(z.suche_notiz ?? "").trim()) verstoesse.push(`${z.mastr_nr} ${z.name}: „keine Website" ohne Notiz, was gesucht wurde`);
    const kv = kontaktVerstoss(z);
    if (kv) verstoesse.push(`${z.mastr_nr} ${z.name}: ${kv}`);
    if (z.kontakt_email) { mitKontakt++; kwKontakt += kw; }
    if (z.kontakt_freigabe_am) freigegeben++;
    if (z.kontakt_sperrgrund && !z.kontakt_sperrgrund.startsWith(ERSTER_FEHLVERSUCH)) gesperrt++;
  }
  const mw = (kw: number) => `${Math.round(kw / 1000).toLocaleString("de-DE")} MW`;
  const anteil = (kw: number, g: number) => (g ? `${((kw / g) * 100).toFixed(1)} %` : "–");
  const gesamtKw = Object.values(zaehl).reduce((s, x) => s + x.kw, 0);
  console.log(`Registerstand ${st.export}`);
  console.log(`Windparkbetreiber (Organisationen mit Windrad in Betrieb): ${zeilen.length.toLocaleString("de-DE")} · ${mw(gesamtKw)}`);
  for (const [k, v] of Object.entries(zaehl)) console.log(`  ${k.padEnd(15)} ${String(v.n).padStart(6)}  ${mw(v.kw).padStart(10)}  (${anteil(v.kw, gesamtKw)} der Leistung)`);
  console.log(`  natürliche Personen (nicht erfassbar, nur gezählt): ${st.natuerlich.betreiber} · ${mw(st.natuerlich.kw)}`);
  const ohne = zeilen.filter((z) => !z.website);
  const vonHand = ohne.filter((z) => (z.suche_notiz ?? "").startsWith(VON_HAND)).length;
  const handOffen = ohne.length - vonHand;
  console.log(`  ohne Website: ${ohne.length}, davon von Hand bestätigt ${vonHand}, noch für die Handprüfung ${handOffen}`);
  console.log(`  Kontakt von der eigenen Website: ${mitKontakt} (${anteil(kwKontakt, gesamtKw)} der Leistung) · freigegeben ${freigegeben} · gesperrt ${gesperrt}`);
  // Per website, not per operator: one search answers for all its operators.
  // A blocked contact (no mail server, gone from its page) is no contact.
  const gesperrt_ = (g: string | null) => !!g && !g.startsWith(ERSTER_FEHLVERSUCH);
  const ohneKontakt = new Set(zeilen.filter((z) => z.website && (!z.kontakt_email || gesperrt_(z.kontakt_sperrgrund))).map((z) => z.website!));
  const kontaktVonHand = new Set(zeilen.filter((z) => z.website && ohneKontakt.has(z.website) && (z.kontakt_hand_notiz ?? "").startsWith(VON_HAND)).map((z) => z.website!));
  const kontaktOffen = [...ohneKontakt].filter((d) => !kontaktVonHand.has(d)).length;
  console.log(`  Websites ohne Kontakt: ${ohneKontakt.size}, davon von Hand bestätigt ${kontaktVonHand.size}, noch für die Handprüfung ${kontaktOffen}`);
  console.log(`Verstöße: ${verstoesse.length}`);
  for (const v of verstoesse.slice(0, 30)) console.log(`  ✗ ${v}`);
  // The one line that answers "done?": nothing open AND nothing wrong.
  console.log(handOffen === 0 && kontaktOffen === 0 && verstoesse.length === 0 ? "VOLLSTÄNDIG" : `NICHT VOLLSTÄNDIG — ${handOffen} Betreiber ohne Website offen, ${kontaktOffen} Websites ohne Kontakt offen, ${verstoesse.length} Verstöße`);
  if (verstoesse.length) process.exitCode = 1;
}

/**
 * A contact counts only from the operator's OWN proven website — its proof page
 * lies on that site. A register mailbox has no page; one from a former website
 * would outlive the website it came from.
 */
function kontaktVerstoss(z: { website: string | null; kontakt_email: string | null; kontakt_beleg_url: string | null; kontakt_freigabe_am: string | null }): string | null {
  if (!z.kontakt_email && !z.kontakt_freigabe_am) return null;
  if (z.kontakt_freigabe_am && !z.kontakt_email) return "Freigabe ohne Kontakt";
  if (!z.website) return "Kontakt ohne belegte Website";
  if (!z.kontakt_beleg_url) return "Kontakt ohne Fundstelle";
  const h = organisationsDomain(z.kontakt_beleg_url);
  // The same website under another address (redirect target, imprint domain) counts.
  if (h !== z.website && !weitereSitesVon(z.website).includes(siteOf(h ?? ""))) return `Kontakt-Fundstelle ${h ?? z.kontakt_beleg_url} liegt nicht auf ${z.website}`;
  return null;
}

async function offenListe() {
  const c = await db();
  const zeilen = (await alle<Zeile>(c, "windbetreiber", SPALTEN, "mastr_nr", (q) => q.eq("aktiv", true).is("website", null)))
    // What a person already confirmed is done; the list is what is left.
    .filter((z) => !(z.suche_notiz ?? "").startsWith(VON_HAND));
  const st = registerPflicht();
  const kand = await alle<{ mastr_nr: string; domain: string; ergebnis: string; grund: string | null }>(c, "windbetreiber_kandidaten", "mastr_nr,domain,ergebnis,grund", "mastr_nr", (q) => q.neq("ergebnis", "belegt"));
  const jeNr = new Map<string, string[]>();
  for (const k of kand) jeNr.set(k.mastr_nr, [...(jeNr.get(k.mastr_nr) ?? []), `${k.domain} (${k.ergebnis})`]);
  // Grouped by register address: project companies of one parent sit there
  // together and are searched together (--manuell ABR1,ABR2 <url>).
  const gruppen = new Map<string, Zeile[]>();
  for (const z of zeilen) { const k = anschriftSchluessel(akteurVon(z)) ?? `nr:${z.mastr_nr}`; gruppen.set(k, [...(gruppen.get(k) ?? []), z]); }
  const mw = (z: Zeile) => Math.round((st.kwJeBetreiber[z.mastr_nr] ?? 0) / 100) / 10;
  const liste = [...gruppen.values()].map((g) => ({
    anschrift: `${g[0].strasse ?? ""} ${g[0].hausnummer ?? ""}, ${g[0].plz ?? ""} ${g[0].ort ?? ""}`.trim(),
    mw: Math.round(g.reduce((s, z) => s + mw(z), 0) * 10) / 10,
    betreiber: g.sort((a, b) => mw(b) - mw(a)).map((z) => ({ mastr_nr: z.mastr_nr, name: z.name, mw: mw(z), register_webseite: z.register_webseite, register_email: z.register_email, register_telefon: z.register_telefon, gepruefteKandidaten: jeNr.get(z.mastr_nr) ?? [], bisher: z.suche_notiz })),
  })).sort((a, b) => b.mw - a.mw);
  const out = arg("out") ?? resolve(CACHE, "offen.json");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ stand: new Date().toISOString(), betreiber: zeilen.length, anschriften: liste.length, liste }, null, 1));
  console.log(`${zeilen.length} Betreiber ohne belegte Website an ${liste.length} Anschriften → ${out}`);
}

// ─── Preflight ────────────────────────────────────────────────────────────────

/** Every step of an unattended run, for the paid-search check. */
const ABLAUF_DATEIEN = ["scripts/nacht-windbetreiber.sh", "scripts/windbetreiber-refresh.ts", "scripts/windbetreiber-kontakte.ts", "scripts/kontakte-freigabe.ts", "scripts/bestaende-abgleich.ts", "scripts/lib/kontakt-lauf.ts"];

/** Everything a run of this stock has failed on before, asked before it starts. */
async function vorflugLauf() {
  env();
  const wurzel = resolve(SCRIPT_DIR, "..");
  console.log(`Vorflug Windparkbetreiber · ${HEUTE} · Checkout ${wurzel === MAIN ? "Haupt-Checkout" : wurzel.split("/").pop()}`);
  const checks: Check[] = [
    lastCheck(),
    platzCheck(MAIN),
    zugangCheck([["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"], ["SUPABASE_SERVICE_KEY"]]),
    abhaengigkeitenCheck(wurzel),
    paralleleLaeufeCheck(/windbetreiber-(?:refresh|kontakte)\.ts|kontakte-freigabe\.ts --bestand=windbetreiber|nacht-windbetreiber/),
    keineBezahlteSucheCheck(ABLAUF_DATEIEN.map((d) => resolve(wurzel, d))),
    { name: "Datenbank erreichbar", pruefen: async () => {
      const r = await (await db()).from("windbetreiber").select("mastr_nr", { count: "exact", head: true });
      return { ok: !r.error, detail: r.error ? r.error.message : `${r.count} Zeilen` };
    } },
    ...["windbetreiber", "windbetreiber_kandidaten"].map((t): Check => ({ name: `Spalten von ${t} angelegt`, pruefen: async () => {
      const fehlt = await fehlendeSpalten(await db(), t, spaltenAusDdl(WINDBETREIBER_SQL, t));
      return { ok: !fehlt.length, detail: fehlt.length ? `fehlt: ${fehlt.join(", ")} — erst --setup` : "alle da" };
    } })),
    // The night run reads the register right after the preflight; there the
    // check would block the very step that brings the register up to date.
    ...(flag("vor-register") ? [] : [{ name: "Registerstand gelesen und geschrieben", pruefen: async () => {
      const st = registerCache();
      if (!st) return { ok: false, detail: "kein Registerstand — erst --register" };
      const { data, error } = await (await db()).from("windbetreiber").select("register_stand").eq("aktiv", true).order("register_stand", { ascending: false }).limit(1);
      if (error) return { ok: false, detail: error.message };
      const tag = registerTag(st.export);
      return { ok: data?.[0]?.register_stand === tag, detail: `gelesen ${st.export}, in der Datenbank ${data?.[0]?.register_stand ?? "nichts"}` };
    } } satisfies Check]),
    { name: "Keine offenen Entscheidungen zwischen Beständen", pruefen: async () => {
      // A candidate in conflict with another stock waits for a person
      // (bestaende-abgleich --entscheiden); until then the operator stays open.
      const k = await alle<{ mastr_nr: string; domain: string }>(await db(), "windbetreiber_kandidaten", "mastr_nr,domain", "mastr_nr", (q) => q.eq("ergebnis", "konflikt"));
      const domains = [...new Set(k.map((x) => x.domain))];
      return { ok: !domains.length, detail: domains.length ? `${domains.length} Domains (${domains.slice(0, 4).join(", ")}) — npm run bestaende:abgleich` : "keine" };
    } },
  ];
  if (!(await vorflug(checks))) process.exitCode = 1;
}

async function main() {
  if (flag("vorflug")) return vorflugLauf();
  if (flag("setup")) return setup();
  if (flag("register")) return register();
  if (flag("neu-bewerten")) return neuBewerten();
  if (flag("impressum")) return impressumLauf();
  if (flag("geschwister")) return geschwisterLauf();
  if (flag("suche")) {
    // The paid bulk search is gone, not switched off (decisions 28.09. and
    // 06.10.2026; it ran twice anyway while it was only switched off). Websites
    // the register does not name are searched in the manual pass by Claude.
    throw new Error("Es gibt keine Maschinen-Suche mehr — offene Betreiber sucht die Handprüfung (--offen, dann --manuell/--keine).");
  }
  if (flag("stand")) return stand();
  if (flag("offen")) return offenListe();
  if (flag("belegseiten-nachholen")) return belegseitenNachholen();
  if (flag("anschrift-gegenlesen")) return anschriftGegenlesen();
  if (flag("marke-gegenlesen")) return markeGegenlesen();
  if (flag("manuell")) return manuell();
  if (flag("keine")) return keine();
  if (flag("kein-kontakt")) return keinKontakt();
  if (flag("zuruecknehmen")) return zuruecknehmen();
  if (flag("uebergeben")) return uebergeben();
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 15).join("\n"));
}

main().catch(async (e) => { console.error(e); await browserSchliessen().catch(() => {}); process.exit(1); });
