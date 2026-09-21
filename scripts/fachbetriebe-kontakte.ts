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
 *
 * Gemeinsam: --ids=A,B | --stichprobe=N (je N mit und ohne bekannte Adresse)
 *            --part=i --parts=n --out=DIR · research: --budget=8
 *
 * Es wird nichts verschickt und nichts in der Datenbank verändert: Ob Betriebe
 * angeschrieben werden, ist nicht entschieden.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Rollenwerk, ScopeRegeln } from "../lib/kontakt-suche";
import {
  bewerten, laufen, readJson, recherchieren, writeJson,
  type Bestand, type Eintrag, type Ergebnis,
} from "./lib/kontakt-lauf";
import { MAIN_CHECKOUT, extractionVersion, rulesVersion } from "./lib/contact-v2-config";

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
  // Kleine Betriebe veröffentlichen ihr web.de- oder t-online-Postfach im Impressum.
  eigeneAdresseAuf: (pfad: string) => /(?:^|\/)(?:impressum|imprint|kontakt|contact)(?:-\d+)?(?:\.html?|\.php)?\/?$/i.test(pfad),
};

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
  const neu = (r: Ergebnis) => r.kanaele.betrieb?.[0] ?? r.general[0] ?? null;
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

async function main() {
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
  console.log(`${rows.length} Betriebe · Modus ${mode}`);
  await laufen(bestand, rows, async e => {
    const r = mode === "research" ? await recherchieren(bestand, e, BUDGET) : bewerten(bestand, e);
    console.log(e.id, JSON.stringify(mode === "research" ? r : { outcome: (r as Ergebnis).outcome }));
  }, `${mode}-${part}`);
}

if (process.argv[1]?.endsWith("fachbetriebe-kontakte.ts")) main().catch(error => { console.error(error); process.exit(1); });
