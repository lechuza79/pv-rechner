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
 *   --mode=summary    numbers over all results
 *   --mode=apply      write the contacts to the operators (--schreiben)
 *
 * Common: --ids=domain,domain | --part=i --parts=n
 *
 * Nothing is sent.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Rollenwerk, ScopeRegeln } from "../lib/kontakt-suche";
import { PRESS_TEXT } from "../lib/contact-municipal-judge";
import { postfachTauglich } from "../lib/kontakt-tauglichkeit";
import { kontaktFelder, maildomain } from "../lib/windbetreiber";
import { WINDBETREIBER_SQL } from "../lib/windbetreiber-sql";
import { nurBekannteSpalten, spaltenAusDdl } from "../lib/ddl-spalten";
import { bewerten, laufen, readJson, recherchieren, writeJson, type Bestand, type Eintrag, type Ergebnis } from "./lib/kontakt-lauf";
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
};

const WIND_SCOPE: ScopeRegeln = {
  // A developer's site lists partner municipalities and their mailboxes.
  fremdeBehoerde: /kreis|landratsamt|stadtverwaltung|gemeinde|verbandsgemeinde|amt-/,
  // Turbine makers and service firms named on a project page are not the operator.
  eigenbetrieb: /enercon|vestas|nordex|siemens|gamesa|ge-?renewable/,
  namensvarianten: /wind|energie|energy|gruppe|group|projekt|projects?|park|regenerativ/,
};

type Zeile = { mastr_nr: string; name: string; website: string; register_email: string | null; kontakt_email: string | null };

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
    const { data, error } = await c.from("windbetreiber").select("mastr_nr, name, website, register_email, kontakt_email")
      .eq("aktiv", true).not("website", "is", null).order("mastr_nr").range(von, von + 999);
    if (error) throw new Error(error.message);
    out.push(...(data as Zeile[]));
    if (!data || data.length < 1000) return out;
  }
}

function bestandAus(zeilen: Zeile[]): { bestand: Bestand; eintraege: Map<string, Eintrag> } {
  const jeWebsite = new Map<string, Zeile[]>();
  for (const z of zeilen) jeWebsite.set(z.website, [...(jeWebsite.get(z.website) ?? []), z]);
  const eintraege = new Map<string, Eintrag>();
  for (const [domain, gruppe] of jeWebsite) {
    // Only register mailboxes on this very domain: a project company's mailbox
    // at its manager says nothing about the developer's site.
    const baseline = [...new Set(gruppe.flatMap((z) => [z.register_email, z.kontakt_email]).filter((m): m is string => !!m && maildomain(m) === domain))];
    eintraege.set(domain, {
      id: domain,
      // The shortest name is usually the parent itself ("Alterric GmbH"), not a project company.
      name: [...gruppe].sort((a, b) => a.name.length - b.name.length)[0].name,
      website: `https://${domain}/`,
      baseline, verbund: null, gespeicherteSeiten: [], eingabe: baseline,
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

function summary(bestand: Bestand, anzahl: number) {
  const rows = ergebnisse();
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

async function apply() {
  const c = await db();
  const ddl = spaltenAusDdl(WINDBETREIBER_SQL, "windbetreiber");
  let mit = 0, ohne = 0, geschrieben = 0;
  // A result judged under older rules says what the old rules thought. Writing
  // it would bring back exactly what the rule change was meant to remove.
  const alle = ergebnisse();
  const veraltet = alle.filter((r) => r.rules !== rulesVersion());
  if (veraltet.length) throw new Error(`${veraltet.length} Ergebnisse unter alten Regeln (z. B. ${veraltet[0].id}) — erst --mode=evaluate`);
  for (const r of alle) {
    const k = kontaktAus(r);
    if (k) mit++; else ohne++;
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
  console.log(JSON.stringify({ schreiben, websitesMitKontakt: mit, websitesOhneKontakt: ohne, betreiberGeschrieben: geschrieben }));
}

async function main() {
  if (mode === "apply") return apply();
  const { bestand, eintraege } = bestandAus(await betreiber());
  if (mode === "summary") return summary(bestand, eintraege.size);
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
