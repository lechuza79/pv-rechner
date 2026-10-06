/**
 * Wind farm operators in Germany — from the register to a proven website.
 *
 *   npx tsx scripts/windbetreiber-refresh.ts --vorflug [--vor-register]  BEREIT / NICHT BEREIT before any run
 *   npx tsx scripts/windbetreiber-refresh.ts --setup
 *   npx tsx scripts/windbetreiber-refresh.ts --register [--neu-lesen]   operators from the export
 *   npx tsx scripts/windbetreiber-refresh.ts --neu-bewerten             re-judge every stored check under today's rules
 *   npx tsx scripts/windbetreiber-refresh.ts --impressum [--limit=N]   check register-given websites
 *   npx tsx scripts/windbetreiber-refresh.ts --stand                    completeness; exit 1 on a violation
 *   npx tsx scripts/windbetreiber-refresh.ts --offen [--out=datei]      the list for the manual pass
 *   npx tsx scripts/windbetreiber-refresh.ts --manuell ABR…[,ABR…] <url> [--seite=<url>]
 *   npx tsx scripts/windbetreiber-refresh.ts --keine ABR…[,ABR…] "<what was tried>"
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
  anschriftSchluessel, besterBeleg, beurteilen, impressumBelegt, abrufWiederholen, identifizierend, kontaktFelder, ortsWoerterAus, registerKandidaten, standVon, websiteFelder, websiteHerkunft,
  type Akteur, type Beleg, type Kandidat, type Kandidatenquelle, type Stand,
} from "../lib/windbetreiber";
import { MASTR_WIND_SQL } from "../lib/mastr-wind-sql";
import { WINDBETREIBER_SQL } from "../lib/windbetreiber-sql";
import { nurBekannteSpalten, spaltenAusDdl } from "../lib/ddl-spalten";
import { heuteInBerlin } from "../lib/zeit";
import { ladeBelegungen, ladeEntscheidungen } from "./lib/bestand-belegung";
import { browserSchliessen, seiteGerendert } from "./lib/kontakt-browser";
import { abhaengigkeitenCheck, keineBezahlteSucheCheck, lastCheck, paralleleLaeufeCheck, vorflug, zugangCheck, type Check } from "./lib/vorflug";
import { fehlendeSpalten } from "../lib/ddl-spalten";
import { fetchLive } from "./lib/kontakt-lauf";
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
  for (const s of starts) {
    const r = await fetchLive(s);
    if ("html" in r && r.html.length > 200) { html = r.html; ergebnis.start = s; ergebnis.via = "abruf"; break; }
    ergebnis.fehler = "error" in r ? r.error : "leere Seite";
  }
  if (!html && mitBrowser) {
    // Pages built by script, or a bot wall that a real browser passes.
    for (const s of starts.slice(0, 2)) {
      const g = await seiteGerendert(s);
      if (g && g.length > 200) { html = g; ergebnis.start = s; ergebnis.via = "browser"; ergebnis.fehler = null; break; }
    }
  }
  if (html && ergebnis.start) {
    ergebnis.startText = sichtbarerText(html).slice(0, 20000);
    const url = impressumUrl(html, ergebnis.start) ?? rechtsseiteUrl(html, ergebnis.start);
    const versuche = url ? [url] : ["impressum", "impressum/", "imprint", "impressum.html"].map((p) => new URL(p, ergebnis.start!).toString());
    for (const u of versuche) {
      let seite: string | null = null;
      const r = await fetchLive(u);
      if ("html" in r) seite = r.html;
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
  website: string | null; website_beleg: string | null; gesucht_am: string | null; aktiv: boolean; suche_notiz: string | null;
};
const SPALTEN = "mastr_nr,name,strasse,hausnummer,plz,ort,register_webseite,register_email,register_telefon,website,website_beleg,gesucht_am,aktiv,suche_notiz";
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
  const u = beurteilen(akteurVon(z), k.domain, k.quelle, { impressum: imp.text, startseite: imp.startText ?? null, impressumUrl: imp.impressum_url }, k.postfach, await ortsWoerter());
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
  // by an earlier machine run is no answer (the paid search set gesucht_am
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
  const veraltet = kand.filter((k) => k.quelle !== "manuell" && k.quelle !== "suche" && nachNr.has(k.mastr_nr) && !heutige.get(k.mastr_nr)!.has(k.domain));
  for (const k of veraltet) {
    const { error } = await c.from("windbetreiber_kandidaten").delete().eq("mastr_nr", k.mastr_nr).eq("domain", k.domain);
    if (error) throw new Error(error.message);
  }
  const weg = new Set(veraltet.map((k) => `${k.mastr_nr}|${k.domain}`));
  const jeBetreiber = new Map<string, Pruefung[]>();
  const kandZeilen: ReturnType<typeof kandidatZeile>[] = [];
  let ohneZwischenspeicher = 0;
  for (const k of kand) {
    const z = nachNr.get(k.mastr_nr);
    if (!z || weg.has(`${k.mastr_nr}|${k.domain}`)) continue;
    if (!existsSync(impressumDatei(k.domain))) { ohneZwischenspeicher++; continue; }
    const p = await pruefen(z, { domain: k.domain, quelle: k.quelle, postfach: k.quelle === "register-mail" ? z.register_email : null }, belegungen);
    kandZeilen.push(kandidatZeile(z, p));
    jeBetreiber.set(z.mastr_nr, [...(jeBetreiber.get(z.mastr_nr) ?? []), p]);
  }
  await schreiben(c, "windbetreiber_kandidaten", kandZeilen, "mastr_nr,domain");
  const aenderungen: Record<string, unknown>[] = [];
  let zurueck = 0, neu = 0;
  for (const [nr, pr] of jeBetreiber) {
    const z = nachNr.get(nr)!;
    const best = besterBeleg(pr);
    if (best && best.kandidat.domain !== z.website) { neu++; // A contact belongs to the website it was found on; the next contact run fills it again.
      aenderungen.push({ mastr_nr: nr, ...websiteFelder(best, HEUTE), ...kontaktFelder(null, null), updated_at: new Date().toISOString() }); }
    else if (!best && z.website && (pr.some((p) => p.kandidat.domain === z.website) || weg.has(`${nr}|${z.website}`))) {
      zurueck++;
      aenderungen.push({ mastr_nr: nr, ...websiteFelder(null, HEUTE), ...kontaktFelder(null, null), gesucht_am: null, suche_notiz: `nach Regeländerung nicht mehr belegt: ${z.website}`, updated_at: new Date().toISOString() });
    }
  }
  for (const z of zeilen) {
    if (!z.website || jeBetreiber.has(z.mastr_nr) || !weg.has(`${z.mastr_nr}|${z.website}`)) continue;
    zurueck++;
    aenderungen.push({ mastr_nr: z.mastr_nr, ...websiteFelder(null, HEUTE), ...kontaktFelder(null, null), gesucht_am: null, suche_notiz: `Kandidat unter alter Domain-Regel entfernt: ${z.website}`, updated_at: new Date().toISOString() });
  }
  await aktualisieren(c, "windbetreiber", "mastr_nr", aenderungen);
  console.log(`${veraltet.length} veraltete Kandidaten entfernt`);
  console.log(`${kandZeilen.length} Prüfungen neu bewertet · ${neu} Websites neu oder gewechselt · ${zurueck} zurückgenommen · ${ohneZwischenspeicher} ohne Zwischenspeicher übersprungen`);
}

// ─── Manual pass ──────────────────────────────────────────────────────────────

/** The mark of a "no website" a person confirmed — the stock is complete when
 *  every operator without a website carries it. */
const VON_HAND = "von Hand geprüft:";

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
  if (seite && organisationsDomain(seite) !== domain) throw new Error("Die Belegseite muss auf derselben Website liegen");
  let belegseite: string | null | undefined;
  for (const nr of liste) {
    const [z] = await alle<Zeile>(c, "windbetreiber", SPALTEN, "mastr_nr", (q) => q.eq("mastr_nr", nr));
    if (!z) { console.log(`${nr}: steht nicht im Bestand`); process.exitCode = 1; continue; }
    let p = await pruefen(z, { domain, quelle: "manuell" }, belegungen);
    // The manual pass may name another page of the same site as evidence — an
    // "About us" page, a project page. The check itself stays the same.
    if (p.ergebnis !== "belegt" && p.ergebnis !== "konflikt" && seite) {
      if (belegseite === undefined) {
        const r = await fetchLive(seite);
        belegseite = "html" in r ? r.html : await seiteGerendert(seite);
      }
      const beleg = belegseite ? impressumBelegt(sichtbarerText(belegseite), akteurVon(z), domain, await ortsWoerter()) : null;
      if (beleg && (beleg.wie !== "name" || identifizierend(z.name, await ortsWoerter()))) p = { ...p, ergebnis: "belegt", beleg, impressum: { ...p.impressum, impressum_url: seite }, grund: null };
    }
    await schreiben(c, "windbetreiber_kandidaten", [kandidatZeile(z, p)], "mastr_nr,domain");
    if (p.ergebnis !== "belegt") {
      console.log(`${nr} NICHT übernommen: ${p.ergebnis} — ${p.grund ?? ""}`);
      process.exitCode = 1;
    } else {
      await aktualisieren(c, "windbetreiber", "mastr_nr", [{ mastr_nr: nr, ...websiteFelder(p, HEUTE), gesucht_am: HEUTE, suche_notiz: `von Hand gefunden, ${p.beleg!.wie} belegt`, updated_at: new Date().toISOString() }]);
      console.log(`${nr} übernommen: ${z.name} → ${domain} (${p.beleg!.wie}: „${p.beleg!.textstelle.slice(0, 120)}")`);
    }
  }
  await browserSchliessen();
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
    if (!count) { console.log(`${nr}: nicht gefunden oder hat schon eine belegte Website`); process.exitCode = 1; continue; }
    console.log(`${nr}: als „keine Website" vermerkt`);
  }
}

// ─── Completeness ─────────────────────────────────────────────────────────────

async function stand() {
  const c = await db();
  type V = Zeile & { website_quelle: string | null; website_beleg_url: string | null; suche_notiz: string | null;
    kontakt_email: string | null; kontakt_beleg_url: string | null; kontakt_freigabe_am: string | null; kontakt_sperrgrund: string | null };
  const zeilen = await alle<V>(c, "windbetreiber", `${SPALTEN},website_quelle,website_beleg_url,suche_notiz,kontakt_email,kontakt_beleg_url,kontakt_freigabe_am,kontakt_sperrgrund`, "mastr_nr", (q) => q.eq("aktiv", true));
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
    if (z.kontakt_sperrgrund) gesperrt++;
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
  console.log(`Verstöße: ${verstoesse.length}`);
  for (const v of verstoesse.slice(0, 30)) console.log(`  ✗ ${v}`);
  // The one line that answers "done?": nothing open AND nothing wrong.
  console.log(handOffen === 0 && verstoesse.length === 0 ? "VOLLSTÄNDIG" : `NICHT VOLLSTÄNDIG — ${handOffen} offen, ${verstoesse.length} Verstöße`);
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
  if (h !== z.website) return `Kontakt-Fundstelle ${h ?? z.kontakt_beleg_url} liegt nicht auf ${z.website}`;
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
  if (flag("suche")) {
    // The paid bulk search is gone, not switched off (decisions 28.09. and
    // 06.10.2026; it ran twice anyway while it was only switched off). Websites
    // the register does not name are searched in the manual pass by Claude.
    throw new Error("Es gibt keine Maschinen-Suche mehr — offene Betreiber sucht die Handprüfung (--offen, dann --manuell/--keine).");
  }
  if (flag("stand")) return stand();
  if (flag("offen")) return offenListe();
  if (flag("manuell")) return manuell();
  if (flag("keine")) return keine();
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 15).join("\n"));
}

main().catch(async (e) => { console.error(e); await browserSchliessen().catch(() => {}); process.exit(1); });
