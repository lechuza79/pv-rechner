/**
 * Wind farm operators in Germany — from the register to a proven website.
 *
 *   npx tsx scripts/windbetreiber-refresh.ts --setup
 *   npx tsx scripts/windbetreiber-refresh.ts --register [--neu-lesen]   operators from the export
 *   npx tsx scripts/windbetreiber-refresh.ts --impressum [--limit=N]   check register-given websites
 *   npx tsx scripts/windbetreiber-refresh.ts --suche [--limit=N]       search the rest, then check
 *   npx tsx scripts/windbetreiber-refresh.ts --stand                    completeness; exit 1 on a violation
 *   npx tsx scripts/windbetreiber-refresh.ts --offen [--out=datei]      the list for the manual pass
 *   npx tsx scripts/windbetreiber-refresh.ts --manuell ABR… <url> [--seite=<url>]
 *   npx tsx scripts/windbetreiber-refresh.ts --keine ABR… "<what was tried>"
 *
 * The rules are in lib/windbetreiber.ts (when a website counts) and
 * lib/bestand-abgleich.ts (when a domain belongs to another stock). This script
 * only fetches, writes and reports. A website found by hand runs through the
 * SAME check as one found by the machine: the manual pass may point at a
 * different page as evidence, it may not skip the evidence.
 *
 * Nothing is sent.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { abgleichen, organisationsDomain, type Belegungen } from "../lib/bestand-abgleich";
import { impressumUrl, sichtbarerText } from "../lib/fachbetrieb-extrakt";
import {
  PERSONENART_NATUERLICH, PERSONENART_ORGANISATION, STATUS_IN_BETRIEB,
  anschriftSchluessel, besterBeleg, beurteilen, impressumBelegt, marke, ortsWoerterAus, registerKandidaten, standVon, suchanfrage, trefferRelevant, websiteHerkunft, zitatName,
  type Akteur, type Beleg, type Kandidat, type Stand,
} from "../lib/windbetreiber";
import { MASTR_WIND_SQL } from "../lib/mastr-wind-sql";
import { WINDBETREIBER_SQL } from "../lib/windbetreiber-sql";
import { heuteInBerlin } from "../lib/zeit";
import { ladeBelegungen } from "./lib/bestand-belegung";
import { browserSchliessen, seiteGerendert } from "./lib/kontakt-browser";
import { fetchLive } from "./lib/kontakt-lauf";
import { serp } from "./lib/serp";
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

/** Update existing rows one by one. An upsert would have to carry every NOT NULL
 *  column of a row it only wants to amend. */
async function aktualisieren(c: Db, tabelle: string, schluessel: string, zeilen: Record<string, unknown>[]) {
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

function registerCache(): Registerstand | null {
  try {
    const name = findCachedZip().split("/").pop()!.replace(/\.zip$/, "");
    const datei = resolve(CACHE, `register-${name}.json`);
    return existsSync(datei) ? JSON.parse(readFileSync(datei, "utf8")) : null;
  } catch { return null; }
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

type Impressum = { domain: string; abgerufen_am: string; start: string | null; impressum_url: string | null; text: string | null; startText?: string | null; fehler: string | null; via: "abruf" | "browser" | null };

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

/** Fetch a domain's imprint once; later runs read the cached text. */
async function impressumHolen(domain: string, mitBrowser = true): Promise<Impressum> {
  const datei = resolve(CACHE, "impressum", `${domain.replace(/[^a-z0-9.-]/g, "_")}.json`);
  if (existsSync(datei)) return JSON.parse(readFileSync(datei, "utf8"));
  const ergebnis: Impressum = { domain, abgerufen_am: new Date().toISOString(), start: null, impressum_url: null, text: null, fehler: null, via: null };
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
  website: string | null; website_beleg: string | null; gesucht_am: string | null; aktiv: boolean;
};
const SPALTEN = "mastr_nr,name,strasse,hausnummer,plz,ort,register_webseite,register_email,register_telefon,website,website_beleg,gesucht_am,aktiv";
const akteurVon = (z: Zeile): Akteur => ({ Firmenname: z.name, Strasse: z.strasse ?? "", Hausnummer: z.hausnummer ?? "", Postleitzahl: z.plz ?? "", Ort: z.ort ?? "" });


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
  const u = beurteilen(akteurVon(z), k.domain, k.quelle, { impressum: imp.text, startseite: imp.startText ?? null }, k.postfach, await ortsWoerter());
  if (u.ergebnis !== "belegt") {
    const grund = u.ergebnis === "abgelehnt" ? "Impressum nennt weder Name noch Registeranschrift noch Marke"
      : u.ergebnis === "geparkt" ? "Domain steht zum Verkauf oder ist geparkt" : imp.fehler;
    return { kandidat: k, ergebnis: u.ergebnis, beleg: null, impressum: imp, grund };
  }
  // The other stocks are asked AFTER the proof: how official the link is
  // depends on how it was proven, not only on where the candidate came from.
  // juwi.de is a developer proven by the register address; that the installer
  // stock holds it too makes the installer entry wrong, not this one.
  const a = abgleichen(k.domain, "windbetreiber", belegungen, { herkunft: websiteHerkunft(k.quelle, u.beleg!.wie) });
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


function websiteFelder(p: Pruefung | null) {
  return {
    website: p ? p.kandidat.domain : null,
    website_quelle: p?.kandidat.quelle ?? null,
    website_beleg: p?.beleg?.wie ?? null,
    website_beleg_url: p?.impressum.impressum_url ?? null,
    website_textstelle: p?.beleg?.textstelle.slice(0, 400) ?? null,
    website_geprueft_am: p ? HEUTE : null,
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

  const offen = zeilen.filter((z) => !z.website && !z.gesucht_am).map((z) => ({ z, kandidaten: registerKandidaten(z, nachAnschrift) })).filter((x) => x.kandidaten.length);
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
    if (best) betrZeilen.push({ mastr_nr: z.mastr_nr, ...websiteFelder(best), updated_at: new Date().toISOString() });
  }
  await schreiben(c, "windbetreiber_kandidaten", kandZeilen, "mastr_nr,domain");
  if (betrZeilen.length) await aktualisieren(c, "windbetreiber", "mastr_nr", betrZeilen);
  console.log(`Prüfungen: ${JSON.stringify(zahl)} · Website belegt für ${betrZeilen.length} Betreiber`);
  await browserSchliessen();
}

// ─── Search ───────────────────────────────────────────────────────────────────

async function sucheLauf() {
  const c = await db();
  const zeilen = await alle<Zeile>(c, "windbetreiber", SPALTEN, "mastr_nr", (q) => q.eq("aktiv", true));
  const st = registerCache();
  if (!st) throw new Error("Kein Registerstand im Zwischenspeicher — erst --register laufen lassen");
  const { belegungen } = await ladeBelegungen(c, "windbetreiber");
  const nachAnschrift = new Map<string, Zeile[]>();
  for (const z of zeilen) { const k = anschriftSchluessel(akteurVon(z)) ?? `nr:${z.mastr_nr}`; nachAnschrift.set(k, [...(nachAnschrift.get(k) ?? []), z]); }

  // Operators with a proven website are done; mark them so the stock is complete.
  const belegtOhneDatum = zeilen.filter((z) => z.website && !z.gesucht_am);
  for (let i = 0; i < belegtOhneDatum.length; i += 500) {
    const { error } = await c.from("windbetreiber").update({ gesucht_am: HEUTE, suche_notiz: "Website aus dem Register belegt" })
      .in("mastr_nr", belegtOhneDatum.slice(i, i + 500).map((z) => z.mastr_nr)).is("gesucht_am", null);
    if (error) throw new Error(error.message);
  }

  // Only operators whose register candidates have ALL been checked: a search
  // for one the register would have answered is money for nothing.
  const geprueft = new Set((await alle<{ mastr_nr: string; domain: string }>(c, "windbetreiber_kandidaten", "mastr_nr,domain", "mastr_nr")).map((k) => `${k.mastr_nr}|${k.domain}`));
  const regAnschrift = new Map<string, Zeile[]>();
  for (const z of zeilen) { const k = anschriftSchluessel(akteurVon(z)); if (k) regAnschrift.set(k, [...(regAnschrift.get(k) ?? []), z]); }
  const bereit = (z: Zeile) => registerKandidaten(z, regAnschrift).every((k) => geprueft.has(`${z.mastr_nr}|${k.domain}`));
  const nichtBereit = zeilen.filter((z) => !z.website && !z.gesucht_am && !bereit(z)).length;
  if (nichtBereit) console.log(`${nichtBereit} Betreiber übersprungen: Registerangaben noch nicht geprüft (erst --impressum)`);

  // One search per address: project companies of one parent share it.
  const gruppen = [...nachAnschrift.values()]
    .map((g) => g.filter((z) => !z.website && !z.gesucht_am && bereit(z)))
    .filter((g) => g.length)
    .sort((a, b) => b.reduce((s, z) => s + (st.kwJeBetreiber[z.mastr_nr] ?? 0), 0) - a.reduce((s, z) => s + (st.kwJeBetreiber[z.mastr_nr] ?? 0), 0))
    .slice(0, LIMIT);
  console.log(`${gruppen.length} Anschriften zu suchen (${gruppen.reduce((s, g) => s + g.length, 0)} Betreiber), größte Leistung zuerst`);

  // A domain rejected for five different operators and proven for none is a
  // directory — learned from the checks, not kept as a list.
  const urteile = await alle<{ domain: string; mastr_nr: string; ergebnis: string }>(c, "windbetreiber_kandidaten", "domain,mastr_nr,ergebnis", "domain");
  const jeDomain = new Map<string, { ab: Set<string>; belegt: boolean }>();
  for (const u of urteile) {
    const x = jeDomain.get(u.domain) ?? { ab: new Set<string>(), belegt: false };
    if (u.ergebnis === "belegt") x.belegt = true; else if (u.ergebnis === "abgelehnt") x.ab.add(u.mastr_nr);
    jeDomain.set(u.domain, x);
  }
  const verzeichnis = new Set([...jeDomain].filter(([, x]) => !x.belegt && x.ab.size >= 5).map(([d]) => d));
  console.log(`${verzeichnis.size} Domains als Verzeichnis erkannt (bei mindestens fünf Betreibern abgelehnt, nie bestätigt)`);

  let kosten = 0, belegt = 0, n = 0;
  // Four addresses at a time: one at a time took ~30 s per address, which is
  // 13 hours for the whole stock. Every address fetches different hosts.
  await parallel(gruppen, 4, async (g) => {
    // The member most likely to have its own page: one with a brand, then the largest.
    const rep = [...g].sort((a, b) => Number(!!marke(b.name)) - Number(!!marke(a.name)) || (st.kwJeBetreiber[b.mastr_nr] ?? 0) - (st.kwJeBetreiber[a.mastr_nr] ?? 0))[0];
    const anfragen = [suchanfrage(akteurVon(rep)), `"${zitatName(rep.name)}"`];
    const notiz: string[] = [];
    let suchfehler = false;
    const gefunden = new Map<string, Pruefung>();
    for (const a of anfragen) {
      const r = await serp(a);
      kosten += r.kosten;
      if (r.fehler) suchfehler = true;
      const relevant = r.treffer.filter((t) => g.some((z) => trefferRelevant(t, z.name)));
      const domains = [...new Set(relevant.map((t) => organisationsDomain(t.url)).filter((d): d is string => !!d))]
        .filter((d) => !verzeichnis.has(d)).slice(0, 6);
      notiz.push(`„${a}": ${r.fehler ? `Fehler ${r.fehler}` : `${r.treffer.length} Treffer, ${domains.length} passende Domains`}`);
      for (const z of g) {
        for (const d of domains) {
          if (gefunden.has(`${z.mastr_nr}|${d}`)) continue;
          gefunden.set(`${z.mastr_nr}|${d}`, await pruefen(z, { domain: d, quelle: "suche" }, belegungen));
        }
      }
      if ([...gefunden.values()].some((p) => p.ergebnis === "belegt")) break;
    }
    const kandZeilen = g.flatMap((z) => [...gefunden.entries()].filter(([k]) => k.startsWith(`${z.mastr_nr}|`)).map(([, p]) => kandidatZeile(z, p)));
    if (kandZeilen.length) await schreiben(c, "windbetreiber_kandidaten", kandZeilen, "mastr_nr,domain");
    for (const z of g) {
      const best = besterBeleg([...gefunden.entries()].filter(([k]) => k.startsWith(`${z.mastr_nr}|`)).map(([, p]) => p));
      if (best) belegt++;
      const abgelehnt = [...gefunden.entries()].filter(([k, p]) => k.startsWith(`${z.mastr_nr}|`) && p.ergebnis !== "belegt").map(([, p]) => p.kandidat.domain);
      // A failed search is "could not look", not "nothing there": the address
      // comes back next run unless something was proven anyway.
      if (!best && suchfehler) continue;
      const { error } = await c.from("windbetreiber").update({
        ...websiteFelder(best), gesucht_am: HEUTE,
        suche_notiz: `${notiz.join(" · ")}${abgelehnt.length ? ` · abgelehnt: ${abgelehnt.slice(0, 12).join(", ")}` : ""}`.slice(0, 900),
        updated_at: new Date().toISOString(),
      }).eq("mastr_nr", z.mastr_nr);
      if (error) throw new Error(error.message);
    }
    if (++n % 25 === 0) console.log(`  ${n}/${gruppen.length} Anschriften · ${belegt} belegt · ${kosten.toFixed(2)} $`);
  });
  console.log(`Suche fertig: ${n} Anschriften · ${belegt} Betreiber mit belegter Website · ${kosten.toFixed(2)} $`);
  await browserSchliessen();
}

// ─── Manual pass ──────────────────────────────────────────────────────────────

async function manuell() {
  const [nr, url] = process.argv.slice(process.argv.indexOf("--manuell") + 1);
  if (!nr?.startsWith("ABR") || !url) throw new Error("Aufruf: --manuell ABR… <url> [--seite=<url>]");
  const c = await db();
  const [z] = await alle<Zeile>(c, "windbetreiber", SPALTEN, "mastr_nr", (q) => q.eq("mastr_nr", nr));
  if (!z) throw new Error(`${nr} steht nicht im Bestand`);
  const domain = organisationsDomain(url);
  if (!domain) throw new Error(`${url} ist keine Adresse`);
  const { belegungen } = await ladeBelegungen(c, "windbetreiber");
  let p = await pruefen(z, { domain, quelle: "manuell" }, belegungen);
  // The manual pass may name another page of the same site as evidence — an
  // "About us" page, a project page. The check itself stays the same.
  const seite = arg("seite");
  if (p.ergebnis !== "belegt" && p.ergebnis !== "konflikt" && seite) {
    if (organisationsDomain(seite) !== domain) throw new Error("Die Belegseite muss auf derselben Website liegen");
    const r = await fetchLive(seite);
    const html = "html" in r ? r.html : await seiteGerendert(seite);
    const beleg = html ? impressumBelegt(sichtbarerText(html), akteurVon(z), domain) : null;
    if (beleg) p = { ...p, ergebnis: "belegt", beleg, impressum: { ...p.impressum, impressum_url: seite }, grund: null };
  }
  await schreiben(c, "windbetreiber_kandidaten", [kandidatZeile(z, p)], "mastr_nr,domain");
  if (p.ergebnis !== "belegt") {
    console.log(`NICHT übernommen: ${p.ergebnis} — ${p.grund ?? ""}`);
    process.exitCode = 1;
  } else {
    const { error } = await c.from("windbetreiber").update({ ...websiteFelder(p), gesucht_am: HEUTE, suche_notiz: `von Hand gefunden, ${p.beleg!.wie} belegt`, updated_at: new Date().toISOString() }).eq("mastr_nr", nr);
    if (error) throw new Error(error.message);
    console.log(`übernommen: ${z.name} → ${domain} (${p.beleg!.wie}: „${p.beleg!.textstelle.slice(0, 120)}")`);
  }
  await browserSchliessen();
}

async function keine() {
  const [nr, notiz] = process.argv.slice(process.argv.indexOf("--keine") + 1);
  if (!nr?.startsWith("ABR") || !notiz || notiz.length < 20) throw new Error('Aufruf: --keine ABR… "<was gesucht wurde, mindestens ein Satz>"');
  const c = await db();
  const { error, count } = await c.from("windbetreiber").update({ gesucht_am: HEUTE, suche_notiz: `von Hand geprüft: ${notiz}`.slice(0, 900), updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("mastr_nr", nr).is("website", null);
  if (error) throw new Error(error.message);
  if (!count) throw new Error(`${nr} nicht gefunden oder hat schon eine belegte Website`);
  console.log(`${nr}: als „keine Website" vermerkt`);
}

// ─── Completeness ─────────────────────────────────────────────────────────────

async function stand() {
  const c = await db();
  type V = Zeile & { website_quelle: string | null; website_beleg_url: string | null; suche_notiz: string | null };
  const zeilen = await alle<V>(c, "windbetreiber", `${SPALTEN},website_quelle,website_beleg_url,suche_notiz`, "mastr_nr", (q) => q.eq("aktiv", true));
  const kand = await alle<{ mastr_nr: string; domain: string; ergebnis: string }>(c, "windbetreiber_kandidaten", "mastr_nr,domain,ergebnis", "mastr_nr");
  const belegtePaare = new Set(kand.filter((k) => k.ergebnis === "belegt").map((k) => `${k.mastr_nr}|${k.domain}`));
  const { belegungen } = await ladeBelegungen(c, "windbetreiber");
  // Only the cached read: a report must never start a 20-minute register run.
  const st = registerCache();

  const zaehl: Record<Stand, { n: number; kw: number }> = { "website-belegt": { n: 0, kw: 0 }, "nur-register": { n: 0, kw: 0 }, "keine-website": { n: 0, kw: 0 }, offen: { n: 0, kw: 0 } };
  const verstoesse: string[] = [];
  for (const z of zeilen) {
    const s = standVon({ website_beleg: z.website_beleg, register_email: z.register_email, register_telefon: z.register_telefon, gesucht_am: z.gesucht_am });
    zaehl[s].n++; zaehl[s].kw += st?.kwJeBetreiber[z.mastr_nr] ?? 0;
    if (z.website && !z.website_beleg) verstoesse.push(`${z.mastr_nr} ${z.name}: Website ohne Beleg`);
    if (z.website && !belegtePaare.has(`${z.mastr_nr}|${z.website}`)) verstoesse.push(`${z.mastr_nr} ${z.name}: ${z.website} ohne belegte Prüfung`);
    if (z.website) {
      const u = abgleichen(z.website, "windbetreiber", belegungen, { herkunft: websiteHerkunft(z.website_quelle, z.website_beleg) });
      if (u.art === "entscheiden") verstoesse.push(`${z.mastr_nr} ${z.name}: ${z.website} steht in einem anderen Bestand`);
    }
    if (!z.website && z.gesucht_am && !(z.suche_notiz ?? "").trim()) verstoesse.push(`${z.mastr_nr} ${z.name}: „keine Website" ohne Notiz, was gesucht wurde`);
  }
  const mw = (kw: number) => `${Math.round(kw / 1000).toLocaleString("de-DE")} MW`;
  const gesamtKw = Object.values(zaehl).reduce((s, x) => s + x.kw, 0);
  console.log(`Windparkbetreiber (Organisationen mit Windrad in Betrieb): ${zeilen.length.toLocaleString("de-DE")} · ${mw(gesamtKw)}`);
  for (const [k, v] of Object.entries(zaehl)) console.log(`  ${k.padEnd(15)} ${String(v.n).padStart(6)}  ${mw(v.kw).padStart(10)}  (${gesamtKw ? ((v.kw / gesamtKw) * 100).toFixed(1) : "–"} % der Leistung)`);
  if (st) console.log(`  natürliche Personen (nicht erfassbar): ${st.natuerlich.betreiber} · ${mw(st.natuerlich.kw)}`);
  console.log(`Verstöße: ${verstoesse.length}`);
  for (const v of verstoesse.slice(0, 30)) console.log(`  ✗ ${v}`);
  if (verstoesse.length) process.exitCode = 1;
}

async function offenListe() {
  const c = await db();
  type V = Zeile & { suche_notiz: string | null; register_telefon: string | null };
  const zeilen = await alle<V>(c, "windbetreiber", `${SPALTEN},suche_notiz`, "mastr_nr", (q) => q.eq("aktiv", true).is("website", null));
  const st = registerCache();
  if (!st) throw new Error("Kein Registerstand im Zwischenspeicher — erst --register laufen lassen");
  const liste = zeilen
    .map((z) => ({ mastr_nr: z.mastr_nr, name: z.name, anschrift: `${z.strasse ?? ""} ${z.hausnummer ?? ""}, ${z.plz ?? ""} ${z.ort ?? ""}`.trim(), mw: Math.round((st.kwJeBetreiber[z.mastr_nr] ?? 0) / 100) / 10, register_email: z.register_email, register_telefon: z.register_telefon, bisher: z.suche_notiz }))
    .sort((a, b) => b.mw - a.mw);
  const out = arg("out") ?? resolve(CACHE, "offen.json");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ stand: new Date().toISOString(), anzahl: liste.length, liste }, null, 1));
  console.log(`${liste.length} Betreiber ohne belegte Website → ${out}`);
}

async function main() {
  if (flag("setup")) return setup();
  if (flag("register")) return register();
  if (flag("impressum")) return impressumLauf();
  if (flag("suche")) return sucheLauf();
  if (flag("stand")) return stand();
  if (flag("offen")) return offenListe();
  if (flag("manuell")) return manuell();
  if (flag("keine")) return keine();
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 14).join("\n"));
}

main().catch(async (e) => { console.error(e); await browserSchliessen().catch(() => {}); process.exit(1); });
