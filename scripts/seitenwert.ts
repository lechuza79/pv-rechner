/**
 * Seitenwerte holen und ablegen — Rang, verweisende Domains, geschätzte Besucher.
 *
 *   npm run seitenwert -- --bestand=kommunen,fachbetriebe,presse,versorger,backlinks
 *   npm run seitenwert -- --alle --schreiben
 *
 * Ohne --schreiben ist es ein Probelauf. Die Werte landen in EINER Tabelle für
 * alle Bestände (lib/seitenwert.ts), weil dieselbe Domain in mehreren vorkommt.
 *
 * Abgefragt wird in Sammelaufrufen zu je 1.000 Domains: drei Aufrufe je Paket,
 * rund 0,03 $ je 100 Domains (gemessen 20.09.2026: 462 Domains = 0,149 $). Wer
 * das je Domain einzeln abfragt, zahlt ein Vielfaches.
 *
 * Alte Werte werden übersprungen (siehe SEITENWERT_MAX_ALTER_TAGE), damit ein
 * zweiter Lauf am selben Tag nichts kostet.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MAIN_CHECKOUT } from "./lib/contact-v2-config";
import { heuteInBerlin } from "../lib/zeit";
import { SEITENWERT_DDL, seitenwertVeraltet } from "../lib/seitenwert";

const arg = (n: string) => process.argv.find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3);
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

const domainAus = (wert: string | null | undefined): string | null => {
  if (!wert) return null;
  const roh = wert.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(roh) ? roh : null;
};

async function db() {
  const url = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function dataforseo(pfad: string, body: unknown) {
  const login = env("DATAFORSEO_LOGIN"), pass = env("DATAFORSEO_PASSWORD");
  if (!login || !pass) throw new Error("DataForSEO-Zugang fehlt");
  const res = await fetch(`https://api.dataforseo.com/v3/${pfad}`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${login}:${pass}`).toString("base64"), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j: any = await res.json();
  const task = j.tasks?.[0];
  if (task?.status_code !== 20000) throw new Error(`${pfad}: ${task?.status_message ?? res.status}`);
  return { items: task.result?.[0]?.items ?? [], kosten: j.cost ?? 0 };
}

/** Woher die Domains kommen. Jeder Bestand liefert nur Domains, sonst nichts. */
async function domainsFuer(bestand: string, client: Awaited<ReturnType<typeof db>>): Promise<string[]> {
  const seiten = async (tabelle: string, spalte: string) => {
    const out: string[] = [];
    for (let von = 0; ; von += 1000) {
      const { data, error } = await client.from(tabelle).select(spalte).range(von, von + 999);
      if (error) throw new Error(`${tabelle}: ${error.message}`);
      for (const zeile of (data ?? []) as any[]) {
        const d = domainAus(zeile[spalte]);
        if (d) out.push(d);
      }
      if (!data || data.length < 1000) return out;
    }
  };
  switch (bestand) {
    case "kommunen": return seiten("kommunen_kontakt", "website");
    case "fachbetriebe": return seiten("fachbetriebe", "domain");
    case "presse": return seiten("presse_kontakte", "domain");
    case "versorger": return seiten("utilities", "website");
    case "backlinks": {
      // Die Seiten, die UNS verlinken — dort sagt der Wert, was ein Link bringt.
      const { items, kosten } = await dataforseo("backlinks/referring_domains/live", [
        { target: "solar-check.io", limit: 1000, order_by: ["backlinks,desc"], backlinks_status_type: "live", exclude_internal_backlinks: true },
      ]);
      console.log(`  Verweise abgerufen · ${kosten.toFixed(3)} $`);
      return items.map((i: any) => domainAus(i.domain)).filter(Boolean) as string[];
    }
    default: throw new Error(`Unbekannter Bestand: ${bestand}`);
  }
}

async function main() {
  const client = await db();
  if (process.argv.includes("--setup")) {
    const { error } = await client.rpc("exec_sql", { sql: SEITENWERT_DDL });
    if (error) throw new Error(error.message);
    console.log("Tabelle angelegt");
  }

  const bestaende = process.argv.includes("--alle")
    ? ["kommunen", "fachbetriebe", "presse", "versorger", "backlinks"]
    : (arg("bestand") ?? "fachbetriebe").split(",").map(s => s.trim()).filter(Boolean);

  const domains = new Set<string>();
  for (const b of bestaende) {
    const liste = await domainsFuer(b, client);
    liste.forEach(d => domains.add(d));
    console.log(`${b}: ${liste.length} Domains`);
  }

  // Was noch frisch ist, wird nicht erneut bezahlt.
  const bekannt = new Map<string, string>();
  for (let von = 0; ; von += 1000) {
    const { data, error } = await client.from("domain_seitenwert").select("domain, gemessen_am").range(von, von + 999);
    if (error) throw new Error(error.message);
    for (const z of data ?? []) bekannt.set(z.domain, z.gemessen_am);
    if (!data || data.length < 1000) break;
  }
  const offen = [...domains].filter(d => seitenwertVeraltet(bekannt.get(d)));
  console.log(`${domains.size} Domains gesamt · ${offen.length} ohne frischen Wert`);
  if (!offen.length) return;
  if (!schreiben) return console.log("Probelauf — nichts abgefragt und nichts geschrieben. Mit --schreiben holen.");

  const heute = heuteInBerlin();
  let kosten = 0;
  for (let i = 0; i < offen.length; i += 1000) {
    const teil = offen.slice(i, i + 1000);
    const werte = new Map<string, any>(teil.map(d => [d, { domain: d, gemessen_am: heute }]));

    const rang = await dataforseo("backlinks/bulk_ranks/live", [{ targets: teil }]);
    kosten += rang.kosten;
    for (const it of rang.items) werte.get(it.target)!.rang = it.rank ?? null;

    const ref = await dataforseo("backlinks/bulk_referring_domains/live", [{ targets: teil }]);
    kosten += ref.kosten;
    for (const it of ref.items) werte.get(it.target)!.verweisende_domains = it.referring_domains ?? null;

    const traffic = await dataforseo("dataforseo_labs/google/bulk_traffic_estimation/live", [
      { targets: teil, location_code: 2276, language_code: "de" },
    ]);
    kosten += traffic.kosten;
    for (const it of traffic.items) {
      const w = werte.get(it.target ?? it.se_domain);
      if (!w) continue;
      w.besucher = it.metrics?.organic?.etv != null ? Math.round(it.metrics.organic.etv) : null;
      w.keywords = it.metrics?.organic?.count ?? null;
    }

    const zeilen = [...werte.values()].map(w => ({ ...w, updated_at: new Date().toISOString() }));
    const { error } = await client.from("domain_seitenwert").upsert(zeilen, { onConflict: "domain" });
    if (error) throw new Error(error.message);
    console.log(`${Math.min(i + 1000, offen.length)}/${offen.length} eingetragen`);
  }
  console.log(`fertig · Kosten ${kosten.toFixed(3)} $`);
}

main().catch(e => { console.error(e.message ?? e); process.exit(1); });
