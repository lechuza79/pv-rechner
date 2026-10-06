/**
 * Contacts of the wind farm operators — on the same run as municipalities,
 * utilities and press (scripts/lib/kontakt-lauf.ts). Docs: docs/erhebung/kontakte-neuer-bestand.md.
 *
 * One entry per PROVEN WEBSITE, not per operator: 208 Alterric project
 * companies are reached through one site, and searching it 208 times would be
 * 208 times the same answer. The result is written to every operator whose
 * proven website it is.
 *
 * Two kinds of contact count: a press/communication mailbox with its role on
 * the page, and the general mailbox of the imprint (every commercial site must
 * name one, § 5 DDG). A mailbox that only stands in the register goes in as
 * baseline: the engine confirms it on the site or it stays a register datum.
 *
 *   --mode=evaluate   offline over pages already fetched
 *   --mode=research   bounded fetches per website (default budget 10)
 *   --mode=summary    numbers over the results of websites still proven
 *   --mode=stichprobe 20 contacts and 10 gaps, random, to read by hand before reporting
 *   --mode=apply      write the contacts to the operators (--schreiben)
 *   --mode=spur       --ids=<domain> --url=<page>: a page a person found, researched at once
 *
 * Common: --ids=domain,domain | --part=i --parts=n
 *
 * Nothing is sent.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { organisationsDomain } from "../lib/bestand-abgleich";
import type { Rollenwerk, ScopeRegeln } from "../lib/kontakt-suche";
import { PRESS_TEXT } from "../lib/contact-municipal-judge";
import { postfachTauglich } from "../lib/kontakt-tauglichkeit";
import { kontaktFelder, maildomain } from "../lib/windbetreiber";
import { WINDBETREIBER_SQL } from "../lib/windbetreiber-sql";
import { nurBekannteSpalten, spaltenAusDdl } from "../lib/ddl-spalten";
import { bewerten, laufen, readJson, recherchieren, sha, writeJson, type Bestand, type Eintrag, type Ergebnis, type Seite } from "./lib/kontakt-lauf";
import { MAIN_CHECKOUT, extractionVersion, rulesVersion } from "./lib/contact-v2-config";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const OUT = resolve(arg("out") ?? resolve(MAIN_CHECKOUT, "scripts/.cache/windbetreiber-kontakte"));
const mode = arg("mode") ?? "evaluate";
const BUDGET = Number(arg("budget") ?? 10);
const schreiben = process.argv.includes("--schreiben");

function env(key: string): string | undefined {
  const pfad = resolve(MAIN_CHECKOUT, ".env.local");
  if (existsSync(pfad)) {
    for (const zeile of readFileSync(pfad, "utf8").split("\n")) {
      const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return process.env[key];
}

const PRESS_HEAD = /^(?:(?:ihr(?:e)? )?(?:kontakt|ansprechpartner\S*)[: ]+(?:für (?:die )?)?)?(?:presse\S*|pressekontakt|pressestelle|presse und medien|medienkontakt|unternehmenskommunikation|kommunikation|öffentlichkeitsarbeit|newsroom|media)$/iu;

/**
 * Who answers for an operator. Excluded is what stands on the same pages and
 * serves someone else: land acquisition talks to landowners, the service desk
 * to turbine technicians, careers to applicants.
 */
export const WIND_ROLLENWERK: Rollenwerk = {
  rollen: [{ kanal: "presse", text: PRESS_TEXT, heading: PRESS_HEAD }],
  eigenerTitel: /pressesprecher\w*|leit(?:ung|er\w*) (?:der )?(?:unternehmens)?kommunikation|kommunikationsleit\w*|referent\w* (?:für )?(?:presse|kommunikation)|head of communications?/iu,
  ausgeschlossen: /datenschutzbeauftrag|technische umsetzung|webdesign|agentur für|rechtsanwalt|streitschlichtung|verbraucherschlichtung|beschwerde|hinweisgeber|whistleblow/iu,
  fremdeEinheit: /fl(?:ä|ae)chen(?:akquise|sicherung|management)|grundst(?:ü|ue)cks?eigent(?:ü|ue)mer|landeigent(?:ü|ue)mer|akquise|karriere|bewerb|ausbildung|einkauf|lieferant|st(?:ö|oe)rung|leitwarte|service-?hotline|technische betriebsf(?:ü|ue)hrung|investor relations|anleger/iu,
  allgemein: /^(info|kontakt|mail|office|zentrale|post|hallo|hello|service|windpark|wind|energie|verwaltung|buero|büro|anfrage|marktstammdatenregister)$/i,
  starkesPostfach: /presse|kommunikation|medien|media|newsroom|\bpr\b/i,
  // The imprint's mailbox is the operator's general contact, whatever its name.
  allgemeinAuf: (pfad: string) => /impressum|imprint|legal-notice|anbieterkennzeichnung/i.test(pfad),
};

const WIND_SCOPE: ScopeRegeln = {
  // A developer's site lists partner municipalities and their mailboxes.
  fremdeBehoerde: /kreis|landratsamt|stadtverwaltung|gemeinde|verbandsgemeinde|amt-/,
  // Turbine makers and service firms named on a project page are not the operator.
  eigenbetrieb: /enercon|vestas|nordex|siemens|gamesa|ge-?renewable/,
  namensvarianten: /wind|energie|energy|gruppe|group|projekt|projects?|park|regenerativ/,
  // A Bürgerwindpark often runs on a free-mail box — published in its own imprint it is its own.
  gratisPostfachAuf: (pfad: string) => /impressum|imprint/i.test(pfad),
};

type Zeile = { mastr_nr: string; name: string; website: string; website_beleg_url: string | null; register_email: string | null; kontakt_email: string | null; kontakt_beleg_url: string | null };

async function db() {
  const url = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function betreiber(): Promise<Zeile[]> {
  const c = await db();
  const out: Zeile[] = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await c.from("windbetreiber").select("mastr_nr, name, website, website_beleg_url, register_email, kontakt_email, kontakt_beleg_url")
      .eq("aktiv", true).not("website", "is", null).order("mastr_nr").range(von, von + 999);
    if (error) throw new Error(error.message);
    out.push(...(data as Zeile[]));
    if (!data || data.length < 1000) return out;
  }
}

/**
 * The imprint text the website check stored, as a page the engine can read.
 * Only text: what a reader saw, re-read before any release (kontakte-freigabe).
 */
function impressumAlsSeite(domain: string): Seite[] {
  const datei = resolve(MAIN_CHECKOUT, "scripts/.cache/windbetreiber/impressum", `${domain.replace(/[^a-z0-9.-]/g, "_")}.json`);
  if (!existsSync(datei)) return [];
  const imp = readJson(datei) as { impressum_url: string | null; text: string | null };
  if (!imp.text || !imp.impressum_url || organisationsDomain(imp.impressum_url) !== domain) return [];
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Impressum</title></head><body><main>${imp.text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</main></body></html>`;
  const digest = sha(html);
  const pfad = resolve(OUT, "gespeichert", domain, `${digest}.html`);
  if (!existsSync(pfad)) { mkdirSync(dirname(pfad), { recursive: true }); writeFileSync(pfad, html); }
  // Its own address (a fragment of the imprint's): stored under the imprint's
  // URL it stood in for the live page, which was then never fetched — and the
  // text has lost what only the HTML carries ("E-Mail schreiben" links,
  // encoded addresses; mlk-wind.de, wbg-energie.de, 06.10.2026).
  return [{ url: `${imp.impressum_url.replace(/#.*$/, "")}#text-der-website-pruefung`, digest, path: pfad, kind: "html", valid: true, origin: "stored" }];
}

/**
 * Pages a person found that carry the contact (manual pass, `--mode=spur`).
 * They are leads, not results: the engine reads and judges them like any page.
 */
const SPUREN = () => resolve(OUT, "hand-spuren.json");
let spurenCache: Record<string, string[]> | null = null;
function handSpuren(): Record<string, string[]> {
  return (spurenCache ??= existsSync(SPUREN()) ? readJson(SPUREN()) : {});
}

function bestandAus(zeilen: Zeile[]): { bestand: Bestand; eintraege: Map<string, Eintrag> } {
  const jeWebsite = new Map<string, Zeile[]>();
  for (const z of zeilen) jeWebsite.set(z.website, [...(jeWebsite.get(z.website) ?? []), z]);
  const eintraege = new Map<string, Eintrag>();
  for (const [domain, gruppe] of jeWebsite) {
    // Only register mailboxes on this very domain: a project company's mailbox
    // at its manager says nothing about the developer's site.
    const baseline = [...new Set(gruppe.flatMap((z) => [z.register_email, z.kontakt_email]).filter((m): m is string => !!m && maildomain(m) === domain))];
    // The page that proved the website — usually the imprint, the one page
    // every commercial site must carry with a mailbox. It is a lead for the
    // research, and its text as the website check read it (in a real browser
    // where the site is built by script) is a stored page.
    const belegUrls = [...new Set(gruppe.map((z) => z.website_beleg_url).filter((u): u is string => !!u && organisationsDomain(u) === domain))];
    eintraege.set(domain, {
      id: domain,
      // The shortest name is usually the parent itself ("Alterric GmbH"), not a project company.
      name: [...gruppe].sort((a, b) => a.name.length - b.name.length)[0].name,
      website: `https://${domain}/`,
      baseline, verbund: null, gespeicherteSeiten: impressumAlsSeite(domain), eingabe: [...baseline, ...belegUrls, ...(handSpuren()[domain] ?? [])],
      offeneLinks: [...belegUrls.map((url) => ({ url, priority: 950 })), ...(handSpuren()[domain] ?? []).map((url) => ({ url, priority: 990 }))],
      zusatz: { betreiber: gruppe.length },
    });
  }
  const bestand: Bestand = {
    name: "windbetreiber-kontakte", out: OUT, rules: rulesVersion(), extraction: extractionVersion(),
    rollenwerk: WIND_ROLLENWERK, scope: WIND_SCOPE, linkProfil: "versorger",
    eintraege: () => [...eintraege.values()],
    // Done when there is a press contact — the general imprint mailbox comes for free on the way.
    fertigWenn: (r: Ergebnis) => (r.kanaele.presse?.length ?? 0) > 0,
    // The imprint first: it carries the obligatory mailbox; then press pages.
    linkVorrang: (url: string, grundwert: number) =>
      /impressum|imprint/i.test(url) ? 950
      : /presse|newsroom|medien|media/i.test(url) ? 900
      : /kontakt|contact/i.test(url) ? Math.max(grundwert, 400)
      : grundwert,
  };
  return { bestand, eintraege };
}

function ergebnisse(): Ergebnis[] {
  const dir = resolve(OUT, "results");
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => readJson(resolve(dir, f)) as Ergebnis) : [];
}

/** Press first, else the general mailbox with its page — never a mailbox without a page. */
export function kontaktAus(r: Ergebnis): { email: string; kanal: "presse" | "allgemein"; url: string } | null {
  const presse = (r.kanaele.presse ?? []).filter((m) => postfachTauglich(m).ok);
  for (const m of presse) {
    const beleg = r.proofs.find((p) => p.email === m);
    if (beleg) return { email: m, kanal: "presse", url: beleg.url };
  }
  for (const m of r.general.filter((m) => postfachTauglich(m).ok)) {
    const url = r.fundstellen?.[m];
    if (url) return { email: m, kanal: "allgemein", url };
  }
  return null;
}

function summary(bestand: Bestand, anzahl: number, aktuell: Set<string>) {
  // Only websites that are still proven: a result of a withdrawn website would
  // count a contact nobody can use (975 results for 971 websites, 06.10.2026).
  const rows = ergebnisse().filter((r) => aktuell.has(r.id));
  const kontakte = rows.map(kontaktAus);
  const out = {
    observedAt: new Date().toISOString(), rules: bestand.rules, websites: anzahl, bewertet: rows.length,
    mitPresse: kontakte.filter((k) => k?.kanal === "presse").length,
    nurAllgemein: kontakte.filter((k) => k?.kanal === "allgemein").length,
    ohneKontakt: kontakte.filter((k) => !k).length,
    seitenGelesen: rows.reduce((n, r) => n + r.pages.read, 0),
  };
  writeJson(resolve(OUT, "summary.json"), out);
  console.log(JSON.stringify(out, null, 1));
}

/**
 * The sample to READ before any number is reported: 20 contacts, 10 websites
 * without one, each with the page to open. Random, not the first rows: the
 * first rows are the big developers, where the engine works best.
 */
function stichprobe(aktuell: Set<string>) {
  const rows = ergebnisse().filter((r) => aktuell.has(r.id));
  const misch = <T,>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((p, q) => p[0] - q[0]).map(([, x]) => x);
  const mit = misch(rows.filter((r) => kontaktAus(r))).slice(0, 20);
  const ohne = misch(rows.filter((r) => !kontaktAus(r))).slice(0, 10);
  console.log("── 20 Kontakte: steht die Adresse auf der Seite, und gehört sie dem Betreiber?");
  for (const r of mit) { const k = kontaktAus(r)!; console.log(`${r.id} · ${k.kanal} · ${k.email} · ${k.url}`); }
  console.log("── 10 ohne Kontakt: wo steht die Adresse wirklich?");
  for (const r of ohne) console.log(`${r.id} · ${r.outcome} · ${r.pages.read} Seiten gelesen · allgemein: ${r.general.join(", ") || "–"} · offen: ${r.openLinks.slice(0, 3).map((l) => l.url).join(" ")}`);
}

async function apply() {
  const c = await db();
  const ddl = spaltenAusDdl(WINDBETREIBER_SQL, "windbetreiber");
  let mit = 0, ohne = 0, geschrieben = 0;
  // A result judged under older rules says what the old rules thought. Writing
  // it would bring back exactly what the rule change was meant to remove.
  // What is already written: an unchanged contact keeps its release, and the
  // release (a fresh re-read of every proof page) is not run again for nothing.
  // Only websites still proven: a withdrawn website's result is history.
  const jetzt = new Map((await betreiber()).map((z) => [z.website, z]));
  const alle = ergebnisse().filter((r) => jetzt.has(r.id));
  const veraltet = alle.filter((r) => r.rules !== rulesVersion());
  if (veraltet.length) throw new Error(`${veraltet.length} Ergebnisse unter alten Regeln (z. B. ${veraltet[0].id}) — erst --mode=evaluate`);
  const unbewertet = [...jetzt.keys()].filter((d) => !alle.some((r) => r.id === d));
  if (unbewertet.length) console.log(`Hinweis: ${unbewertet.length} belegte Websites ohne Ergebnis (z. B. ${unbewertet[0]}) — erst --mode=research/evaluate`);
  let unveraendert = 0;
  for (const r of alle) {
    const k = kontaktAus(r);
    if (k) mit++; else ohne++;
    const z = jetzt.get(r.id);
    if (z && (z.kontakt_email ?? null) === (k?.email ?? null) && (z.kontakt_beleg_url ?? null) === (k?.url ?? null)) { unveraendert++; continue; }
    // Written either way: a website whose evaluation finds no contact on the
    // site any more must not keep the old one (06.10.2026, fault class
    // "contact outlives its source", docs/lehren/kontakt-engine-fehler.md).
    const felder = kontaktFelder(k, r.evaluatedAt.slice(0, 10));
    nurBekannteSpalten("windbetreiber", ddl, [felder]);
    if (!schreiben) continue;
    const { error, count } = await c.from("windbetreiber").update(felder, { count: "exact" }).eq("website", r.id).eq("aktiv", true);
    if (error) throw new Error(`${r.id}: ${error.message}`);
    geschrieben += count ?? 0;
  }
  console.log(JSON.stringify({ schreiben, websitesMitKontakt: mit, websitesOhneKontakt: ohne, unveraendert, betreiberGeschrieben: geschrieben }));
}

async function main() {
  if (mode === "apply") return apply();
  if (mode === "spur") {
    // A page a person found: recorded as a lead, then researched at once with the same engine.
    const [domain] = arg("ids")?.split(",") ?? [];
    const url = arg("url");
    if (!domain || !url || organisationsDomain(url) !== domain) throw new Error("Aufruf: --mode=spur --ids=<domain> --url=<Seite derselben Website>");
    const spuren = handSpuren();
    spuren[domain] = [...new Set([...(spuren[domain] ?? []), url])];
    writeJson(SPUREN(), spuren);
    const { bestand, eintraege } = bestandAus(await betreiber());
    const e = eintraege.get(domain);
    if (!e) throw new Error(`${domain} ist keine belegte Website eines aktiven Betreibers`);
    const r = await recherchieren(bestand, e, BUDGET, { vonHand: true });
    const k = kontaktAus(bewerten(bestand, e));
    console.log(JSON.stringify(r), k ? `→ Kontakt: ${k.email} (${k.kanal}) auf ${k.url}` : "→ kein Kontakt belegt");
    return;
  }
  const { bestand, eintraege } = bestandAus(await betreiber());
  if (mode === "summary") return summary(bestand, eintraege.size, new Set(eintraege.keys()));
  if (mode === "stichprobe") return stichprobe(new Set(eintraege.keys()));
  let rows = [...eintraege.values()];
  const ids = arg("ids")?.split(",");
  if (ids) { const wanted = new Set(ids); rows = rows.filter((r) => wanted.has(r.id)); }
  const parts = Number(arg("parts") ?? 1), part = Number(arg("part") ?? 0);
  rows = rows.filter((_, i) => i % parts === part);
  console.log(`${rows.length} Websites · Modus ${mode}`);
  await laufen(bestand, rows, async (e) => {
    const r = mode === "research" ? await recherchieren(bestand, e, BUDGET) : bewerten(bestand, e);
    console.log(e.id, JSON.stringify(mode === "research" ? r : { outcome: (r as Ergebnis).outcome }));
  }, `${mode}-${part}`);
}

if (process.argv[1]?.endsWith("windbetreiber-kontakte.ts")) main().catch((error) => { console.error(error); process.exit(1); });
