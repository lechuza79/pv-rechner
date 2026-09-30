/**
 * Kontakte der Landkreise — die Kreise als Sonderfall der Kommunen, auf
 * demselben Ablauf (scripts/lib/kontakt-lauf.ts) und mit demselben Rollenwerk
 * (Klimaschutz/Energie und Presse).
 *
 * Anlass (30.09.2026): Alle 294 Landkreise stehen mit Website in der
 * Kontaktliste, keiner trug eine Adresse — die Gemeinde-Erfassung liest nur
 * Gemeinden. Drei Kreisverwaltungen bekamen versehentlich die
 * Pressemitteilung, und der Betreiber hat sie als eigene Zielgruppe erkannt.
 *
 * Anders als bei Gemeinden ist nur die Zuständigkeit: Für eine Gemeinde ist
 * eine Kreis-Domain eine fremde Behörde, für einen Kreis ist sie die eigene,
 * und die Gemeinden auf seinem Portal sind die fremden.
 *
 *   --mode=evaluate   offline über bereits geholte Seiten
 *   --mode=research   begrenzte Abrufe je Kreis (Standard-Budget 15)
 *   --mode=suche      Presse-/Klimaschutzseiten über Sitemap und Website-Suche vormerken
 *   --mode=browser    zweiter Durchgang mit echtem Browser für Kreise ohne Fachstelle
 *   --mode=summary    Zahlen über alle Ergebnisse
 *   --mode=apply      belegte Fachkontakte eintragen (--schreiben)
 *
 * Gemeinsam: --ids=A,B | --part=i --parts=n --out=DIR
 *
 * Es wird nichts verschickt.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Rollenwerk, ScopeRegeln } from "../lib/kontakt-suche";
import { KOMMUNEN_ROLLENWERK } from "../lib/contact-municipal-judge";
import { fachkontakteAus } from "../lib/kommunen-fachkontakt";
import {
  bewerten, laufen, readJson, recherchieren, writeJson,
  type Bestand, type Eintrag, type Ergebnis,
} from "./lib/kontakt-lauf";
import { browserSchliessen, rendern } from "./lib/kontakt-browser";
import { entschluesseltOderRoh } from "../lib/uri-sicher";
import { suchAdresse, suchFormular, suchseitenLink } from "../lib/funding-url-suche";
import { MAIN_CHECKOUT, extractionVersion, rulesVersion } from "./lib/contact-v2-config";

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const OUT = resolve(arg("out") ?? resolve(MAIN_CHECKOUT, "scripts/.cache/kreise-kontakte"));
const mode = arg("mode") ?? "evaluate";
const BUDGET = Number(arg("budget") ?? 15);
const schreiben = process.argv.includes("--schreiben");

/**
 * The municipal roles, plus the units a district runs for its own buildings.
 * Hand review of 30 hits (30.09.2026): "Hochbau" (Helmstedt) and
 * "Gebäudemanagement" (Jerichower Land) were read as energy because they sit
 * on the energy/climate pages; they manage the district's property, they are
 * not the climate office. The Landrat's front office is not the press office.
 */
export const KREISE_ROLLENWERK: Rollenwerk = {
  ...KOMMUNEN_ROLLENWERK,
  fremdeEinheit: new RegExp(`${KOMMUNEN_ROLLENWERK.fremdeEinheit.source}|hochbau|gebäudemanagement|gebaeudemanagement|liegenschaft|vorzimmer`, "iu"),
};

/**
 * Bavarian district offices write from "lra-xx.bayern.de" while their site is
 * "landkreis-xx.de" — half of Bavaria had no contact because every address was
 * foreign (30.09.2026). The shared engine compares registrable domains, so
 * "bayern.de" is admitted here and narrowed afterwards to district-office
 * hosts only (istKreisPostfach): a ministry or water authority on bayern.de is
 * never the district.
 */
const BAYERN_LRA = /^(?:lra|landratsamt)[-.][a-z-]+\.bayern\.de$/i;
export function istKreisPostfach(email: string, website: string): boolean {
  const domain = (email.split("@")[1] ?? "").toLowerCase();
  if (!domain.endsWith("bayern.de")) return true;
  if (/(^|\.)bayern\.de$/.test(new URL(website).hostname)) return true;
  return BAYERN_LRA.test(domain);
}

export const KREISE_SCOPE: ScopeRegeln = {
  // On a district portal the towns are the other authority.
  fremdeBehoerde: /stadt|gemeinde|verbandsgemeinde|samtgemeinde|markt/,
  // District companies carry the name and are not the administration.
  eigenbetrieb: /touris|marketing|abfall|awb|wirtschaftsfoerder|jobcenter|klinik|sparkasse|musikschule|vhs|volkshochschule|verkehr|wfg/,
  namensvarianten: /landkreis|kreis|lk|lra|landratsamt|kreisverwaltung|region|staedteregion|regionalverband/,
  verwandteDomain: (mailDomain: string) => mailDomain === "bayern.de",
};

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

async function db() {
  const url = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

type Zeile = { region_id: string; website: string; email: string | null; rollen_email: string | null; presse_email: string | null; personen_email: string | null };

async function kreise(): Promise<(Zeile & { name: string })[]> {
  const c = await db();
  const { data, error } = await c.from("kommunen_kontakt")
    .select("region_id, website, email, rollen_email, presse_email, personen_email")
    .like("region_id", "_____").not("website", "is", null).order("region_id");
  if (error) throw new Error(error.message);
  const ids = (data as Zeile[]).map(z => z.region_id);
  const { data: namen, error: e2 } = await c.from("mastr_regions").select("region_id, name").in("region_id", ids);
  if (e2) throw new Error(e2.message);
  const name = new Map((namen as { region_id: string; name: string }[]).map(n => [n.region_id, n.name]));
  return (data as Zeile[]).map(z => ({ ...z, name: name.get(z.region_id) ?? z.region_id }));
}

/**
 * Pages worth reading first, found per district before the research run.
 * The plain crawl follows the menu; on a district portal the press office and
 * the climate office sit three levels deep, and a budget of 30 pages ran out on
 * other departments (30.09.2026: 111 districts without a Fachstelle, several
 * with hundreds of addresses read and none of them the right one).
 */
const SEEDS = resolve(OUT, "seeds.json");
const ZIEL = /presse|pressestelle|oeffentlichkeitsarbeit|öffentlichkeitsarbeit|medien(?:service|kontakt)|klimaschutz|klimamanagement|energie(?:beratung|management|agentur)?|nachhaltigkeit/i;
const seeds = (): Record<string, { url: string; priority: number }[]> => existsSync(SEEDS) ? readJson(SEEDS) : {};

async function holen(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; solar-check.io contact research)" }, signal: AbortSignal.timeout(15_000), redirect: "follow" });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

async function vormerken(e: Eintrag): Promise<{ url: string; priority: number }[]> {
  const host = new URL(e.website!).host.replace(/^www\./, "");
  const eigen = (u: string) => { try { return new URL(u).host.replace(/^www\./, "") === host; } catch { return false; } };
  const funde = new Map<string, number>();
  const nimm = (u: string, text = "") => {
    if (!eigen(u) || /\.(jpe?g|png|gif|svg|css|js|ics|zip)(\?|$)/i.test(u)) return;
    const treffer = ZIEL.test(entschluesseltOderRoh(u).replace(/[-_/]/g, " ")) || ZIEL.test(text);
    if (treffer) funde.set(u.split("#")[0], Math.max(funde.get(u) ?? 0, /presse|klima/i.test(u + text) ? 1000 : 900));
  };
  const origin = new URL(e.website!).origin;
  for (const pfad of ["/sitemap.xml", "/sitemap_index.xml"]) {
    const xml = await holen(origin + pfad);
    if (!xml) continue;
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
    for (const l of locs.filter(l => /sitemap/i.test(l) && l.endsWith(".xml")).slice(0, 8)) {
      const sub = await holen(l);
      if (sub) for (const m of sub.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) nimm(m[1]);
    }
    for (const l of locs) nimm(l);
    if (funde.size) break;
  }
  const start = await holen(e.website!);
  if (start) {
    const formular = suchFormular(start, e.website!);
    const suchseite = formular ? null : suchseitenLink(start, e.website!);
    for (const begriff of ["Pressestelle", "Klimaschutz"]) {
      const url = formular ? suchAdresse(formular, begriff) : suchseite ? `${suchseite}${suchseite.includes("?") ? "&" : "?"}q=${encodeURIComponent(begriff)}` : null;
      if (!url) continue;
      const html = await holen(url);
      if (!html) continue;
      for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
        try { nimm(new URL(m[1], url).href, m[2].replace(/<[^>]+>/g, " ")); } catch { /* malformed link */ }
      }
    }
  }
  return [...funde].map(([url, priority]) => ({ url, priority })).sort((a, b) => b.priority - a.priority).slice(0, 12);
}

function bestandAus(zeilen: Awaited<ReturnType<typeof kreise>>): { bestand: Bestand; eintraege: Map<string, Eintrag> } {
  const eintraege = new Map<string, Eintrag>();
  for (const z of zeilen) {
    const website = /^https?:\/\//.test(z.website) ? z.website : `https://${z.website}`;
    const baseline = [z.email, z.rollen_email, z.presse_email, z.personen_email].filter((m): m is string => !!m);
    eintraege.set(z.region_id, {
      id: z.region_id, name: z.name.replace(/^(Landkreis|Kreis)\s+/, ""), website,
      baseline: [...new Set(baseline)], verbund: null, gespeicherteSeiten: [], eingabe: baseline,
      offeneLinks: seeds()[z.region_id] ?? [],
    });
  }
  const bestand: Bestand = {
    name: "kreise-kontakte", out: OUT, rules: rulesVersion(), extraction: extractionVersion(),
    rollenwerk: KREISE_ROLLENWERK, scope: KREISE_SCOPE, linkProfil: "kommunen",
    eintraege: () => [...eintraege.values()],
    // Same result fields as the municipalities, so the shared contact picker reads them.
    ergebnisForm: (basis: Ergebnis) => ({
      energy: basis.kanaele.energy ?? [],
      press: basis.kanaele.press ?? [],
      outcome: basis.outcome === "all-channels" ? "both-channels" : basis.outcome === "some-channels" ? "one-channel" : basis.outcome,
      administration: null,
    }),
    fertigWenn: (r: Ergebnis) => r.outcome === "both-channels",
  };
  return { bestand, eintraege };
}

/** A stored result with every non-district bayern.de mailbox taken out. */
function gefiltert(r: any): any {
  const ok = (m: string) => istKreisPostfach(m, r.website ?? "https://x.de");
  const k: Record<string, string[]> = {};
  for (const [kanal, liste] of Object.entries(r.kanaele ?? {})) k[kanal] = (liste as string[]).filter(ok);
  return { ...r, kanaele: k, energy: (r.energy ?? []).filter(ok), press: (r.press ?? []).filter(ok),
    selected: (r.selected ?? []).filter(ok), general: (r.general ?? []).filter(ok), proofs: (r.proofs ?? []).filter((p: any) => ok(p.email)) };
}

function ergebnisse(): any[] {
  const dir = resolve(OUT, "results");
  return existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".json")).map(f => gefiltert(readJson(resolve(dir, f)))) : [];
}

function summary(anzahl: number) {
  const rows = ergebnisse();
  const k = rows.map(r => fachkontakteAus(r));
  const out = {
    observedAt: new Date().toISOString(), kreise: anzahl, bewertet: rows.length,
    mitKlima: k.filter(x => x.klima).length, mitPresse: k.filter(x => x.presse).length,
    mitFachkontakt: k.filter(x => x.klima || x.presse).length,
    nurAllgemein: rows.filter((r, i) => !k[i].klima && !k[i].presse && r.general.length > 0).length,
    ohneKontakt: rows.filter(r => !r.selected.length && !r.general.length).length,
  };
  writeJson(resolve(OUT, "summary.json"), out);
  console.log(JSON.stringify(out, null, 1));
}

/**
 * A mailbox whose NAME is the office ("pressestelle@kreis-lippe.de",
 * "klimaschutz@landkreis-uelzen.de"), published on the district's own site.
 * The engine never takes a role from a mailbox name — right for people and
 * shared inboxes, but it left 24 districts without their obvious press inbox
 * and 14 without their climate inbox (30.09.2026). Used only as a fallback when
 * no role is proven in the text, and recorded with the page it stood on.
 */
const PRESSE_POSTFACH = /^(?:presse|pressestelle|pressebuero|medien|oeffentlichkeitsarbeit|kommunikation)[@.-]/;
const KLIMA_POSTFACH = /^(?:klimaschutz|klima|klimaschutzmanagement|energie|energieberatung|klimaschutzagentur)[@.-]/;
function postfachNachName(r: any, muster: RegExp): { email: string; url: string } | null {
  const dir = resolve(OUT, "sources", r.id);
  if (!existsSync(dir)) return null;
  const site = (h: string) => h.toLowerCase().split(".").slice(-2).join(".");
  const own = site(new URL(r.website).hostname);
  for (const f of readdirSync(dir).filter(f => f.endsWith(".html"))) {
    const meta = existsSync(resolve(dir, f.replace(/\.html$/, ".json"))) ? readJson(resolve(dir, f.replace(/\.html$/, ".json"))) : {};
    for (const m of readFileSync(resolve(dir, f), "utf8").match(/[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? []) {
      const email = m.toLowerCase(), domain = email.split("@")[1];
      if (/de-mail\.de$/.test(domain) || !muster.test(email)) continue;
      if (site(domain) !== own && !/^(?:lra|landratsamt)[-.][a-z-]+\.bayern\.de$/.test(domain)) continue;
      return { email, url: meta.finalUrl ?? meta.url ?? r.website };
    }
  }
  return null;
}

/** Same columns as the municipal apply: Klimaschutz, Presse, all belegte Fachkontakte. */
async function apply() {
  const c = await db();
  let geschrieben = 0, mitFach = 0, nurAllgemein = 0, postfach = 0;
  for (const r of ergebnisse()) {
    const k = fachkontakteAus(r);
    const felder: Record<string, unknown> = {
      klima_email: k.klima?.email ?? null, klima_beleg_url: k.klima?.belegUrl ?? null,
      presse_kontakt_email: k.presse?.email ?? null, presse_kontakt_beleg_url: k.presse?.belegUrl ?? null,
      fachkontakte: k.alle.length ? k.alle : null, fachkontakte_at: k.alle.length ? new Date().toISOString() : null,
    };
    if (!k.presse) { const p = postfachNachName(r, PRESSE_POSTFACH); if (p) { felder.presse_email = p.email; felder.presse_email_quelle = "postfachname"; felder.presse_beleg = p.url; postfach++; } }
    if (!k.klima) { const p = postfachNachName(r, KLIMA_POSTFACH); if (p) { felder.klima_email = p.email; felder.klima_beleg_url = p.url; postfach++; } }
    if (k.alle.length) mitFach++;
    // A general mailbox with a page is the fallback when no Fachstelle is proven.
    else if (r.general?.length) { nurAllgemein++; felder.email = r.general[0]; }
    if (!schreiben) continue;
    const { error } = await c.from("kommunen_kontakt").update(felder).eq("region_id", r.id);
    if (error) throw new Error(`${r.id}: ${error.message}`);
    geschrieben++;
  }
  console.log(JSON.stringify({ schreiben, mitFach, nurAllgemein, postfach, geschrieben }));
}

async function main() {
  if (mode === "apply") return apply();
  const { bestand, eintraege } = bestandAus(await kreise());
  if (mode === "summary") return summary(eintraege.size);
  let rows = [...eintraege.values()];
  const ids = arg("ids")?.split(",");
  if (ids) { const wanted = new Set(ids); rows = rows.filter(r => wanted.has(r.id)); }
  const parts = Number(arg("parts") ?? 1), part = Number(arg("part") ?? 0);
  rows = rows.filter((_, i) => i % parts === part);
  if (mode === "suche") {
    const ohne = rows.filter(e => { const k = fachkontakteAus(gefiltert(bewerten(bestand, e))); return !k.klima || !k.presse; });
    const alle = seeds();
    console.log(`${ohne.length} Kreise ohne Klima- oder Pressestelle · Vorsuche`);
    for (const e of ohne) {
      alle[e.id] = await vormerken(e);
      writeJson(SEEDS, alle);
      // The research log would otherwise report the district as finished.
      const log = resolve(OUT, "research", `${e.id}.json`);
      if (alle[e.id].length && existsSync(log)) (await import("node:fs")).unlinkSync(log);
      console.log(e.id, e.name, "|", alle[e.id].length, "Seiten vorgemerkt", alle[e.id].slice(0, 2).map(l => l.url).join(" "));
    }
    return;
  }
  if (mode === "browser") {
    // Portals that build their menu in the browser left the plain fetch on the
    // start page (24 of 58 districts without any address, 30.09.2026).
    const ohneFach = (e: Eintrag) => { const k = fachkontakteAus(gefiltert(bewerten(bestand, e))); return !k.klima && !k.presse; };
    rows = rows.filter(ohneFach);
    console.log(`${rows.length} Kreise ohne Fachstelle · Browser-Durchgang`);
    try {
      for (const e of rows) {
        const r = await rendern(bestand, e, Number(arg("seiten") ?? 10));
        const f = fachkontakteAus(gefiltert(bewerten(bestand, e)));
        console.log(e.id, e.name, "| gelesen", r.gelesen.length, r.fehler ?? "", "| Klima:", f.klima?.email ?? "—", "| Presse:", f.presse?.email ?? "—");
      }
    } finally { await browserSchliessen(); }
    return;
  }
  console.log(`${rows.length} Kreise · Modus ${mode}`);
  await laufen(bestand, rows, async e => {
    if (mode === "research") await recherchieren(bestand, e, BUDGET); else bewerten(bestand, e);
    const pfad = resolve(OUT, "results", `${e.id}.json`);
    if (!existsSync(pfad)) return console.log(e.id, e.name, "| kein Ergebnis");
    const r = gefiltert(readJson(pfad));
    const f = fachkontakteAus(r);
    console.log(e.id, e.name, "| Klima:", f.klima?.email ?? "—", "| Presse:", f.presse?.email ?? "—", "| allgemein:", (r.general ?? []).slice(0, 2).join(",") || "—");
  }, `${mode}-${part}`);
}

if (process.argv[1]?.endsWith("kreise-kontakte.ts")) main().catch(error => { console.error(error); process.exit(1); });
