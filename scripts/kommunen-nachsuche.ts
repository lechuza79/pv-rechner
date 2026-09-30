/**
 * Follow-up contact search for municipalities that still have NO address.
 *
 * Same engine as every other stock (scripts/lib/kontakt-lauf.ts), same
 * follow-up rules as the districts (scripts/lib/kontakt-nachsuche.ts), the
 * municipal role set. Its own working directory, so the main municipal results
 * — and the rules fingerprint the letter send checks — stay untouched.
 *
 *   --mode=suche      pages worth reading first (sitemap, site search)
 *   --mode=research   read them (budget 15 pages)
 *   --mode=summary    counts
 *   --mode=apply      fill only empty rows (--schreiben)
 *
 * Gemeinsam: --ids=A,B | --land=06,07 | --part=i --parts=n
 *
 * Anlass (30.09.2026): after carrying the proven general mailboxes over,
 * 2,018 municipalities with a website still had no address at all. Nothing is
 * sent from here.
 */
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { KOMMUNEN_ROLLENWERK, KOMMUNEN_SCOPE } from "../lib/contact-municipal-judge";
import { fachkontakteAus } from "../lib/kommunen-fachkontakt";
import { postfachTauglich } from "../lib/kontakt-tauglichkeit";
import { bewerten, laufen, readJson, recherchieren, writeJson, type Bestand, type Eintrag, type Ergebnis } from "./lib/kontakt-lauf";
import { GEMEINDE, KLIMA_POSTFACH, PRESSE_POSTFACH, postfachNachName, vormerken, type Vormerkung } from "./lib/kontakt-nachsuche";
import { MAIN_CHECKOUT, extractionVersion, rulesVersion } from "./lib/contact-v2-config";

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const OUT = resolve(arg("out") ?? resolve(MAIN_CHECKOUT, "scripts/.cache/kommunen-nachsuche"));
const mode = arg("mode") ?? "research";
const schreiben = process.argv.includes("--schreiben");
const SEEDS = resolve(OUT, "seeds.json");
const ZIEL = /impressum|kontakt|rathaus|verwaltung|buergerservice|bürgerservice|buergerbuero|bürgerbüro|ansprechpartner|presse|klimaschutz/i;
const ALLGEMEIN_POSTFACH = /^(?:ortsgemeinde|ortsbuergermeister|og|vg[a-z-]*|verbandsgemeinde|gemeinde|rathaus|info|poststelle|stadt|stadtverwaltung|verwaltung|buergerbuero|buergerservice|kontakt|post|amt|vg|markt|marktgemeinde|zentrale)[@.-]/;

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
const H = { apikey: key ?? "", Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const LEER = "klima_email=is.null&presse_kontakt_email=is.null&presse_email=is.null&email=is.null&rollen_email=is.null&website=not.is.null";

type Zeile = { region_id: string; website: string; mastr_regions: { name: string } | null };

async function ohneAdresse(): Promise<Zeile[]> {
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const out: Zeile[] = [];
  for (let o = 0; ; o += 1000) {
    const r = await fetch(`${url}/rest/v1/kommunen_kontakt?select=region_id,website,mastr_regions(name)&region_id=like.________&${LEER}&order=region_id`, { headers: { ...H, Range: `${o}-${o + 999}` } });
    const d = (await r.json()) as Zeile[];
    out.push(...d);
    if (d.length < 1000) return out;
  }
}

const seeds = (): Record<string, Vormerkung[]> => existsSync(SEEDS) ? readJson(SEEDS) : {};

function bestandAus(zeilen: Zeile[]): { bestand: Bestand; eintraege: Eintrag[] } {
  const s = seeds();
  const eintraege: Eintrag[] = zeilen.map(z => ({
    id: z.region_id, name: z.mastr_regions?.name ?? z.region_id,
    website: /^https?:\/\//.test(z.website) ? z.website : `https://${z.website}`,
    baseline: [], verbund: null, gespeicherteSeiten: [], eingabe: [], offeneLinks: s[z.region_id] ?? [],
  }));
  const bestand: Bestand = {
    name: "kommunen-nachsuche", out: OUT, rules: rulesVersion(), extraction: extractionVersion(),
    rollenwerk: KOMMUNEN_ROLLENWERK, scope: KOMMUNEN_SCOPE, linkProfil: "kommunen",
    eintraege: () => eintraege,
    ergebnisForm: (basis: Ergebnis) => ({ energy: basis.kanaele.energy ?? [], press: basis.kanaele.press ?? [] }),
    fertigWenn: (r: Ergebnis) => (r.kanaele.energy?.length ?? 0) > 0 && (r.kanaele.press?.length ?? 0) > 0,
  };
  return { bestand, eintraege };
}

/** What the follow-up found for one municipality, best first. */
function fundFuer(r: any): { spalte: "klima" | "presse" | "allgemein"; email: string; beleg: string | null; herkunft: string } | null {
  const k = fachkontakteAus(r);
  if (k.klima) return { spalte: "klima", email: k.klima.email, beleg: k.klima.belegUrl, herkunft: "nachsuche-beleg" };
  if (k.presse) return { spalte: "presse", email: k.presse.email, beleg: k.presse.belegUrl, herkunft: "nachsuche-beleg" };
  const quellen = resolve(OUT, "sources", r.id);
  const kp = postfachNachName(quellen, r.website, GEMEINDE, KLIMA_POSTFACH);
  if (kp && postfachTauglich(kp.email).ok) return { spalte: "klima", email: kp.email, beleg: kp.url, herkunft: "postfachname" };
  const pp = postfachNachName(quellen, r.website, GEMEINDE, PRESSE_POSTFACH);
  if (pp && postfachTauglich(pp.email).ok) return { spalte: "presse", email: pp.email, beleg: pp.url, herkunft: "postfachname" };
  const sel = (r.selected ?? []).find((m: string) => postfachTauglich(m).ok);
  if (sel) return { spalte: "allgemein", email: sel, beleg: r.fundstellen?.[sel] ?? null, herkunft: "kontaktsuche-nachsuche" };
  const token = new URL(r.website).hostname.replace(/^www\./, "").split(".")[0].replace(/^(?:gemeinde|stadt|markt|vg|verbandsgemeinde|samtgemeinde|amt)-?/, "").replace(/[^a-z0-9]/g, "");
  const ap = postfachNachName(quellen, r.website, GEMEINDE, ALLGEMEIN_POSTFACH)
    ?? postfachNachName(quellen, r.website, GEMEINDE, new RegExp(`^(?:og\\.?)?${token}@`));
  if (ap && postfachTauglich(ap.email).ok) return { spalte: "allgemein", email: ap.email, beleg: ap.url, herkunft: "postfachname" };
  return null;
}

function ergebnisse(): any[] {
  const dir = resolve(OUT, "results");
  return existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".json")).map(f => readJson(resolve(dir, f))) : [];
}

async function apply() {
  const zaehler = { klima: 0, presse: 0, allgemein: 0, nichts: 0, geschrieben: 0 };
  for (const r of ergebnisse()) {
    const f = fundFuer(r);
    if (!f) { zaehler.nichts++; continue; }
    zaehler[f.spalte]++;
    if (!schreiben) continue;
    const felder = f.spalte === "klima" ? { klima_email: f.email, klima_beleg_url: f.beleg }
      : f.spalte === "presse" ? { presse_email: f.email, presse_email_quelle: f.herkunft, presse_beleg: f.beleg }
      : { rollen_email: f.email, rollen_email_quelle: f.herkunft };
    // Only rows that are still empty: never overwrite an address someone else set meanwhile.
    const res = await fetch(`${url}/rest/v1/kommunen_kontakt?region_id=eq.${r.id}&${LEER}`, { method: "PATCH", headers: H, body: JSON.stringify(felder) });
    if (!res.ok) throw new Error(`${r.id}: HTTP ${res.status}`);
    zaehler.geschrieben++;
  }
  console.log(JSON.stringify({ schreiben, ...zaehler }));
}

async function main() {
  if (mode === "apply") return apply();
  let zeilen = await ohneAdresse();
  const land = arg("land")?.split(",");
  if (land) zeilen = zeilen.filter(z => land.includes(z.region_id.slice(0, 2)));
  const ids = arg("ids")?.split(",");
  if (ids) zeilen = zeilen.filter(z => ids.includes(z.region_id));
  const { bestand, eintraege } = bestandAus(zeilen);
  if (mode === "summary") {
    const rows = ergebnisse(); const f = rows.map(fundFuer);
    return console.log(JSON.stringify({ ohneAdresse: zeilen.length, bewertet: rows.length, mitFund: f.filter(Boolean).length }));
  }
  const parts = Number(arg("parts") ?? 1), part = Number(arg("part") ?? 0);
  const rows = eintraege.filter((_, i) => i % parts === part);
  if (mode === "suche") {
    const alle = seeds();
    for (const e of rows) {
      if (alle[e.id]) continue;
      alle[e.id] = await vormerken(e.website!, ZIEL, ["Impressum", "Kontakt"], /impressum|kontakt|rathaus/i);
      writeJson(SEEDS, alle);
    }
    return console.log(`${rows.length} Gemeinden vorgemerkt`);
  }
  console.log(`${rows.length} Gemeinden ohne Adresse · Modus ${mode}`);
  await laufen(bestand, rows, async e => {
    if (mode === "research") await recherchieren(bestand, e, Number(arg("budget") ?? 15)); else bewerten(bestand, e);
  }, `${mode}-${part}`);
}

if (process.argv[1]?.endsWith("kommunen-nachsuche.ts")) main().catch(e => { console.error(e); process.exit(1); });
