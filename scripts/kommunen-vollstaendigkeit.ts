/**
 * Completeness of the municipal contact list: every municipality in exactly one
 * named state, so "not searched" is a number that can be driven to zero.
 *
 *   adresse          an address is stored (any of the mail columns)
 *   nur-formular     no address, but its own pages carry a contact form
 *   keine-website    no website known
 *   nicht-erreichbar website did not answer, neither to a plain fetch nor a browser
 *   gesucht-leer     searched and rendered, no address — hand check pending/done
 *   nicht-gesucht    no follow-up result yet
 *
 *   --liste=<datei>  writes one line per municipality (region_id;state;name;website)
 *
 * Reads the follow-up cache of scripts/kommunen-nachsuche.ts; writes nothing to the database.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { MAIN_CHECKOUT } from "./lib/contact-v2-config";
import { readJson } from "./lib/kontakt-lauf";

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const OUT = resolve(MAIN_CHECKOUT, "scripts/.cache/kommunen-nachsuche");
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

type Zeile = { region_id: string; website: string | null; email: string | null; rollen_email: string | null; presse_email: string | null; klima_email: string | null; presse_kontakt_email: string | null; mastr_regions: { name: string } | null };
export type Zustand = "adresse" | "nur-formular" | "keine-website" | "nicht-erreichbar" | "gesucht-leer" | "nicht-gesucht";

async function alle(): Promise<Zeile[]> {
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const out: Zeile[] = [];
  for (let o = 0; ; o += 1000) {
    const r = await fetch(`${url}/rest/v1/kommunen_kontakt?select=region_id,website,email,rollen_email,presse_email,klima_email,presse_kontakt_email,mastr_regions(name)&region_id=like.________&order=region_id`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${o}-${o + 999}` } });
    const d = (await r.json()) as Zeile[];
    out.push(...d);
    if (d.length < 1000) return out;
  }
}

/** A contact form on the stored pages: a form with a text area or a mail field. */
function hatFormular(id: string): boolean {
  const dir = resolve(OUT, "sources", id);
  if (!existsSync(dir)) return false;
  return readdirSync(dir).filter(f => f.endsWith(".html")).some(f => {
    const html = readFileSync(resolve(dir, f), "utf8");
    return /<form[\s\S]{0,6000}?(?:<textarea|type=["']email["'])/i.test(html);
  });
}

function seitenGelesen(id: string): number {
  const dir = resolve(OUT, "sources", id);
  return existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".html")).length : 0;
}

async function main() {
  const zeilen = await alle();
  const status: Record<string, { gelesen: number; fehler: string | null }> = existsSync(resolve(OUT, "browser-status.json")) ? readJson(resolve(OUT, "browser-status.json")) : {};
  const ergebnis = (id: string) => existsSync(resolve(OUT, "results", `${id}.json`));
  const zustand = (z: Zeile): Zustand => {
    if (z.email || z.rollen_email || z.presse_email || z.klima_email || z.presse_kontakt_email) return "adresse";
    if (!z.website) return "keine-website";
    if (!ergebnis(z.region_id)) return "nicht-gesucht";
    const b = status[z.region_id];
    if (seitenGelesen(z.region_id) === 0 && (!b || b.gelesen === 0)) return "nicht-erreichbar";
    if (hatFormular(z.region_id)) return "nur-formular";
    return "gesucht-leer";
  };
  const liste = zeilen.map(z => ({ z, s: zustand(z) }));
  const zaehler: Record<string, number> = {};
  for (const { s } of liste) zaehler[s] = (zaehler[s] ?? 0) + 1;
  console.log(JSON.stringify({ gemeinden: zeilen.length, ...zaehler }));
  const datei = arg("liste");
  if (datei) writeFileSync(datei, liste.map(({ z, s }) => [z.region_id, s, z.mastr_regions?.name ?? "", z.website ?? ""].join(";")).join("\n") + "\n");
}

if (process.argv[1]?.endsWith("kommunen-vollstaendigkeit.ts")) main().catch(e => { console.error(e); process.exit(1); });
