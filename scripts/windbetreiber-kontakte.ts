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
import { GRATIS_POSTFACH, fold, siteOf, type Evidence, type Rollenwerk, type ScopeRegeln } from "../lib/kontakt-suche";
import { ohneAdressVerschleierung } from "../lib/presse-extrakt";
import { webKomponentenAusklappen } from "../lib/web-komponenten";
import { PRESS_TEXT } from "../lib/contact-municipal-judge";
import { postfachTauglich } from "../lib/kontakt-tauglichkeit";
import { impressumHerkunft, kontaktFelder, maildomain, verwandteDomain } from "../lib/windbetreiber";
import { WINDBETREIBER_SQL } from "../lib/windbetreiber-sql";
import { nurBekannteSpalten, spaltenAusDdl } from "../lib/ddl-spalten";
import { bewerten, laufen, readJson, recherchieren, sha, writeJson, type Bestand, type Eintrag, type Ergebnis, type Seite } from "./lib/kontakt-lauf";
import { MAIN_CHECKOUT, extractionVersion, rulesVersion } from "./lib/contact-v2-config";
import { browserSchliessen, seiteGerendert } from "./lib/kontakt-browser";
import { fileURLToPath } from "node:url";

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
  // English and French names of foreign groups (contact@, communication@ — manual pass, 06.10.2026).
  // Customer service and a city office's info box are general too (cs@, kundenservice@,
  // info.berlin@ — manual pass 06.10.2026); a person's name never is.
  allgemein: /^(info|kontakt|contact|contacts|mail|office|zentrale|post|hallo|hello|service|windpark|wind|energie|verwaltung|buero|büro|anfrage|marktstammdatenregister|communication|communications|dialog|team|cs|kundenservice|kundenbetreuung|customer-?service|customercare|info[._-][a-z]+)$/i,
  starkesPostfach: /presse|kommunikation|medien|media|newsroom|\bpr\b/i,
};

/**
 * The imprint's mailbox is the operator's general contact, whatever its name
 * (§ 5 DDG): "socialmedia@", a Bürgerwindpark's free-mail box, "contact@" on
 * "mentions légales". And a conflict on ANOTHER page (a Wix placeholder on the
 * contact page, a typo variant, a label linking elsewhere) must not cancel the
 * clean entry in the imprint — one hard reason anywhere used to block the
 * mailbox on every page (14 + 8 websites in the manual pass, 06.10.2026).
 * Kept here, not in the shared engine: its files are hashed into the
 * municipal rule version (docs/lehren/kontakt-engine-fehler.md, class 38).
 */
export const IMPRESSUM_SEITE = /impressum|imprint|legal|mentions-legales|anbieterkennzeichnung|datenschutz|privacy|#text-der-website-pruefung/i;

export function impressumPostfach(basis: Ergebnis, evidence: Evidence[]): Record<string, unknown> {
  if (basis.general.length || (basis.kanaele.presse?.length ?? 0) > 0) return {};
  // A free-mail box in the operator's own imprint is its own (matthes.kg@t-online.de,
  // manual pass 06.10.2026): the engine's raw verdict still calls it foreign.
  const gratis = (e: Evidence) => GRATIS_POSTFACH.test(e.email.split("@")[1] ?? "");
  // …and so is a mailbox on a sister domain of the same organisation, as its own
  // imprint names it (lackiererei-menge.de in unfallreparatur-menge.de's imprint,
  // the umlaut spelling of Barlt-Ost — contact pass, 07.10.2026).
  const schwester = (e: Evidence) => { try { return verwandteDomain(new URL(e.url).hostname, e.email.split("@")[1] ?? ""); } catch { return false; } };
  const sauber = evidence.filter((e) => !e.reasons.some((r) => !(r === "mailbox-foreign-domain" && (gratis(e) || schwester(e)))) && IMPRESSUM_SEITE.test(e.url) && postfachTauglich(e.email).ok);
  if (!sauber.length) return {};
  const rang = (m: string) => (WIND_ROLLENWERK.allgemein.test(m.split("@")[0]) ? 0 : 1);
  const best = [...sauber].sort((a, b) => rang(a.email) - rang(b.email) || a.email.localeCompare(b.email))[0];
  return { general: [best.email], selected: [best.email], fundstellen: { ...(basis.fundstellen ?? {}), [best.email]: best.url }, outcome: "general-only", reason: "imprint mailbox (§ 5 DDG)" };
}

/** Addresses written "name (at) domain.de", "name[@]domain.de", "name(a)domain.de". */
export function klammerAdressen(html: string): string {
  // Also "[*at*]" (meerwind.de), ")at(" (nordum-akademie.de) and "( - at - )"
  // (energiebauern.com) — contact pass, 07.10.2026.
  return html.replace(/\b([a-z0-9][a-z0-9._%+-]*)\s*(?:\(at\)|\[at\]|\{at\}|\(@\)|\[@\]|\(a\)|\[\*at\*\]|\)at\(|\(\s*-\s*at\s*-\s*\))\s*([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})\b/gi, "$1@$2");
}

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
function impressumAlsSeite(domain: string, weitere: string[] = []): Seite[] {
  const datei = resolve(MAIN_CHECKOUT, "scripts/.cache/windbetreiber/impressum", `${domain.replace(/[^a-z0-9.-]/g, "_")}.json`);
  if (!existsSync(datei)) return [];
  const imp = readJson(datei) as { impressum_url: string | null; text: string | null };
  const d = imp.impressum_url ? organisationsDomain(imp.impressum_url) : null;
  if (!imp.text || !imp.impressum_url || !d || (d !== domain && !weitere.includes(siteOf(d)))) return [];
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

/** The shared rule version plus this file: a change to the wind rules here re-judges every result. */
function windRegeln(): string {
  return sha(rulesVersion() + readFileSync(fileURLToPath(import.meta.url), "utf8")).slice(0, 16);
}

/**
 * Sites that ARE the operator's website besides its own domain: where its
 * start page redirects to (research sources record the final address) and
 * where the imprint the website check read lives. 29 websites of the manual
 * pass redirect elsewhere — windmanager.de's 165 operators and ewe.dk's 160
 * among them — and stood as "no contact" (06.10.2026).
 */
const weitereCache = new Map<string, string[]>();
export function weitereSitesVon(domain: string): string[] {
  const vorher = weitereCache.get(domain);
  if (vorher) return vorher;
  const out = new Set<string>();
  const imp = resolve(MAIN_CHECKOUT, "scripts/.cache/windbetreiber/impressum", `${domain.replace(/[^a-z0-9.-]/g, "_")}.json`);
  if (existsSync(imp)) {
    const i = readJson(imp) as { impressum_url: string | null; start: string | null };
    // The imprint's domain only when it is the SAME name under another ending
    // (windpunx.com → windpunx.de). A link to someone else's imprint — the web
    // agency's on dr-zirn.de, a bank's — let their mailboxes in as the
    // operator's (contact block 02, 06.10.2026).
    if (impressumHerkunft(i.impressum_url, domain) === "alias") out.add(organisationsDomain(i.impressum_url)!);
    // Where the start page ended after its redirects (recorded since 06.10.2026).
    const ziel = i.start ? organisationsDomain(i.start) : null;
    if (ziel && ziel !== domain) out.add(ziel);
  }
  const quellen = resolve(OUT, "sources", domain);
  if (existsSync(quellen)) {
    for (const f of readdirSync(quellen).filter((n) => n.endsWith(".json"))) {
      const m = readJson(resolve(quellen, f)) as { url?: string; finalUrl?: string };
      // Only a redirect of this domain's START page: a followed link or an
      // imprint page that forwards to an agency is no move of the website.
      if (!m.url || !m.finalUrl || organisationsDomain(m.url) !== domain) continue;
      let pfad = "/";
      try { pfad = new URL(m.url).pathname; } catch { continue; }
      if (pfad !== "/" && pfad !== "") continue;
      const d = organisationsDomain(m.finalUrl);
      if (d && d !== domain) out.add(d);
    }
  }
  // Hosting platforms and other stocks' portals are no alias of anyone.
  const liste = [...out].filter((d) => !/(?:^|\.)(?:ionos|strato|goneo|wix|jimdo|squarespace|wordpress|google|facebook|linkedin|instagram|youtube|xing)\./i.test(d)).map((d) => siteOf(d));
  weitereCache.set(domain, liste);
  return liste;
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
    const weitere = weitereSitesVon(domain);
    const belegUrls = [...new Set(gruppe.map((z) => z.website_beleg_url).filter((u): u is string => !!u && (organisationsDomain(u) === domain || weitere.includes(siteOf(organisationsDomain(u) ?? "")))))];
    eintraege.set(domain, {
      id: domain,
      // The shortest name is usually the parent itself ("Alterric GmbH"), not a project company.
      name: [...gruppe].sort((a, b) => a.name.length - b.name.length)[0].name,
      website: `https://${domain}/`,
      // The further sites act as a shared administration: pages and mailboxes there count.
      baseline, verbund: weitere.length ? { name: `Website ${domain}`, tokens: weitere.map((d) => fold(d.split(".")[0])).filter((t) => t.length >= 4) } : null,
      gespeicherteSeiten: impressumAlsSeite(domain, weitere), eingabe: [...baseline, ...belegUrls, ...(handSpuren()[domain] ?? [])],
      offeneLinks: [...belegUrls.map((url) => ({ url, priority: 950 })), ...(handSpuren()[domain] ?? []).map((url) => ({ url, priority: 990 }))],
      erlaubteSites: weitere,
      zusatz: { betreiber: gruppe.length },
    });
  }
  const bestand: Bestand = {
    name: "windbetreiber-kontakte", out: OUT, rules: windRegeln(), extraction: extractionVersion(),
    rollenwerk: WIND_ROLLENWERK, scope: WIND_SCOPE, linkProfil: "versorger",
    ergebnisForm: (basis, _m, evidence) => impressumPostfach(basis, evidence),
    // Cloudflare-protected and bracket-written addresses (rwe.com, altus-re.de,
    // windmanager(at)wpd.de) — decoded for this stock only, see impressumPostfach.
    htmlVorbereiten: { kennung: "wind-3", f: (html) => klammerAdressen(ohneAdressVerschleierung(webKomponentenAusklappen(html))) },
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
  // Every operator of a website, not one of them: the unchanged check looked at
  // whichever operator came last, and operators taken by hand later never got
  // the website's contact (97 operators, contact pass 07.10.2026).
  const jetzt = new Map<string, Awaited<ReturnType<typeof betreiber>>>();
  for (const z of await betreiber()) if (z.website) jetzt.set(z.website, [...(jetzt.get(z.website) ?? []), z]);
  const alle = ergebnisse().filter((r) => jetzt.has(r.id));
  const veraltet = alle.filter((r) => r.rules !== windRegeln());
  if (veraltet.length) throw new Error(`${veraltet.length} Ergebnisse unter alten Regeln (z. B. ${veraltet[0].id}) — erst --mode=evaluate`);
  const unbewertet = [...jetzt.keys()].filter((d) => !alle.some((r) => r.id === d));
  if (unbewertet.length) console.log(`Hinweis: ${unbewertet.length} belegte Websites ohne Ergebnis (z. B. ${unbewertet[0]}) — erst --mode=research/evaluate`);
  let unveraendert = 0;
  for (const r of alle) {
    const k = kontaktAus(r);
    if (k) mit++; else ohne++;
    const zs = jetzt.get(r.id) ?? [];
    // Only the operators whose contact differs: an unchanged one keeps its release.
    const abweichend = zs.filter((z) => (z.kontakt_email ?? null) !== (k?.email ?? null) || (z.kontakt_beleg_url ?? null) !== (k?.url ?? null));
    if (!abweichend.length) { unveraendert++; continue; }
    // Written either way: a website whose evaluation finds no contact on the
    // site any more must not keep the old one (06.10.2026, fault class
    // "contact outlives its source", docs/lehren/kontakt-engine-fehler.md).
    const felder = kontaktFelder(k, r.evaluatedAt.slice(0, 10));
    nurBekannteSpalten("windbetreiber", ddl, [felder]);
    if (!schreiben) continue;
    const { error, count } = await c.from("windbetreiber").update(felder, { count: "exact" }).eq("website", r.id).eq("aktiv", true).in("mastr_nr", abweichend.map((z) => z.mastr_nr));
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
    const ziel = url ? organisationsDomain(url) : null;
    if (!domain || !url || !ziel || (ziel !== domain && !weitereSitesVon(domain).includes(siteOf(ziel)))) throw new Error("Aufruf: --mode=spur --ids=<domain> --url=<Seite derselben Website oder ihrer Weiterleitung/ihres Impressums>");
    const spuren = handSpuren();
    spuren[domain] = [...new Set([...(spuren[domain] ?? []), url])];
    writeJson(SPUREN(), spuren);
    // The page a person saw, as a browser renders it: script-built imprints,
    // Joomla cloaking, Cloudflare — the plain fetch of the research saw none of
    // them (8 websites in the manual pass, 06.10.2026). Stored as a source page
    // of this entry; the engine judges it like any other.
    const gerendert = await seiteGerendert(url);
    await browserSchliessen();
    if (gerendert) {
      const digest = sha(gerendert);
      const dir = resolve(OUT, "sources", domain);
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      writeFileSync(resolve(dir, `${digest}.html`), gerendert, { mode: 0o600 });
      writeJson(resolve(dir, `${digest}.json`), { url, finalUrl: url, status: 200, observedAt: new Date().toISOString(), digest, originalDigest: null, via: "browser-handspur" });
    }
    const { bestand, eintraege } = bestandAus(await betreiber());
    const e = eintraege.get(domain);
    if (!e) throw new Error(`${domain} ist keine belegte Website eines aktiven Betreibers`);
    if (gerendert) console.log(`Seite im Browser gelesen und als Quelle gespeichert: ${url}`);
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
