/**
 * Kontakterfassung der PV-Fachbetriebe — vierter Bestand auf demselben Ablauf
 * wie die Gemeinden (scripts/lib/kontakt-lauf.ts).
 *
 * Gesucht wird EINE Rolle: der Betrieb selbst (Inhaber, Geschäftsführung oder
 * sein Postfach). Bei einem Handwerksbetrieb ist das Impressum der Ort dafür —
 * § 5 DDG verlangt dort eine Adresse für die schnelle Kontaktaufnahme, und
 * anders als im Rathaus steht daneben kein fremdes Amt.
 *
 *   --mode=evaluate   offline über bereits geholte Seiten
 *   --mode=research   begrenzte Abrufe je Betrieb (Standard-Budget 8)
 *   --mode=summary    Zahlen und Alt/Neu-Vergleich über alle Ergebnisse
 *   --mode=browser    zweiter Durchgang mit echtem Browser für Betriebe ohne Kontakt
 *   --mode=apply      belegte Kontakte eintragen (--schreiben); ohne den Schalter nur zählen
 *
 * Gemeinsam: --ids=A,B | --stichprobe=N (je N mit und ohne bekannte Adresse)
 *            --part=i --parts=n --out=DIR · research: --budget=8
 *
 * Es wird nichts verschickt. Eingetragen wird nur mit --schreiben, und nur in
 * eigene Spalten plus die bisher LEERE Kontaktadresse — eine vorhandene
 * Adresse wird nie überschrieben.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { resolveMx } from "node:dns/promises";
import type { Rollenwerk, ScopeRegeln } from "../lib/kontakt-suche";
import {
  bewerten, laufen, readJson, recherchieren, writeJson,
  type Bestand, type Eintrag, type Ergebnis,
} from "./lib/kontakt-lauf";
import { MAIN_CHECKOUT, extractionVersion, rulesVersion } from "./lib/contact-v2-config";
import { browserSchliessen, rendern } from "./lib/kontakt-browser";

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const OUT = resolve(arg("out") ?? resolve(MAIN_CHECKOUT, "scripts/.cache/fachbetriebe-kontakte"));
const mode = arg("mode") ?? "evaluate";
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

export const FACHBETRIEB_ROLLENWERK: Rollenwerk = {
  rollen: [{
    kanal: "betrieb",
    text: /inhaber\w*|geschäftsführ\w*|geschaeftsfuehr\w*|vertreten durch|vertretungsberechtigt\w*|ansprechpartner\w*|betriebsleit\w*|meister\w*/iu,
    heading: /^(?:impressum|kontakt|ansprechpartner(?:in)?|über uns|ueber uns|team|unser team|so erreichen sie uns)$/iu,
  }],
  eigenerTitel: /inhaber\w*|geschäftsführ\w*|geschaeftsfuehr\w*|betriebsleit\w*/iu,
  ausgeschlossen: /datenschutzbeauftrag|technische umsetzung|webdesign|webhosting|hosting durch|agentur für|realisiert (?:von|durch)|rechtsanwalt|kanzlei|streitschlichtung|verbraucherschlichtung|beauftragte\w* für (?:den )?datenschutz|informationssicherheit|sicherheitslücke|security/iu,
  fremdeEinheit: /bewerbung|karriere|ausbildung|jobs?\b|buchhaltung|rechnung|reklamation/iu,
  allgemein: /^(info|kontakt|contact|mail|email|office|buero|büro|service|anfrage|anfragen|hallo|hello|post|team|solar|pv|elektro|firma)$/i,
  starkesPostfach: /info|kontakt|anfrage|buero|office/i,
  // Impressum und Kontaktseite sprechen für den Betrieb selbst.
  seitenRolle: (pfad: string) => /(?:^|\/)(?:impressum|imprint|kontakt|contact)(?:-\d+)?(?:\.html?|\.php)?\/?$/i.test(pfad) ? "betrieb" : null,
};

const FACHBETRIEB_SCOPE: ScopeRegeln = {
  // Wer auf einer Betriebsseite mit fremder Domain steht, ist meist Agentur oder Hersteller.
  fremdeBehoerde: /agentur|seo|marketing|webdesign|media|hosting|ionos|jimdo|wix|kammer|innung/,
  eigenbetrieb: /shop|store|karriere|jobs/,
  namensvarianten: /solar|elektro|energie|technik|gmbh|haustechnik|pv/,
  // Kleine Betriebe veröffentlichen ihr web.de- oder t-online-Postfach im
  // Impressum, oft auch nur auf der Startseite oder unter „Über uns".
  gratisPostfachAuf: () => true,
  verwandteDomain: (mailDomain: string, ownDomain: string) => {
    const eigen = new Set(unterscheidendeWoerter(ownDomain));
    return unterscheidendeWoerter(mailDomain).some(w => eigen.has(w));
  },
};

/**
 * The distinctive words of a domain: without the ending and without the words
 * every solar business carries — "solar" shared by two domains says nothing.
 */
export function unterscheidendeWoerter(domain: string): string[] {
  const allgemein = /^(?:solar|solaris|elektro|elektrotechnik|energie|energy|technik|tech|photovoltaik|pv|service|gmbh|haustechnik|team|info|online|dach|bau|systeme|system|group|gruppe|energietechnik|anlagen|solaranlagen|sonne|strom|power|home|smart|green|mail)$/;
  return domain.toLowerCase().split(".").slice(0, -1).join("-").split(/[^a-zäöüß]+/)
    .filter(w => w.length >= 4 && !allgemein.test(w));
}

type Zeile = { domain: string; firmenname: string | null; email: string | null; impressum_url: string | null; kontakt_url: string | null };

async function betriebe(): Promise<Zeile[]> {
  const url = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  const c = createClient(url, key, { auth: { persistSession: false } });
  const out: Zeile[] = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await c.from("fachbetriebe")
      .select("domain, firmenname, email, impressum_url, kontakt_url")
      .eq("art", "betrieb").order("domain").range(von, von + 999);
    if (error) throw new Error(error.message);
    out.push(...(data as Zeile[]));
    if (!data || data.length < 1000) return out;
  }
}

function ladeBestand(zeilen: Zeile[]): { bestand: Bestand; eintraege: Map<string, Eintrag> } {
  const eintraege = new Map<string, Eintrag>();
  for (const z of zeilen) {
    const offeneLinks = [z.impressum_url, z.kontakt_url].filter((u): u is string => !!u).map(u => ({ url: u, priority: 950 }));
    eintraege.set(z.domain, {
      id: z.domain, name: z.firmenname ?? z.domain, website: `https://${z.domain}/`,
      baseline: z.email ? [z.email.toLowerCase()] : [], verbund: null, gespeicherteSeiten: [], offeneLinks,
      eingabe: [z.email], zusatz: { alt: z.email },
    });
  }
  const bestand: Bestand = {
    name: "fachbetriebe-kontakte", out: OUT, rules: rulesVersion(), extraction: extractionVersion(),
    rollenwerk: FACHBETRIEB_ROLLENWERK, scope: FACHBETRIEB_SCOPE, linkProfil: "fachbetriebe",
    eintraege: () => [...eintraege.values()],
    // Eine belegte Adresse genügt; beim Handwerksbetrieb IST das Postfach der Kontakt.
    fertigWenn: (r: Ergebnis) => r.selected.length > 0,
    linkVorrang: (u: string, grundwert: number) =>
      /impressum|imprint/i.test(u) ? 900 : /kontakt|contact/i.test(u) ? 600 : grundwert,
  };
  return { bestand, eintraege };
}

function summary(bestand: Bestand, anzahl: number) {
  const dir = resolve(OUT, "results");
  const rows = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".json")).map(f => readJson(resolve(dir, f))) as Ergebnis[] : [];
  const neu = kontaktFuer;
  const mitAlt = rows.filter(r => r.alt), ohneAlt = rows.filter(r => !r.alt);
  const out = {
    observedAt: new Date().toISOString(), rules: bestand.rules, betriebe: anzahl, bewertet: rows.length,
    mitAlterAdresse: {
      n: mitAlt.length,
      gleich: mitAlt.filter(r => neu(r) === String(r.alt).toLowerCase()).length,
      andere: mitAlt.filter(r => neu(r) && neu(r) !== String(r.alt).toLowerCase()).length,
      verloren: mitAlt.filter(r => !neu(r)).length,
    },
    ohneAlteAdresse: { n: ohneAlt.length, gefunden: ohneAlt.filter(r => neu(r)).length },
    seitenGelesen: rows.reduce((n, r) => n + r.pages.read, 0),
  };
  writeJson(resolve(OUT, "summary.json"), out);
  console.log(JSON.stringify(out, null, 1));
}

/**
 * The mailbox to use for a business: its general mailbox first (that is where a
 * craft business answers), otherwise the proven person. A large organisation's
 * imprint names many people; picking the first of them would pick at random.
 */
export const kontaktFuer = (r: Pick<Ergebnis, "general" | "kanaele" | "id">): string | null => {
  const kandidaten = [...r.general, ...(r.kanaele.betrieb ?? [])];
  const site = r.id.split(".").slice(-2).join(".");
  // A mailbox on the business's own domain beats one on a related domain.
  return kandidaten.find(m => (m.split("@")[1] ?? "").endsWith(site)) ?? kandidaten[0] ?? null;
};

async function apply() {
  const schreiben = process.argv.includes("--schreiben");
  const url = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  const c = createClient(url, key, { auth: { persistSession: false } });
  const dir = resolve(OUT, "results");
  const rows = readdirSync(dir).filter(f => f.endsWith(".json")).map(f => readJson(resolve(dir, f))) as Ergebnis[];
  const stale = rows.filter(r => r.rules !== rulesVersion()).length;
  if (stale) throw new Error(`${stale} Ergebnisse stammen aus älteren Regeln — erst neu auswerten`);
  if (schreiben) {
    const { error } = await c.rpc("exec_sql", { sql: `
      ALTER TABLE fachbetriebe ADD COLUMN IF NOT EXISTS kontakt_email_belegt text;
      ALTER TABLE fachbetriebe ADD COLUMN IF NOT EXISTS kontakt_beleg_url text;
      ALTER TABLE fachbetriebe ADD COLUMN IF NOT EXISTS kontakt_geprueft_am date;
      NOTIFY pgrst, 'reload schema';` });
    if (error) throw new Error(error.message);
    await new Promise(r => setTimeout(r, 3000));
  }
  // A mail domain without a mail server is a mis-read address, not a contact:
  // text glued onto the domain ("…@techo-energy.demehr") passed every other check.
  const mx = new Map<string, boolean>();
  const domains = [...new Set(rows.map(kontaktFuer).filter((m): m is string => !!m).map(m => m.split("@")[1]))];
  for (let i = 0; i < domains.length; i += 20) {
    await Promise.all(domains.slice(i, i + 20).map(async d => {
      try { mx.set(d, (await resolveMx(d)).length > 0); } catch { mx.set(d, false); }
    }));
  }
  let belegt = 0, aufgefuellt = 0, geschrieben = 0;
  const ohneMailserver: string[] = [];
  for (const r of rows) {
    const mail = kontaktFuer(r);
    if (!mail) continue;
    if (!mx.get(mail.split("@")[1])) { ohneMailserver.push(`${r.id}: ${mail}`); continue; }
    if (!r.proofs.some(p => p.email === mail) && !r.fundstellen?.[mail]) throw new Error(`${r.id}: ${mail} ohne Fundstelle`);
    belegt++;
    const leer = !r.alt;
    if (leer) aufgefuellt++;
    if (!schreiben) continue;
    const beleg = r.proofs.find(p => p.email === mail)?.url ?? r.fundstellen?.[mail] ?? null;
    // One row at a time: a batch upsert would give every row the same column set.
    const { error } = await c.from("fachbetriebe").update({
      kontakt_email_belegt: mail, kontakt_beleg_url: beleg, kontakt_geprueft_am: r.evaluatedAt.slice(0, 10),
      ...(leer ? { email: mail } : {}),
    }).eq("domain", r.id);
    if (error) throw new Error(`${r.id}: ${error.message}`);
    geschrieben++;
  }
  console.log(JSON.stringify({ schreiben, ergebnisse: rows.length, belegt, leereAdresseAufgefuellt: aufgefuellt, geschrieben, ohneMailserver: ohneMailserver.length }));
  for (const z of ohneMailserver) console.log(`  ohne Mailserver verworfen: ${z}`);
}

async function main() {
  if (mode === "apply") return apply();
  const zeilen = await betriebe();
  const { bestand, eintraege } = ladeBestand(zeilen);
  if (mode === "summary") return summary(bestand, eintraege.size);
  let rows = [...eintraege.values()];
  const ids = arg("ids")?.split(",");
  if (ids) { const wanted = new Set(ids); rows = rows.filter(r => wanted.has(r.id)); }
  const n = Number(arg("stichprobe") ?? 0);
  if (n) {
    // Jeder siebte in alphabetischer Folge: reproduzierbar, über das Alphabet gestreut.
    const jederX = (liste: Eintrag[]) => liste.filter((_, i) => i % 7 === 3).slice(0, n);
    rows = [...jederX(rows.filter(r => r.baseline.length)), ...jederX(rows.filter(r => !r.baseline.length))];
  }
  const parts = Number(arg("parts") ?? 1), part = Number(arg("part") ?? 0);
  rows = rows.filter((_, i) => i % parts === part);
  if (mode === "browser") {
    // Only entries the plain fetch left without any contact.
    rows = rows.filter(e => !kontaktFuer(bewerten(bestand, e)));
    console.log(`${rows.length} Betriebe ohne Kontakt · Browser-Durchgang`);
    try {
      for (const e of rows) {
        const r = await rendern(bestand, e);
        const neu = kontaktFuer(bewerten(bestand, e));
        console.log(e.id, JSON.stringify({ gelesen: r.gelesen.length, fehler: r.fehler, kontakt: neu }));
      }
    } finally { await browserSchliessen(); }
    return;
  }
  console.log(`${rows.length} Betriebe · Modus ${mode}`);
  await laufen(bestand, rows, async e => {
    const r = mode === "research" ? await recherchieren(bestand, e, BUDGET) : bewerten(bestand, e);
    console.log(e.id, JSON.stringify(mode === "research" ? r : { outcome: (r as Ergebnis).outcome }));
  }, `${mode}-${part}`);
}

if (process.argv[1]?.endsWith("fachbetriebe-kontakte.ts")) main().catch(error => { console.error(error); process.exit(1); });
