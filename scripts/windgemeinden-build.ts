/**
 * Generates lib/windgemeinden.json from the register aggregates.
 *
 *   npm run windgemeinden:build            # write the list
 *   npm run windgemeinden:build -- --trocken
 *
 * Reads every wind row and the solar rows of the towns that have wind, paged
 * AND sorted: unsorted pages may repeat or skip rows between two requests.
 * Refuses to write a list that shrank or grew by more than a third — a broken
 * read would otherwise silently remove the wind picture from hundreds of towns.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { istWindgemeinde } from "../lib/windgemeinden";
import { heuteInBerlin } from "../lib/zeit";

const ZIEL = "lib/windgemeinden.json";
const trocken = process.argv.includes("--trocken");

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL und SUPABASE_SERVICE_KEY fehlen.");
  const db = createClient(url, key, { auth: { persistSession: false } });

  type Zeile = { region_id: string; energietraeger: string; segment: string; year: number; count: number; kwp: number };
  async function alle(filter: (q: any) => any): Promise<Zeile[]> {
    const out: Zeile[] = [];
    for (let von = 0; ; von += 1000) {
      const { data, error } = await filter(
        db.from("mastr_aggregates_gem").select("region_id,energietraeger,segment,year,count,kwp"),
      )
        .order("region_id").order("energietraeger").order("segment").order("year")
        .range(von, von + 999);
      if (error) throw new Error(error.message);
      out.push(...(data as Zeile[]));
      if (!data || data.length < 1000) return out;
    }
  }

  const wind = new Map<string, { kw: number; n: number }>();
  for (const z of await alle((q) => q.eq("energietraeger", "wind"))) {
    // German municipalities only. Swiss rows share the table since 07.10.2026
    // ("chg0261"); the hero picture and its list are German.
    if (!/^\d{8}$/.test(z.region_id)) continue;
    const w = wind.get(z.region_id) ?? { kw: 0, n: 0 };
    w.kw += Number(z.kwp);
    w.n += z.count;
    wind.set(z.region_id, w);
  }
  const ids = [...wind.keys()];
  const solar = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 150) {
    const teil = ids.slice(i, i + 150);
    for (const z of await alle((q) => q.eq("energietraeger", "solar").in("region_id", teil))) {
      solar.set(z.region_id, (solar.get(z.region_id) ?? 0) + Number(z.kwp));
    }
  }

  const gemeinden = ids
    .filter((id) => istWindgemeinde({ windKw: wind.get(id)!.kw, windAnlagen: wind.get(id)!.n, solarKwp: solar.get(id) ?? 0 }))
    .sort();
  console.log(`${wind.size} Gemeinden mit Windrädern, davon ${gemeinden.length} Windgemeinden.`);

  const alt = JSON.parse(readFileSync(ZIEL, "utf8")) as { gemeinden: string[] };
  if (alt.gemeinden.length > 0 && Math.abs(gemeinden.length - alt.gemeinden.length) > alt.gemeinden.length / 3) {
    throw new Error(`Liste springt von ${alt.gemeinden.length} auf ${gemeinden.length} — nicht geschrieben.`);
  }
  if (trocken) return;
  // An unchanged list keeps its date: the date says when the LIST last
  // changed, and a monthly commit that only moves a date is noise on main.
  if (JSON.stringify(alt.gemeinden) === JSON.stringify(gemeinden)) {
    console.log("Liste unverändert, nichts geschrieben.");
    return;
  }
  const stand = heuteInBerlin();
  writeFileSync(ZIEL, JSON.stringify({ stand, gemeinden }, null, 0) + "\n");
  console.log(`${ZIEL} geschrieben.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
