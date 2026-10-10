/**
 * Carry hand-checked municipal contacts into the contact list.
 *
 * Input: JSON Lines from the hand check of 01.10.2026 (one line per municipality
 * the automatic searches left without an address):
 *   {region_id, name, art?, email, beleg_url, verwaltung, website_neu, grund}
 *
 * Writes only rows that still have no address, never overwrites one. A merged
 * municipality gets no address (its successor is its own row); a hand-checked
 * row without an address keeps the reason in `notes` under the marker
 * "Kontaktstand:", which the completeness view reads.
 *
 *   npx tsx scripts/kommunen-handpruefung.ts <datei.jsonl> [...] [--schreiben]
 */
import { readFileSync } from "node:fs";
import { heuteInBerlin } from "../lib/zeit";
import { aktuellerGemeindeschluessel } from "../lib/ags-nachfolger";
import { postfachTauglich } from "../lib/kontakt-tauglichkeit";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
const H = { apikey: key ?? "", Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const schreiben = process.argv.includes("--schreiben");
const LEER = "klima_email=is.null&presse_kontakt_email=is.null&presse_email=is.null&email=is.null&rollen_email=is.null";
export const MARKE = "Kontaktstand:";

type Fund = { region_id: string; name?: string; art?: string; email: string | null; beleg_url: string | null; verwaltung?: boolean; website_neu: string | null; grund: string | null };

/** Which named state a hand-checked row without an address ends in. */
export function standOhneAdresse(f: Fund): string {
  if (f.art === "gemeindefrei") return "gemeindefrei";
  if (f.art === "aufgeloest" || aktuellerGemeindeschluessel(f.region_id) !== f.region_id) return "aufgeloest";
  if (/formular/i.test(f.grund ?? "")) return "nur-formular";
  if (/erreichbar|tot|503|nicht gefunden|keine (eigene )?website/i.test(f.grund ?? "")) return "nicht-erreichbar";
  return "ohne-adresse";
}

async function holeNotiz(id: string): Promise<string> {
  const r = await fetch(`${url}/rest/v1/kommunen_kontakt?select=notes&region_id=eq.${id}`, { headers: H });
  return ((await r.json()) as { notes: string | null }[])[0]?.notes ?? "";
}

async function main() {
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const funde: Fund[] = process.argv.slice(2).filter(a => !a.startsWith("--")).flatMap(f => readFileSync(f, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l) as Fund));
  const z: Record<string, number> = {};
  const heute = heuteInBerlin();
  for (const f of funde) {
    const merged = f.art === "aufgeloest" || f.art === "gemeindefrei" || aktuellerGemeindeschluessel(f.region_id) !== f.region_id;
    const email = f.email?.trim().toLowerCase() ?? null;
    if (email && !merged && postfachTauglich(email).ok) {
      z.adresse = (z.adresse ?? 0) + 1;
      if (!schreiben) continue;
      const felder: Record<string, unknown> = { rollen_email: email, rollen_email_quelle: "handpruefung" };
      if (f.verwaltung) felder.verwaltung_domain = email.split("@")[1];
      if (f.website_neu) felder.website = f.website_neu;
      const r = await fetch(`${url}/rest/v1/kommunen_kontakt?region_id=eq.${f.region_id}&${LEER}`, { method: "PATCH", headers: H, body: JSON.stringify(felder) });
      if (!r.ok) throw new Error(`${f.region_id}: HTTP ${r.status}`);
      continue;
    }
    const stand = merged ? (f.art === "gemeindefrei" ? "gemeindefrei" : "aufgeloest") : standOhneAdresse(f);
    z[stand] = (z[stand] ?? 0) + 1;
    if (!schreiben) continue;
    const alt = await holeNotiz(f.region_id);
    if (alt.includes(MARKE)) continue;
    const zeile = `[${heute}] ${MARKE} ${stand}${f.grund ? ` — ${f.grund}` : ""}${f.beleg_url ? ` (${f.beleg_url})` : ""}`;
    const felder: Record<string, unknown> = { notes: alt ? `${alt}\n${zeile}` : zeile };
    if (f.website_neu && !merged) felder.website = f.website_neu;
    const r = await fetch(`${url}/rest/v1/kommunen_kontakt?region_id=eq.${f.region_id}`, { method: "PATCH", headers: H, body: JSON.stringify(felder) });
    if (!r.ok) throw new Error(`${f.region_id}: HTTP ${r.status}`);
  }
  console.log(JSON.stringify({ schreiben, zeilen: funde.length, ...z }));
}

if (process.argv[1]?.endsWith("kommunen-handpruefung.ts")) main().catch(e => { console.error(e); process.exit(1); });
