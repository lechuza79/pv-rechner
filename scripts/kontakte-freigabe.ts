/**
 * Release every stored contact of a population for a letter, and write the
 * result next to the contact: a release date or the reason for refusal.
 *
 *   npm run kontakte:freigabe -- --bestand=fachbetriebe|versorger|presse [--schreiben]
 *                                [--ids=A,B] [--part=i --parts=n]
 *
 * The check itself is one shared function (scripts/lib/kontakt-freigabe.ts);
 * this runner only knows where each population keeps its contacts. Municipal
 * letters are checked inside the send run instead, right before each letter.
 *
 * A release older than a few days is no release — whoever sends reads the date.
 * Nothing is sent here.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MAIN_CHECKOUT } from "./lib/contact-v2-config";
import { freigeben, type Pruefling } from "./lib/kontakt-freigabe";
import { heuteInBerlin } from "../lib/zeit";
import { host } from "../lib/kontakt-suche";

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
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

type Db = any;
async function alle(c: Db, tabelle: string, spalten: string, sortierung: string, filter: (q: any) => any): Promise<any[]> {
  const out: any[] = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await filter(c.from(tabelle).select(spalten)).order(sortierung).range(von, von + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

type Bestand = {
  ddl: string;
  laden(c: Db): Promise<Pruefling[]>;
  schreiben(c: Db, schluessel: string, heute: string, grund: string | null): Promise<void>;
};

const BESTAENDE: Record<string, Bestand> = {
  fachbetriebe: {
    ddl: `ALTER TABLE fachbetriebe ADD COLUMN IF NOT EXISTS kontakt_freigabe_am date;
          ALTER TABLE fachbetriebe ADD COLUMN IF NOT EXISTS kontakt_sperrgrund text;`,
    async laden(c) {
      const z = await alle(c, "fachbetriebe", "domain, kontakt_email_belegt, kontakt_beleg_url", "domain",
        q => q.eq("art", "betrieb").not("kontakt_email_belegt", "is", null));
      return z.map(r => ({ schluessel: r.domain, email: r.kontakt_email_belegt, belegUrl: r.kontakt_beleg_url, domain: r.domain }));
    },
    async schreiben(c, schluessel, heute, grund) {
      const { error } = await c.from("fachbetriebe").update(grund
        ? { kontakt_freigabe_am: null, kontakt_sperrgrund: grund }
        : { kontakt_freigabe_am: heute, kontakt_sperrgrund: null }).eq("domain", schluessel);
      if (error) throw new Error(`${schluessel}: ${error.message}`);
    },
  },
  versorger: {
    ddl: `ALTER TABLE utilities ADD COLUMN IF NOT EXISTS presse_freigabe_am date;
          ALTER TABLE utilities ADD COLUMN IF NOT EXISTS presse_sperrgrund text;`,
    async laden(c) {
      const z = await alle(c, "utilities", "id, website, presse_email, presse_beleg_url", "id", q => q.not("presse_email", "is", null));
      return z.map(r => ({ schluessel: String(r.id), email: r.presse_email, belegUrl: r.presse_beleg_url, domain: host(/^https?:/.test(r.website ?? "") ? r.website : `https://${r.website}`) }));
    },
    async schreiben(c, schluessel, heute, grund) {
      const { error } = await c.from("utilities").update(grund
        ? { presse_freigabe_am: null, presse_sperrgrund: grund }
        : { presse_freigabe_am: heute, presse_sperrgrund: null }).eq("id", schluessel);
      if (error) throw new Error(`${schluessel}: ${error.message}`);
    },
  },
  presse: {
    ddl: `ALTER TABLE presse_kontakte ADD COLUMN IF NOT EXISTS freigabe_am date;
          ALTER TABLE presse_kontakte ADD COLUMN IF NOT EXISTS sperrgrund text;`,
    async laden(c) {
      // Only real media; advertising mailboxes never take an editorial letter.
      const medien = new Set((await alle(c, "presse_medien", "domain", "domain", q => q.eq("ist_medium", "medium"))).map(m => m.domain));
      const z = await alle(c, "presse_kontakte", "domain, schluessel, mail, mail_art, quelle_url", "domain",
        q => q.not("mail", "is", null).neq("mail_art", "werblich"));
      return z.filter(r => medien.has(r.domain))
        .map(r => ({ schluessel: `${r.domain}\u0000${r.schluessel}`, email: r.mail, belegUrl: r.quelle_url, domain: r.domain }));
    },
    async schreiben(c, schluessel, heute, grund) {
      const [domain, key] = schluessel.split("\u0000");
      const { error } = await c.from("presse_kontakte").update(grund
        ? { freigabe_am: null, sperrgrund: grund }
        : { freigabe_am: heute, sperrgrund: null }).eq("domain", domain).eq("schluessel", key);
      if (error) throw new Error(`${domain}: ${error.message}`);
    },
  },
};

async function main() {
  const name = arg("bestand") ?? "";
  const b = BESTAENDE[name];
  if (!b) throw new Error(`--bestand=${Object.keys(BESTAENDE).join("|")}`);
  const url = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  const c = createClient(url, key, { auth: { persistSession: false } });
  if (schreiben) {
    const { error } = await c.rpc("exec_sql", { sql: `${b.ddl} NOTIFY pgrst, 'reload schema';` });
    if (error) throw new Error(error.message);
    // The API picks up new columns only after it reloads its schema.
    await new Promise(r => setTimeout(r, 3000));
  }
  let liste = await b.laden(c);
  const ids = arg("ids")?.split(",");
  if (ids) liste = liste.filter(p => ids.includes(p.schluessel.split("\u0000")[0]));
  // Parts are cut by domain so that one site is never read by two runs at once.
  const parts = Number(arg("parts") ?? 1), part = Number(arg("part") ?? 0);
  const teil = (d: string) => [...d].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % parts;
  liste = liste.filter(p => teil(p.domain) === part);
  console.log(`${liste.length} Adressen · ${name}`);
  const heute = heuteInBerlin();
  const urteile = await freigeben(liste, { fortschritt: n => { if (n % 100 === 0) console.log(`  ${n} Fundstellen gelesen`); } });
  const zaehler: Record<string, number> = {};
  for (const u of urteile) {
    zaehler[u.grund ?? "freigegeben"] = (zaehler[u.grund ?? "freigegeben"] ?? 0) + 1;
    if (schreiben) await b.schreiben(c, u.schluessel, heute, u.grund);
  }
  console.log(JSON.stringify({ bestand: name, schreiben, geprueft: urteile.length, ...zaehler }));
}

main().catch(error => { console.error(error); process.exit(1); });
