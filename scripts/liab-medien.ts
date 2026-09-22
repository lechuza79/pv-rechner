/**
 * Kontakterfassung für die Medien-Zielliste von Life is a Binge — zweiter
 * Bestand auf demselben Ablauf wie die Gemeinden (scripts/lib/kontakt-lauf.ts).
 *
 * Neu ist hier nur dreierlei: welche Rollen gesucht werden (Redaktion und
 * Kooperationen statt Klimaschutz und Presse), was als eigene Domain gilt, und
 * woher die Einträge kommen (eine Zielliste als CSV statt des Melderegisters).
 *
 *   --mode=evaluate   offline über bereits geholte Seiten
 *   --mode=research   begrenzte Abrufe je Ziel (Standard-Budget 12)
 *   --mode=summary    Zahlen über alle Ergebnisse
 *   --mode=export     Ergebnis als CSV (Kontakte je Ziel mit Beleg)
 *
 * Gemeinsam: --ziele=DATEI (CSV: domain,name,kategorie) --out=DIR
 *            --ids=A,B | --part=i --parts=n · research: --budget=12
 *
 * Es wird nichts verschickt und nichts in einer Datenbank verändert.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Rollenwerk, ScopeRegeln } from "../lib/kontakt-suche";
import {
  bewerten, laufen, readJson, recherchieren, writeJson,
  type Bestand, type Eintrag, type Ergebnis,
} from "./lib/kontakt-lauf";
import { MAIN_CHECKOUT, extractionVersion, rulesVersion } from "./lib/contact-v2-config";

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const OUT = resolve(arg("out") ?? resolve(MAIN_CHECKOUT, "scripts/.cache/liab-medien"));
const ZIELE = resolve(arg("ziele") ?? resolve(OUT, "ziele.csv"));
const mode = arg("mode") ?? "evaluate";
const BUDGET = Number(arg("budget") ?? 12);

/**
 * Wer bei einem Blog, einem Magazin oder einem Podcast angesprochen werden
 * kann. Anders als bei Gemeinden trägt hier das Impressum die Rolle: Ein
 * redaktionelles Angebot MUSS eine verantwortliche Person mit Namen nennen
 * (§ 18 Abs. 2 MStV), und genau diese Person entscheidet bei kleinen Seiten
 * auch über Kooperationen.
 */
export const MEDIEN_ROLLENWERK: Rollenwerk = {
  rollen: [
    {
      kanal: "redaktion",
      text: /redaktion(?:sleitung)?|chefredaktion|herausgeber\w*|verantwortlich(?:e[rn]?)? (?:für (?:den )?(?:inhalt|content)|i\.?\s?s\.?\s?d\.?\s?p)|redakteur\w*|autor(?:in)?\b|gründer\w*|inhaber\w*|betreiber\w*|host\b/iu,
      heading: /^(?:redaktion|chefredaktion|herausgeber|impressum|über (?:mich|uns)|team|autor(?:en|innen)?|kontakt)$/iu,
    },
    {
      kanal: "kooperation",
      text: /kooperation\w*|zusammenarbeit|mediadaten|werbung|anzeigen|presseanfragen|pressekontakt|partneranfragen|rezensionsexemplar\w*|belegexemplar\w*/iu,
      heading: /^(?:kooperationen?|werbung|mediadaten|presse|pressekontakt|partner)$/iu,
    },
  ],
  eigenerTitel: /chefredaktion|redaktionsleitung|herausgeber\w*|verantwortlich\w*|gründer\w*|inhaber\w*|betreiber\w*|host\b/iu,
  // Wer die Seite technisch betreut oder dort Recht vertritt, ist nicht die Redaktion.
  ausgeschlossen: /datenschutzbeauftrag|technische umsetzung|webdesign|webhosting|hosting durch|agentur für|rechtsanwalt|kanzlei|streitschlichtung|verbraucherschlichtung/iu,
  // Bereiche, die auf denselben Seiten stehen, aber nicht die Redaktion sind.
  fremdeEinheit: /shop|versand|abo-?service|leserservice|buchhaltung|rechnungswesen|ticket|kasse|technik-?support/iu,
  allgemein: /^(info|kontakt|contact|mail|email|office|hallo|hello|moin|post|admin|webmaster|team)$/i,
  starkesPostfach: /redaktion|presse|kooperation|kontakt|blog|podcast/i,
  // Impressum und Kontaktseite eines redaktionellen Angebots tragen die
  // verantwortliche Person — bei kleinen Blogs ist das dieselbe, die auch über
  // eine Zusammenarbeit entscheidet.
  seitenRolle: (pfad: string) => /(?:^|\/)(?:impressum|imprint|kontakt|contact|ueber-?(?:mich|uns)|about|team|redaktion)(?:-\d+)?\/?$/i.test(pfad) ? "redaktion" : null,
};

export const MEDIEN_SCOPE: ScopeRegeln = {
  // Verlags- und Vermarkterdomains gehören nicht dem Blog, das wir anschreiben.
  fremdeBehoerde: /verlag|mediengruppe|vermarkt|networ|agentur/,
  // Shop- und Forenableger sind nicht die Redaktion.
  eigenbetrieb: /shop|store|fanshop|merch/,
  namensvarianten: /magazin|blog|online|podcast|de|www/,
};

type Ziel = { domain: string; name: string; kategorie: string };
function ziele(): Ziel[] {
  const zeilen = readFileSync(ZIELE, "utf8").split(/\r?\n/).filter(Boolean);
  const kopf = zeilen.shift()!.split(",").map(s => s.trim());
  const idx = (n: string) => kopf.indexOf(n);
  return zeilen.map(z => {
    const f = z.split(",");
    return { domain: (f[idx("domain")] ?? "").trim().toLowerCase(), name: (f[idx("name")] ?? "").trim(), kategorie: (f[idx("kategorie")] ?? "").trim() };
  }).filter(z => z.domain);
}

function ladeBestand(): { bestand: Bestand; eintraege: Map<string, Eintrag> } {
  const eintraege = new Map<string, Eintrag>();
  for (const z of ziele()) {
    eintraege.set(z.domain, {
      id: z.domain, name: z.name || z.domain, website: `https://${z.domain}/`,
      baseline: [], verbund: null, gespeicherteSeiten: [],
      eingabe: [z.kategorie], zusatz: { kategorie: z.kategorie },
    });
  }
  const bestand: Bestand = {
    name: "liab-medien", out: OUT, rules: rulesVersion(), extraction: extractionVersion(),
    rollenwerk: MEDIEN_ROLLENWERK, scope: MEDIEN_SCOPE, linkProfil: "kommunen",
    eintraege: () => [...eintraege.values()],
    // Eine Adresse für die Redaktion genügt; Kooperationen sind ein Bonus.
    fertigWenn: (r: Ergebnis) => (r.kanaele.redaktion?.length ?? 0) > 0,
    // Gemessen am ersten Lauf: 116 von 251 Zielen ohne Kontakt hatten ihr
    // Impressum nie geholt — die Grundwertung schickt den Lauf zuerst in
    // Ansprechpartner-Verzeichnisse, die es bei Blogs nicht gibt.
    linkVorrang: (url: string, grundwert: number) =>
      /impressum|imprint|legal-?notice/i.test(url) ? 900
      : /kontakt|contact|ueber-?(?:mich|uns)|about|team|redaktion|mediadaten|kooperation/i.test(url) ? 400
      : grundwert,
  };
  return { bestand, eintraege };
}

function summary(bestand: Bestand, anzahl: number) {
  const dir = resolve(OUT, "results");
  const rows = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".json")).map(f => readJson(resolve(dir, f))) as Ergebnis[] : [];
  const out = {
    observedAt: new Date().toISOString(), rules: bestand.rules, ziele: anzahl, bewertet: rows.length,
    mitRedaktion: rows.filter(r => (r.kanaele.redaktion?.length ?? 0) > 0).length,
    mitKooperation: rows.filter(r => (r.kanaele.kooperation?.length ?? 0) > 0).length,
    nurAllgemein: rows.filter(r => !(r.kanaele.redaktion?.length || r.kanaele.kooperation?.length) && r.general.length > 0).length,
    ohneKontakt: rows.filter(r => !r.selected.length).length,
    seitenGelesen: rows.reduce((n, r) => n + r.pages.read, 0),
    nachKategorie: rows.reduce((a: Record<string, number>, r) => { const k = String(r.kategorie ?? "?"); a[k] = (a[k] ?? 0) + 1; return a; }, {}),
  };
  writeJson(resolve(OUT, "summary.json"), out);
  console.log(JSON.stringify(out, null, 1));
}

/**
 * Gibt es einen Kontaktweg ohne Adresse? Ein Formular IST einer — dieselbe
 * Lehre wie bei den Gemeinden; ohne diese Spalte sähe ein Ziel ohne Adresse
 * aus wie ein Ziel ohne Weg.
 */
function kontaktweg(id: string): "adresse" | "formular" | "keiner" {
  const dir = resolve(OUT, "sources", id);
  if (!existsSync(dir)) return "keiner";
  for (const f of readdirSync(dir).filter(f => f.endsWith(".html")).slice(0, 6)) {
    const html = readFileSync(resolve(dir, f), "utf8");
    if (/<form[^>]*>[\s\S]{0,4000}?(?:nachricht|message|betreff|subject|kontakt)/i.test(html)) return "formular";
  }
  return "keiner";
}

/** Ergebnis als Tabelle: je Ziel die Kontakte mit ihrer Belegseite. */
function exportCsv() {
  const dir = resolve(OUT, "results");
  const rows = readdirSync(dir).filter(f => f.endsWith(".json")).map(f => readJson(resolve(dir, f))) as Ergebnis[];
  const q = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const zeilen = [["domain", "name", "kategorie", "kanal", "email", "beleg_url", "beleg_text", "stand", "kontaktweg"].join(",")];
  for (const r of rows.sort((a, b) => a.id.localeCompare(b.id))) {
    const proofs = new Map(r.proofs.map(p => [p.email, p]));
    const kontakte: [string, string][] = [
      ...(r.kanaele.redaktion ?? []).map(e => ["redaktion", e] as [string, string]),
      ...(r.kanaele.kooperation ?? []).map(e => ["kooperation", e] as [string, string]),
      ...r.general.map(e => ["allgemein", e] as [string, string]),
    ];
    if (!kontakte.length) zeilen.push([r.id, r.name, String(r.kategorie ?? ""), "", "", "", "", r.evaluatedAt.slice(0, 10), kontaktweg(r.id)].map(q).join(","));
    for (const [kanal, email] of kontakte) {
      const p = proofs.get(email);
      zeilen.push([r.id, r.name, String(r.kategorie ?? ""), kanal, email, p?.url ?? "", (p?.block ?? "").slice(0, 200), r.evaluatedAt.slice(0, 10), "adresse"].map(q).join(","));
    }
  }
  const pfad = resolve(OUT, "kontakte.csv");
  writeFileSync(pfad, zeilen.join("\n") + "\n");
  console.log(`${zeilen.length - 1} Zeilen geschrieben: ${pfad}`);
}

async function main() {
  const { bestand, eintraege } = ladeBestand();
  if (mode === "summary") return summary(bestand, eintraege.size);
  if (mode === "export") return exportCsv();
  let rows = [...eintraege.values()];
  const ids = arg("ids")?.split(",");
  if (ids) { const wanted = new Set(ids); rows = rows.filter(r => wanted.has(r.id)); }
  const parts = Number(arg("parts") ?? 1), part = Number(arg("part") ?? 0);
  rows = rows.filter((_, i) => i % parts === part);
  console.log(`${rows.length} Ziele · Modus ${mode}`);
  await laufen(bestand, rows, async e => {
    const r = mode === "research" ? await recherchieren(bestand, e, BUDGET) : bewerten(bestand, e);
    const g = mode === "research" ? r as any : { outcome: (r as Ergebnis).outcome };
    console.log(e.id, JSON.stringify(g));
  }, `${mode}-${part}`);
}

if (process.argv[1]?.endsWith("liab-medien.ts")) main().catch(error => { console.error(error); process.exit(1); });
