/**
 * Pressekontakte der Versorger — dritter Bestand auf demselben Ablauf wie die
 * Gemeinden (scripts/lib/kontakt-lauf.ts).
 *
 * Gemessen am 21.09.2026: von 910 Versorgern mit Website trugen 436 gar keine
 * Adresse und nur rund 30 eine erkennbare Pressestelle. Gesucht wird deshalb
 * EINE Rolle — Presse und Unternehmenskommunikation. Die Rollenmuster sind die
 * der Gemeinden (eine Pressestelle heißt bei einem Stadtwerk genauso), neu sind
 * nur die Zuständigkeit und die allgemeinen Postfächer.
 *
 *   --mode=evaluate   offline über bereits geholte Seiten
 *   --mode=research   begrenzte Abrufe je Versorger (Standard-Budget 12)
 *   --mode=summary    Zahlen über alle Ergebnisse
 *   --mode=apply      belegte Pressekontakte eintragen (--schreiben)
 *
 * Gemeinsam: --ids=A,B | --part=i --parts=n --out=DIR · research: --budget=12
 *
 * Es wird nichts verschickt.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Rollenwerk, ScopeRegeln } from "../lib/kontakt-suche";
import { PRESS_TEXT } from "../lib/contact-municipal-judge";
import {
  bewerten, laufen, readJson, recherchieren, writeJson,
  type Bestand, type Eintrag, type Ergebnis,
} from "./lib/kontakt-lauf";
import { MAIN_CHECKOUT, extractionVersion, rulesVersion } from "./lib/contact-v2-config";

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const OUT = resolve(arg("out") ?? resolve(MAIN_CHECKOUT, "scripts/.cache/versorger-kontakte"));
const mode = arg("mode") ?? "evaluate";
const BUDGET = Number(arg("budget") ?? 12);
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

const PRESS_HEAD = /^(?:(?:ihr(?:e)? )?(?:kontakt|ansprechpartner\S*)[: ]+(?:für (?:die )?)?)?(?:presse\S*|pressekontakt|pressestelle|presse und medien|medienkontakt|unternehmenskommunikation|kommunikation|öffentlichkeitsarbeit|presse- und öffentlichkeitsarbeit|newsroom)$/iu;

/**
 * Wer bei einem Stadtwerk Presseanfragen beantwortet. Ausgeschlossen ist, was
 * auf denselben Seiten steht und Kunden bedient — der Kundenservice ist kein
 * Gesprächspartner für eine Veröffentlichung.
 */
export const VERSORGER_ROLLENWERK: Rollenwerk = {
  rollen: [{ kanal: "presse", text: PRESS_TEXT, heading: PRESS_HEAD }],
  eigenerTitel: /pressesprecher\w*|leit(?:ung|er\w*) (?:der )?(?:unternehmens)?kommunikation|kommunikationsleit\w*|referent\w* (?:für )?(?:presse|kommunikation)/iu,
  ausgeschlossen: /datenschutzbeauftrag|technische umsetzung|webdesign|agentur für|rechtsanwalt|streitschlichtung|verbraucherschlichtung|beschwerde/iu,
  fremdeEinheit: /kundenservice|kundencenter|kundenbüro|störung|stoerung|entstörung|zählerstand|abrechnung|netzanschluss|hausanschluss|bewerbung|ausbildung|karriere|vertrieb|bäder|baeder|parkhaus/iu,
  allgemein: /^(info|kontakt|service|kundenservice|kundencenter|post|poststelle|mail|zentrale|office|stadtwerke|swb|energie|netz|netzservice|vertrieb|kunden|kundenbuero|anfrage|hallo)$/i,
  starkesPostfach: /presse|kommunikation|medien|newsroom|unternehmenskommunikation/i,
};

const VERSORGER_SCOPE: ScopeRegeln = {
  // Die Kommune oder der Landkreis veröffentlicht auf dem Stadtwerke-Portal nicht;
  // steht deren Domain da, ist es eine fremde Stelle.
  fremdeBehoerde: /kreis|landratsamt|stadtverwaltung|gemeinde/,
  // Bäder, Verkehr und Parkhäuser tragen den Namen und sind nicht die Pressestelle.
  eigenbetrieb: /baeder|bad|verkehr|parken|parkhaus|hafen|messe/,
  namensvarianten: /stadtwerke|stadtwerk|sw|werke|energie|netz|versorgung/,
};

type Zeile = { id: string; name: string; website: string | null; rollen_email: string | null; personen_email: string | null; website_email: string | null; kontakt_email: string | null; ist_netzbetrieb: boolean | null };

async function db() {
  const url = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function versorger(): Promise<Zeile[]> {
  const c = await db();
  const out: Zeile[] = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await c.from("utilities")
      .select("id, name, website, rollen_email, personen_email, website_email, kontakt_email, ist_netzbetrieb")
      .not("website", "is", null).order("id").range(von, von + 999);
    if (error) throw new Error(error.message);
    out.push(...(data as Zeile[]));
    if (!data || data.length < 1000) return out;
  }
}

function bestandAus(zeilen: Zeile[]): { bestand: Bestand; eintraege: Map<string, Eintrag> } {
  const eintraege = new Map<string, Eintrag>();
  for (const z of zeilen) {
    const website = /^https?:\/\//.test(z.website!) ? z.website! : `https://${z.website}`;
    const baseline = [z.rollen_email, z.personen_email, z.website_email, z.kontakt_email].filter((m): m is string => !!m);
    eintraege.set(z.id, {
      id: z.id, name: z.name, website, baseline: [...new Set(baseline)], verbund: null, gespeicherteSeiten: [],
      eingabe: baseline, zusatz: { netzbetrieb: !!z.ist_netzbetrieb },
    });
  }
  const bestand: Bestand = {
    name: "versorger-kontakte", out: OUT, rules: rulesVersion(), extraction: extractionVersion(),
    rollenwerk: VERSORGER_ROLLENWERK, scope: VERSORGER_SCOPE, linkProfil: "versorger",
    eintraege: () => [...eintraege.values()],
    fertigWenn: (r: Ergebnis) => (r.kanaele.presse?.length ?? 0) > 0,
    // Presseseiten zuerst: Stadtwerke führen die Pressestelle unter „Presse",
    // „Newsroom" oder „Unternehmen/Kommunikation", selten auf der Kontaktseite.
    linkVorrang: (url: string, grundwert: number) =>
      /presse|newsroom|medien(?:service|kontakt)?|unternehmenskommunikation/i.test(url) ? 900
      : /impressum|imprint|kontakt|contact/i.test(url) ? Math.max(grundwert, 300)
      : grundwert,
  };
  return { bestand, eintraege };
}

function ergebnisse(): Ergebnis[] {
  const dir = resolve(OUT, "results");
  return existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".json")).map(f => readJson(resolve(dir, f)) as Ergebnis) : [];
}

function summary(bestand: Bestand, anzahl: number) {
  const rows = ergebnisse();
  const out = {
    observedAt: new Date().toISOString(), rules: bestand.rules, versorger: anzahl, bewertet: rows.length,
    mitPresse: rows.filter(r => (r.kanaele.presse?.length ?? 0) > 0).length,
    nurAllgemein: rows.filter(r => !(r.kanaele.presse?.length) && r.general.length > 0).length,
    ohneKontakt: rows.filter(r => !r.selected.length).length,
    seitenGelesen: rows.reduce((n, r) => n + r.pages.read, 0),
  };
  writeJson(resolve(OUT, "summary.json"), out);
  console.log(JSON.stringify(out, null, 1));
}

/** Belegte Pressekontakte und die allgemeinen Postfächer als Rückfall eintragen. */
async function apply() {
  const c = await db();
  if (schreiben) {
    const { error } = await c.rpc("exec_sql", { sql: `
      ALTER TABLE utilities ADD COLUMN IF NOT EXISTS presse_email text;
      ALTER TABLE utilities ADD COLUMN IF NOT EXISTS presse_beleg_url text;
      ALTER TABLE utilities ADD COLUMN IF NOT EXISTS presse_geprueft_am date;
      NOTIFY pgrst, 'reload schema';` });
    if (error) throw new Error(error.message);
    // The API picks up new columns only after it reloads its schema; writing
    // right away failed on the first run (21.09.2026).
    await new Promise(r => setTimeout(r, 3000));
  }
  const rows = ergebnisse();
  let mitPresse = 0, geschrieben = 0;
  for (const r of rows) {
    const presse = r.kanaele.presse ?? [];
    if (!presse.length) continue;
    mitPresse++;
    const beleg = r.proofs.find(p => p.email === presse[0]);
    if (!schreiben) continue;
    const { error } = await c.from("utilities").update({
      presse_email: presse[0], presse_beleg_url: beleg?.url ?? null, presse_geprueft_am: r.evaluatedAt.slice(0, 10),
    }).eq("id", r.id);
    if (error) throw new Error(`${r.id}: ${error.message}`);
    geschrieben++;
  }
  console.log(JSON.stringify({ schreiben, mitPresse, geschrieben }));
}

async function main() {
  if (mode === "apply") return apply();
  const { bestand, eintraege } = bestandAus(await versorger());
  if (mode === "summary") return summary(bestand, eintraege.size);
  let rows = [...eintraege.values()];
  const ids = arg("ids")?.split(",");
  if (ids) { const wanted = new Set(ids); rows = rows.filter(r => wanted.has(r.id)); }
  const parts = Number(arg("parts") ?? 1), part = Number(arg("part") ?? 0);
  rows = rows.filter((_, i) => i % parts === part);
  console.log(`${rows.length} Versorger · Modus ${mode}`);
  await laufen(bestand, rows, async e => {
    const r = mode === "research" ? await recherchieren(bestand, e, BUDGET) : bewerten(bestand, e);
    console.log(e.id, JSON.stringify(mode === "research" ? r : { outcome: (r as Ergebnis).outcome }));
  }, `${mode}-${part}`);
}

if (process.argv[1]?.endsWith("versorger-kontakte.ts")) main().catch(error => { console.error(error); process.exit(1); });
