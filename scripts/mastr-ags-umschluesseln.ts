/**
 * Moves plant aggregates from outdated Gemeindeschlüssel to today's key — in the
 * database, without waiting for the next monthly import.
 *
 * Since 18.09.2026 both MaStR importers map outdated keys through
 * lib/ags-nachfolger.ts, so from the next run on the data arrives correctly.
 * This script repairs what the earlier runs wrote: it sums the rows of an old
 * key into the matching rows of its successor, deletes the old rows, and
 * rebuilds the derived tables exactly like the import does.
 *
 * Idempotent: a second run finds no outdated keys and changes nothing.
 *
 *   npm run mastr:umschluesseln               # report only
 *   npm run mastr:umschluesseln -- --schreiben  # write, rebuild, invalidate
 *
 * Invalidating the atlas pages goes through the same route as the monthly run
 * (needs CRON_SECRET) — without it the pages would keep the old numbers until
 * their cache expires.
 */
import { createClient } from "@supabase/supabase-js";
import { aktuellerGemeindeschluessel } from "../lib/ags-nachfolger";

type AggZeile = { region_id: string; energietraeger: string; segment: string; year: number; count: number; kwp: number; kwh: number };
type MonatZeile = { region_id: string; segment: string; monat: string; count: number; kwp: number };

const rund = (x: number) => Math.round(x * 100) / 100;

async function main() {
  const schreiben = process.argv.includes("--schreiben");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen");
  const db = createClient(url, key, { auth: { persistSession: false } });

  // Candidates: every Gemeinde region that has a successor. The region rows stay
  // (the foreign key of older snapshots may point at them); only data moves.
  const regionen: { region_id: string; name: string }[] = [];
  for (let o = 0; ; o += 1000) {
    const { data, error } = await db.from("mastr_regions").select("region_id,name").eq("level", "gemeinde").order("region_id").range(o, o + 999);
    if (error) throw error;
    regionen.push(...data!);
    if (data!.length < 1000) break;
  }
  const bekannt = new Set(regionen.map((r) => r.region_id));
  const alt = regionen.filter((r) => aktuellerGemeindeschluessel(r.region_id) !== r.region_id);
  console.log(`${alt.length} Gemeinde-Einträge mit Nachfolger im Register.`);

  let verschoben = 0;
  let anlagen = 0;
  let monatsZeilen = 0;
  for (const r of alt) {
    const neu = aktuellerGemeindeschluessel(r.region_id);
    if (!bekannt.has(neu)) {
      // The successor has no region row: inserting data would break the foreign
      // key, and a page for it does not exist anyway. Report, never guess.
      console.log(`  ÜBERSPRUNGEN ${r.region_id} ${r.name} → ${neu}: Nachfolger nicht im Regionen-Verzeichnis`);
      continue;
    }

    const { data: altZeilen, error: e1 } = await db.from("mastr_aggregates_gem").select("*").eq("region_id", r.region_id);
    if (e1) throw e1;
    const { data: altMonat, error: e3 } = await db.from("mastr_monat_gem").select("*").eq("region_id", r.region_id);
    if (e3) throw e3;
    if (!altZeilen!.length && !altMonat!.length) continue;

    const summe = (altZeilen as AggZeile[]).reduce((s, z) => s + z.count, 0);
    console.log(`  ${r.region_id} ${r.name} → ${neu}: ${summe} Anlagen, ${altZeilen!.length} Jahreszeilen, ${altMonat!.length} Monatszeilen`);
    verschoben++;
    anlagen += summe;
    monatsZeilen += altMonat!.length;
    if (!schreiben) continue;

    // Sum into the successor's existing rows (same Träger/segment/year).
    if (altZeilen!.length) {
      const { data: neuZeilen, error: e2 } = await db.from("mastr_aggregates_gem").select("*").eq("region_id", neu);
      if (e2) throw e2;
      const vorhanden = new Map((neuZeilen as AggZeile[]).map((z) => [`${z.energietraeger}|${z.segment}|${z.year}`, z]));
      const upsert = (altZeilen as AggZeile[]).map((z) => {
        const v = vorhanden.get(`${z.energietraeger}|${z.segment}|${z.year}`);
        return {
          region_id: neu,
          energietraeger: z.energietraeger,
          segment: z.segment,
          year: z.year,
          count: z.count + (v?.count ?? 0),
          kwp: rund(Number(z.kwp) + Number(v?.kwp ?? 0)),
          kwh: rund(Number(z.kwh) + Number(v?.kwh ?? 0)),
        };
      });
      const { error: u } = await db.from("mastr_aggregates_gem").upsert(upsert, { onConflict: "region_id,energietraeger,segment,year" });
      if (u) throw new Error(`upsert ${neu}: ${u.message}`);
      const { error: d } = await db.from("mastr_aggregates_gem").delete().eq("region_id", r.region_id);
      if (d) throw new Error(`delete ${r.region_id}: ${d.message}`);
    }

    if (altMonat!.length) {
      const { data: neuMonat, error: e4 } = await db.from("mastr_monat_gem").select("*").eq("region_id", neu);
      if (e4) throw e4;
      const vorhanden = new Map((neuMonat as MonatZeile[]).map((z) => [`${z.segment}|${z.monat}`, z]));
      const upsert = (altMonat as MonatZeile[]).map((z) => {
        const v = vorhanden.get(`${z.segment}|${z.monat}`);
        return { region_id: neu, segment: z.segment, monat: z.monat, count: z.count + (v?.count ?? 0), kwp: rund(Number(z.kwp) + Number(v?.kwp ?? 0)) };
      });
      const { error: u } = await db.from("mastr_monat_gem").upsert(upsert, { onConflict: "region_id,segment,monat" });
      if (u) throw new Error(`upsert monat ${neu}: ${u.message}`);
      const { error: d } = await db.from("mastr_monat_gem").delete().eq("region_id", r.region_id);
      if (d) throw new Error(`delete monat ${r.region_id}: ${d.message}`);
    }
  }

  console.log(`${verschoben} Schlüssel mit Daten, ${anlagen} Anlagen, ${monatsZeilen} Monatszeilen.`);
  if (!schreiben) {
    console.log("Nur Bericht. Mit --schreiben ausführen, um umzuhängen.");
    return;
  }
  if (!verschoben) {
    console.log("Nichts umgehängt — keine Neuberechnung nötig.");
    return;
  }

  // Same derived tables as the import, same order.
  for (const fn of ["mastr_refresh_region_rollup", "mastr_refresh_gemeinde_solar", "mastr_refresh_gemeinde_award"]) {
    console.log(`Neuberechnung ${fn} …`);
    const { error } = await db.rpc(fn);
    if (error) throw new Error(`${fn}: ${error.message}`);
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.log("CRON_SECRET fehlt — Atlas-Seiten NICHT für ungültig erklärt. Sie zeigen die alten Zahlen bis zum nächsten Datenlauf.");
    process.exitCode = 1;
    return;
  }
  const res = await fetch("https://solar-check.io/api/atlas/revalidate", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "User-Agent": "solar-check-health-check" },
  });
  console.log(`Atlas-Seiten für ungültig erklärt: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  if (!res.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
