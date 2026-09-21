/**
 * Wirkung der Ansprache messen — über alle Bestände, getaktet nach dem Versand.
 *
 *   npm run wirkung              # was ist fällig? (Probelauf, kostet nichts)
 *   npm run wirkung -- --schreiben
 *   npm run wirkung -- --bericht # nur ausgeben, was schon gemessen wurde
 *
 * Gemessen wird 3, 7, 14 und 28 Tage nach jedem Versandtag. Ist kein Messpunkt
 * fällig, wird nichts abgerufen und nichts bezahlt. Eine einmal gemessene Zahl
 * bleibt stehen — sie ist die Aussage über DIESEN Tag.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MAIN_CHECKOUT } from "./lib/contact-v2-config";
import {
  MESSPUNKTE, WIRKUNG_DDL, WIRKUNG_UNSICHTBAR, faelligeMesspunkte, kostenHinweis, nachtraeglich,
  type Bestand,
} from "../lib/outreach-wirkung";
import { heuteInBerlin } from "../lib/zeit";
import { domainAus, verlinkendeDomains } from "./lib/verweise";

const schreiben = process.argv.includes("--schreiben");
const nurBericht = process.argv.includes("--bericht");

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

type Client = Awaited<ReturnType<typeof db>>;
/** `id` trägt bei Kommunen den Gemeindeschlüssel — für die Abo-Zählung. */
type Angeschrieben = { domain: string | null; id?: string; versandTag: string; geantwortet: boolean };

/**
 * Wer wurde wann angeschrieben, und hat er geantwortet?
 *
 * Jeder Bestand führt das anders, weil er zu anderer Zeit gebaut wurde. Diese
 * Funktion ist die einzige Stelle, die das weiß — die Messung darunter kennt
 * nur noch Domains und Tage.
 */
async function angeschriebene(bestand: Bestand, client: Client): Promise<Angeschrieben[]> {
  const seiten = async <T>(tabelle: string, spalten: string, filter: (q: any) => any): Promise<T[]> => {
    const out: T[] = [];
    for (let von = 0; ; von += 1000) {
      const { data, error } = await filter(client.from(tabelle).select(spalten)).range(von, von + 999);
      if (error) throw new Error(`${tabelle}: ${error.message}`);
      out.push(...((data ?? []) as T[]));
      if (!data || data.length < 1000) return out;
    }
  };
  switch (bestand) {
    case "kommunen": {
      const rows = await seiten<{ region_id: string; website: string | null; contacted_at: string; responded_at: string | null }>(
        "kommunen_kontakt", "region_id, website, contacted_at, responded_at", q => q.not("contacted_at", "is", null));
      return rows.map(r => ({ domain: domainAus(r.website), id: r.region_id, versandTag: r.contacted_at.slice(0, 10), geantwortet: !!r.responded_at }));
    }
    // No send path exists for these yet. `fachbetriebe.kontakt_at` is the day the
    // contact page was CRAWLED, not a send: reading it as one reported 1,260
    // "contacted" trades that nobody ever wrote to. Whoever builds a send path
    // writes a send timestamp and wires it in here.
    case "fachbetriebe":
    case "presse":
    case "versorger":
      return [];
  }
}

/** Die Domains, die uns verlinken — ein Abruf für alle Bestände zusammen. */
async function verlinkendeSet(): Promise<Set<string>> {
  const login = env("DATAFORSEO_LOGIN"), pass = env("DATAFORSEO_PASSWORD");
  if (!login || !pass) throw new Error("DataForSEO-Zugang fehlt");
  const { domains, kosten } = await verlinkendeDomains(login, pass);
  console.log(`  Verweise abgerufen · ${kosten.toFixed(3)} $`);
  return new Set(domains.keys());
}

async function main() {
  const client = await db();
  if (process.argv.includes("--setup")) {
    const { error } = await client.rpc("exec_sql", { sql: WIRKUNG_DDL });
    if (error) throw new Error(error.message);
  }
  const heute = heuteInBerlin();

  if (nurBericht) {
    const { data } = await client.from("outreach_wirkung").select("*").order("versand_am").order("tage");
    for (const m of data ?? []) {
      const spaet = nachtraeglich(m.versand_am, m.tage, m.gemessen_am) ? `  (nachgemessen am ${m.gemessen_am})` : "";
      console.log(`${m.bestand} · Versand ${m.versand_am} · Tag ${String(m.tage).padStart(2)}: ${m.angeschrieben} angeschrieben · ${m.geantwortet} geantwortet · ${m.verlinkt} verlinken uns · ${m.angemeldet} angemeldet${spaet}`);
    }
    console.log(WIRKUNG_UNSICHTBAR);
    return;
  }

  // Erst sehen, was fällig ist — ein Abruf passiert nur dann.
  const { data: schon } = await client.from("outreach_wirkung").select("bestand, versand_am, tage");
  const gemessen = new Map<string, number[]>();
  for (const z of schon ?? []) {
    const k = `${z.bestand}|${z.versand_am}`;
    gemessen.set(k, [...(gemessen.get(k) ?? []), z.tage]);
  }

  const bestaende: Bestand[] = ["kommunen", "fachbetriebe", "versorger", "presse"];
  const arbeit: { bestand: Bestand; versandTag: string; tage: number[]; zeilen: Angeschrieben[] }[] = [];
  for (const b of bestaende) {
    const rows = await angeschriebene(b, client);
    const proTag = new Map<string, Angeschrieben[]>();
    for (const r of rows) proTag.set(r.versandTag, [...(proTag.get(r.versandTag) ?? []), r]);
    for (const [tag, zeilen] of proTag) {
      const faellig = faelligeMesspunkte(tag, heute, gemessen.get(`${b}|${tag}`) ?? []);
      if (faellig.length) arbeit.push({ bestand: b, versandTag: tag, tage: faellig, zeilen });
    }
  }

  const messpunkte = arbeit.reduce((n, a) => n + a.tage.length, 0);
  console.log(`${arbeit.length} Versandtage mit fälligen Messpunkten · ${kostenHinweis(messpunkte)}`);
  for (const a of arbeit) console.log(`  ${a.bestand} · ${a.versandTag} · Tage ${a.tage.join(", ")} · ${a.zeilen.length} Ziele`);
  if (!messpunkte) return;
  if (!schreiben) return console.log("Probelauf — nichts abgerufen, nichts geschrieben. Mit --schreiben messen.");

  // Ohne Verweis-Abruf wird NICHT gemessen. Eine Zeile mit "0 verlinken uns"
  // wäre keine vorsichtige Schätzung, sondern eine falsche Zahl, die nie wieder
  // angefasst wird — der Messpunkt bleibt lieber offen und kommt morgen wieder.
  if (!env("DATAFORSEO_LOGIN") || !env("DATAFORSEO_PASSWORD")) {
    console.error("DataForSEO-Zugang fehlt — nicht gemessen. Ein Messpunkt ohne Verweis-Abruf wäre eine erfundene Null.");
    process.exit(1);
  }
  const verlinken = await verlinkendeSet();
  // Abo-Anmeldungen zählen nur bei Kommunen: die anderen Bestände haben keins.
  const { data: abos } = await client.from("gemeinde_abos").select("region_id").eq("status", "bestaetigt");
  const aboOrte = new Set((abos ?? []).map((a: any) => a.region_id));

  for (const a of arbeit) {
    for (const tage of a.tage) {
      const zeile = {
        bestand: a.bestand,
        versand_am: a.versandTag,
        tage,
        angeschrieben: a.zeilen.length,
        geantwortet: a.zeilen.filter(z => z.geantwortet).length,
        verlinkt: a.zeilen.filter(z => z.domain && verlinken.has(z.domain)).length,
        // Nur Kommunen haben ein Abo; gezählt wird die Gemeinde, nicht die Adresse.
        angemeldet: a.zeilen.filter(z => z.id && aboOrte.has(z.id)).length,
        gemessen_am: heute,
      };
      const { error } = await client.from("outreach_wirkung").upsert(zeile, { onConflict: "bestand,versand_am,tage" });
      if (error) throw new Error(error.message);
      console.log(`✓ ${a.bestand} ${a.versandTag} Tag ${tage}: ${zeile.angeschrieben} angeschrieben · ${zeile.geantwortet} geantwortet · ${zeile.verlinkt} verlinken uns`);
    }
  }
  console.log(WIRKUNG_UNSICHTBAR);
}

main().catch(e => { console.error(e.message ?? e); process.exit(1); });

export { MESSPUNKTE };
