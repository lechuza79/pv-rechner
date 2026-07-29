/**
 * Spielt die Award-Tabelle aus lib/mastr-award-sql.ts ein und baut sie neu auf.
 *
 *   npx tsx scripts/apply-award-sql.ts --dry-run   # nur zeigen, was passiert
 *   npx tsx scripts/apply-award-sql.ts             # anwenden + neu aufbauen
 *
 * WARUM NICHT DIE SETUP-ROUTE: Die laeuft ALLES durch — jede Tabelle, jede
 * Funktion, jeden Rollup-Neuaufbau. Gegen die Live-Datenbank mitten am Tag ist
 * das genau die brachiale Last, die am 21.07.2026 die Produktion umgelegt hat.
 * Dieses Skript fasst nur die eine Tabelle an.
 *
 * Das Skript glaubt sich selbst nicht: Es liest vorher und nachher dieselben
 * Stichproben und vergleicht die BESTEHENDEN Spalten Zeile fuer Zeile. Weicht
 * eine ab, endet es mit Fehler — neue Spalten sind erlaubt, veraenderte Zahlen
 * in den alten waeren der schwerste Fehler dieses Projekts.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MASTR_AWARD_SQL } from "../lib/mastr-award-sql";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");

function loadEnv() {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

/** Stichproben quer durchs Land — eine Grossstadt, ein Kreis-Ort, ein Dorf. */
const STICHPROBEN = ["08111000", "09679147", "09679143", "05315000", "11000000"];
const ALTE_SPALTEN = [
  "population",
  "privat_dach_kwp",
  "gewerbe_dach_kwp",
  "freiflaeche_kwp",
  "balkon_count",
  "balkon_kwp",
  "batterie_privat_kwh",
  "batterie_privat_count",
  "wind_kwp",
  "solar_zubau_kwp",
];

async function lies(db: SupabaseClient) {
  const { data, error } = await db
    .from("mastr_gemeinde_award")
    .select(["region_id", ...ALTE_SPALTEN].join(", "))
    .in("region_id", STICHPROBEN)
    .order("region_id");
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function main() {
  loadEnv();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const vorher = await lies(db);
  console.log(`Vorher: ${vorher.length} Stichproben gelesen`);

  if (DRY_RUN) {
    console.log(`\nWuerde ${MASTR_AWARD_SQL.length} Zeichen SQL einspielen und danach neu aufbauen.`);
    console.log("Betroffen: nur mastr_gemeinde_award (Spalten + Neuaufbau-Funktion).");
    return;
  }

  console.log("\nSpiele DDL + Funktion ein …");
  const t0 = Date.now();
  const { error: e1 } = await db.rpc("exec_sql", { sql: MASTR_AWARD_SQL });
  if (e1) throw new Error(`DDL fehlgeschlagen: ${e1.message}`);
  console.log(`  fertig in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  console.log("Baue die Tabelle neu auf (TRUNCATE + INSERT ueber die Rohaggregation) …");
  const t1 = Date.now();
  const { error: e2 } = await db.rpc("exec_sql", { sql: "SELECT mastr_refresh_gemeinde_award();" });
  if (e2) throw new Error(`Neuaufbau fehlgeschlagen: ${e2.message}`);
  console.log(`  fertig in ${((Date.now() - t1) / 1000).toFixed(1)} s`);

  const nachher = await lies(db);
  let abweichungen = 0;
  for (const a of vorher) {
    const b = nachher.find((x: any) => x.region_id === (a as any).region_id);
    if (!b) {
      console.error(`  FEHLT nachher: ${(a as any).region_id}`);
      abweichungen++;
      continue;
    }
    for (const sp of ALTE_SPALTEN) {
      const va = Number((a as any)[sp]);
      const vb = Number((b as any)[sp]);
      if (Math.abs(va - vb) > 0.01) {
        console.error(`  ABWEICHUNG ${(a as any).region_id}.${sp}: ${va} → ${vb}`);
        abweichungen++;
      }
    }
  }
  if (abweichungen > 0) {
    console.error(`\n${abweichungen} Abweichungen in bestehenden Spalten — bitte pruefen.`);
    process.exit(1);
  }
  console.log(`\nBestehende Spalten unveraendert (${vorher.length} Stichproben x ${ALTE_SPALTEN.length} Werte).`);

  const { data: probe } = await db
    .from("mastr_gemeinde_award")
    .select("region_id, solar_kwp, solar_kwp_ly, solar_kwp_l3, solar_kwp_l5, privat_dach_kwp_ly")
    .in("region_id", STICHPROBEN)
    .order("region_id");
  console.log("\nNeue Stichtags-Spalten:");
  for (const r of (probe ?? []) as any[]) {
    console.log(
      `  ${r.region_id}  heute ${Math.round(r.solar_kwp)} · Ende Vorjahr ${Math.round(r.solar_kwp_ly)} · ` +
        `vor 3 J ${Math.round(r.solar_kwp_l3)} · vor 5 J ${Math.round(r.solar_kwp_l5)} kWp`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
