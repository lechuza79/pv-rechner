/**
 * Carry the general mailbox the contact search proved into the contact list.
 *
 *   npx tsx scripts/kommunen-postfach-uebertrag.ts             count only
 *   npx tsx scripts/kommunen-postfach-uebertrag.ts --schreiben write
 *
 * Why (30.09.2026): the municipal apply step writes only the climate and press
 * columns. A proven general mailbox (gemeinde@aitrach.de, info@ammerbuch.de)
 * never reached the list, so 2,425 municipalities with a website counted as
 * unreachable although the search had found their address. Found by a hand
 * check of the misses, not by any test.
 *
 * Kept outside the municipal search script on purpose: that file is part of
 * the rules fingerprint, and touching it would mark every stored result stale
 * and hold the letter send until a full re-evaluation.
 *
 * Only fills rows with no address at all; never overwrites.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { outDir } from "./lib/contact-v2-config";

const schreiben = process.argv.includes("--schreiben");
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const leer = "klima_email=is.null&presse_kontakt_email=is.null&presse_email=is.null&email=is.null&rollen_email=is.null&personen_email=is.null&website=not.is.null";

async function main() {
  const ids: string[] = [];
  for (let o = 0; ; o += 1000) {
    const r = await fetch(`${url}/rest/v1/kommunen_kontakt?select=region_id&region_id=like.________&${leer}&order=region_id`, { headers: { ...H, Range: `${o}-${o + 999}` } });
    const d = (await r.json()) as { region_id: string }[];
    ids.push(...d.map(x => x.region_id));
    if (d.length < 1000) break;
  }
  let kandidaten = 0, geschrieben = 0;
  for (const id of ids) {
    const f = resolve(outDir(), "results", `${id}.json`);
    if (!existsSync(f)) continue;
    const mail = JSON.parse(readFileSync(f, "utf8")).selected?.[0];
    if (!mail) continue;
    kandidaten++;
    if (!schreiben) continue;
    const res = await fetch(`${url}/rest/v1/kommunen_kontakt?region_id=eq.${id}&rollen_email=is.null`, {
      method: "PATCH", headers: H, body: JSON.stringify({ rollen_email: mail, rollen_email_quelle: "kontaktsuche-v2" }),
    });
    if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
    geschrieben++;
  }
  console.log(JSON.stringify({ schreiben, ohneAdresse: ids.length, kandidaten, geschrieben }));
}

main().catch(e => { console.error(e); process.exit(1); });
