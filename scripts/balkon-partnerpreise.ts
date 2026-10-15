// Partner reference prices for the balcony calculator's start sets.
//
//   npm run balkon:partnerpreise
//   npm run balkon:partnerpreise -- --markt duo=250-500,max=400-700
//
// Reads the live partner catalogue (the same snapshot visitors see), applies
// the rule from lib/balkon-partner-referenz.ts and, with --markt, the market
// ranges the watcher researched. "uebernehmen" means: the watcher sets that
// price in lib/balkon-config.ts itself (scripts/balkon-verify.md).

import { DEFAULT_BALKON_CONFIG, type BalkonSetId } from "../lib/balkon-config";
import { partnerSetReferenz, marktAbgleich } from "../lib/balkon-partner-referenz";
import type { ShopAngebote } from "../lib/shop-solakon";

function parseMarkt(arg: string | undefined): Partial<Record<BalkonSetId, { min: number; max: number }>> {
  const out: Partial<Record<BalkonSetId, { min: number; max: number }>> = {};
  for (const teil of (arg ?? "").split(",").filter(Boolean)) {
    const m = teil.match(/^(single|duo|max)=(\d+)-(\d+)$/);
    if (!m) throw new Error(`Marktspanne nicht lesbar: ${teil} (erwartet z. B. duo=250-500)`);
    out[m[1] as BalkonSetId] = { min: Number(m[2]), max: Number(m[3]) };
  }
  return out;
}

async function main() {
  const i = process.argv.indexOf("--markt");
  const markt = parseMarkt(i >= 0 ? process.argv[i + 1] : undefined);
  const res = await fetch("https://solar-check.io/api/shop/balkon", { headers: { "User-Agent": "solar-check-health-check" } });
  if (!res.ok) throw new Error(`Partnerkatalog nicht erreichbar: HTTP ${res.status}`);
  const daten = (await res.json()) as ShopAngebote;
  const ref = partnerSetReferenz(daten.angebote, DEFAULT_BALKON_CONFIG.sets);
  console.log(`Partnerkatalog abgerufen ${daten.abgerufenIso}, ${daten.angebote.length} Varianten\n`);
  for (const set of DEFAULT_BALKON_CONFIG.sets) {
    const r = ref[set.id];
    const partner = r ? `${r.angebot.produkt} ${r.angebot.moduleWp} Wp „${r.angebot.variante}" ${r.angebot.preis} € → ${r.preis} €` : "kein Partnerset in dieser Klasse";
    const abw = r ? ` (${Math.round(((r.preis - set.price) / set.price) * 100)} %)` : "";
    const line = `${set.id.padEnd(6)} hinterlegt ${set.price} € | Partner: ${partner}${abw}`;
    if (i >= 0) {
      const m = markt[set.id] ?? null;
      const { urteil, neu } = marktAbgleich(set.price, r, m);
      console.log(`${line}\n       Markt ${m ? `${m.min}–${m.max} €` : "—"} → ${urteil}${urteil === "uebernehmen" ? ` auf ${neu} €` : ""}`);
    } else console.log(line);
  }
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
