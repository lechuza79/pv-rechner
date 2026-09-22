/**
 * Close the gaps of the press catalogue with the shared contact flow
 * (scripts/lib/kontakt-lauf.ts): only media for which the catalogue run found
 * no address at all. The catalogue's own contacts stay as they are.
 *
 *   --mode=research   begrenzte Abrufe je Medium (Standard-Budget 8)
 *   --mode=browser    zweiter Durchgang mit echtem Browser
 *   --mode=apply      belegte Adressen in den Katalog eintragen (--schreiben)
 *
 * Roles are those of the editorial media list (MEDIEN_ROLLENWERK): the imprint
 * of an editorial offering must name a responsible person with an address.
 * Nothing is sent.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  bewerten, laufen, readJson, recherchieren,
  type Bestand, type Eintrag, type Ergebnis,
} from "./lib/kontakt-lauf";
import { MAIN_CHECKOUT, extractionVersion, rulesVersion } from "./lib/contact-v2-config";
import { browserSchliessen, rendern } from "./lib/kontakt-browser";
import { MEDIEN_ROLLENWERK, MEDIEN_SCOPE } from "./liab-medien";
import { postfachTauglich } from "../lib/kontakt-tauglichkeit";
import { heuteInBerlin } from "../lib/zeit";

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const OUT = resolve(arg("out") ?? resolve(MAIN_CHECKOUT, "scripts/.cache/presse-kontakte"));
const mode = arg("mode") ?? "research";
const BUDGET = Number(arg("budget") ?? 8);

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

async function alle(c: any, tabelle: string, spalten: string, sortierung: string, filter: (q: any) => any): Promise<any[]> {
  const out: any[] = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await filter(c.from(tabelle).select(spalten)).order(sortierung).range(von, von + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

/** Media of the catalogue without any usable address. */
async function luecken(): Promise<Eintrag[]> {
  const c = await db();
  const medien = await alle(c, "presse_medien", "domain, titel, saat_name, start_url, impressum_url", "domain", q => q.eq("ist_medium", "medium"));
  const mitAdresse = new Set((await alle(c, "presse_kontakte", "domain", "domain", q => q.not("mail", "is", null).neq("mail_art", "werblich"))).map(k => k.domain));
  return medien.filter(m => !mitAdresse.has(m.domain)).map(m => ({
    id: m.domain, name: m.titel ?? m.saat_name ?? m.domain,
    website: m.start_url ?? `https://${m.domain}/`,
    baseline: [], verbund: null, gespeicherteSeiten: [],
    offeneLinks: m.impressum_url ? [{ url: m.impressum_url, priority: 950 }] : [],
    eingabe: [], zusatz: {},
  }));
}

function bestandAus(eintraege: Eintrag[]): Bestand {
  return {
    name: "presse-kontakte", out: OUT, rules: rulesVersion(), extraction: extractionVersion(),
    rollenwerk: MEDIEN_ROLLENWERK, scope: MEDIEN_SCOPE, linkProfil: "presse",
    eintraege: () => eintraege,
    fertigWenn: (r: Ergebnis) => r.selected.length > 0,
    linkVorrang: (url: string, grundwert: number) =>
      /impressum|imprint|legal-?notice/i.test(url) ? 900
      : /kontakt|contact|redaktion|ueber-?(?:mich|uns)|about|team/i.test(url) ? 400
      : grundwert,
  };
}

/** Editorial mailbox first, then the proven person, then a general one. */
const adresseFuer = (r: Ergebnis): { email: string; art: string } | null => {
  const tauglich = (m: string) => postfachTauglich(m).ok;
  const red = (r.kanaele.redaktion ?? []).filter(tauglich);
  if (red.length) return { email: red[0], art: "redaktion" };
  const koop = (r.kanaele.kooperation ?? []).filter(tauglich);
  if (koop.length) return { email: koop[0], art: "redaktion" };
  const allg = r.general.filter(tauglich);
  return allg.length ? { email: allg[0], art: "allgemein" } : null;
};

async function apply() {
  const schreiben = process.argv.includes("--schreiben");
  const c = await db();
  const dir = resolve(OUT, "results");
  const rows = readdirSync(dir).filter(f => f.endsWith(".json")).map(f => readJson(resolve(dir, f))) as Ergebnis[];
  const stale = rows.filter(r => r.rules !== rulesVersion()).length;
  if (stale) throw new Error(`${stale} Ergebnisse stammen aus älteren Regeln — erst neu auswerten`);
  const heute = heuteInBerlin();
  let gefunden = 0, geschrieben = 0;
  for (const r of rows) {
    const a = adresseFuer(r);
    if (!a) continue;
    const beleg = r.proofs.find(p => p.email === a.email)?.url ?? r.fundstellen?.[a.email];
    if (!beleg) throw new Error(`${r.id}: ${a.email} ohne Fundstelle`);
    gefunden++;
    if (!schreiben) { console.log(`${r.id}: ${a.email} (${a.art}) — ${beleg}`); continue; }
    const { error } = await c.from("presse_kontakte").upsert({
      domain: r.id, schluessel: a.email, mail: a.email, mail_art: a.art, quelle_url: beleg,
      anker: "adresse", seitenart: "nachrecherche", geprueft_am: heute, rang: 0,
    }, { onConflict: "domain,schluessel" });
    if (error) throw new Error(`${r.id}: ${error.message}`);
    geschrieben++;
  }
  console.log(JSON.stringify({ schreiben, ergebnisse: rows.length, gefunden, geschrieben }));
}

async function main() {
  if (mode === "apply") return apply();
  let rows = await luecken();
  const bestand = bestandAus(rows);
  const ids = arg("ids")?.split(",");
  if (ids) rows = rows.filter(r => ids.includes(r.id));
  const parts = Number(arg("parts") ?? 1), part = Number(arg("part") ?? 0);
  rows = rows.filter((_, i) => i % parts === part);
  if (mode === "browser") {
    rows = rows.filter(e => !adresseFuer(bewerten(bestand, e)));
    console.log(`${rows.length} Medien ohne Adresse · Browser-Durchgang`);
    try {
      for (const e of rows) {
        const r = await rendern(bestand, e);
        console.log(e.id, JSON.stringify({ gelesen: r.gelesen.length, fehler: r.fehler, adresse: adresseFuer(bewerten(bestand, e))?.email ?? null }));
      }
    } finally { await browserSchliessen(); }
    return;
  }
  console.log(`${rows.length} Medien ohne Adresse · Modus ${mode}`);
  await laufen(bestand, rows, async e => {
    const r = mode === "research" ? await recherchieren(bestand, e, BUDGET) : bewerten(bestand, e);
    console.log(e.id, JSON.stringify(mode === "research" ? r : { outcome: (r as Ergebnis).outcome }));
  }, `${mode}-${part}`);
}

if (process.argv[1]?.endsWith("presse-kontakte.ts")) main().catch(error => { console.error(error); process.exit(1); });
