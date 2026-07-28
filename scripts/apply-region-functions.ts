/**
 * Spielt die vier heissen Atlas-Funktionen aus lib/mastr-region-sql.ts ein.
 *
 *   npx tsx scripts/apply-region-functions.ts            # messen + anwenden
 *   npx tsx scripts/apply-region-functions.ts --dry-run  # nur messen
 *
 * Nur CREATE OR REPLACE — kein Datendurchlauf, kein Rollup-Neuaufbau, kein
 * Deploy noetig. Wirkt sofort auf der Live-Seite (die Naechstes-Mal-Fassung
 * steht in der Setup-Route, die dieselbe Quelle importiert).
 *
 * Das Skript glaubt sich selbst nicht: es liest jede Funktion VOR und NACH dem
 * Einspielen auf denselben Stichproben aus und vergleicht Zeile fuer Zeile.
 * Weicht irgendetwas ab, endet es mit Fehler — eine schnellere Funktion, die
 * andere Zahlen liefert, waere der schwerste Fehler dieses Projekts.
 *
 * Loest scripts/apply-children-rollup.ts ab (dort lag eine zweite, inzwischen
 * ueberholte Kopie derselben SQL).
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MASTR_REGION_FUNCTIONS_SQL } from "../lib/mastr-region-sql";

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Feste Sortierung je Funktionsform. OHNE sie kappt PostgREST bei 1000 Zeilen
// eine BELIEBIGE Teilmenge — zwei Laeufe liefern dann verschiedene 1000er, und
// der Vergleich meldet eine Abweichung, die keine ist. Genau darauf ist dieses
// Skript beim ersten Lauf hereingefallen.
const SERIES_ORDER = ["energietraeger", "segment", "year"];
const CHILD_ORDER = ["region_id", "segment"];
const BYYEAR_ORDER = ["region_id", "segment", "year"];
const TOP_ORDER = ["rang", "region_id"];

const TRAEGER = ["solar", "speicher", "wind", "biomasse", "wasser"];
const SOLAR_SPEICHER = ["solar", "speicher"];

/** Stichproben quer durch alle vier Ebenen und mehrere Bundeslaender.
 *  Bewusst inkl. der Randfaelle: Bundes-Schnitt (leerer Praefix), Stadtstaat,
 *  und eine Gemeinde ohne jede Anlage. */
type Probe = { label: string; fn: string; args: Record<string, unknown>; order: string[] };
const PROBES: Probe[] = [
  { label: "series/DE", fn: "mastr_region_series", args: { p_prefix: "", p_traeger: TRAEGER }, order: SERIES_ORDER },
  { label: "series/Bayern", fn: "mastr_region_series", args: { p_prefix: "09", p_traeger: TRAEGER }, order: SERIES_ORDER },
  { label: "series/Hamburg", fn: "mastr_region_series", args: { p_prefix: "02", p_traeger: TRAEGER }, order: SERIES_ORDER },
  { label: "series/Kreis Coesfeld", fn: "mastr_region_series", args: { p_prefix: "05558", p_traeger: TRAEGER }, order: SERIES_ORDER },
  { label: "series/Gem Nordkirchen", fn: "mastr_region_series", args: { p_prefix: "05558028", p_traeger: TRAEGER }, order: SERIES_ORDER },
  { label: "series/Gem Hoechberg", fn: "mastr_region_series", args: { p_prefix: "09679148", p_traeger: TRAEGER }, order: SERIES_ORDER },
  { label: "series/Gem Dresden", fn: "mastr_region_series", args: { p_prefix: "14612000", p_traeger: TRAEGER }, order: SERIES_ORDER },
  { label: "series/Gem ohne Anlagen", fn: "mastr_region_series", args: { p_prefix: "01051032", p_traeger: TRAEGER }, order: SERIES_ORDER },
  {
    label: "children/DE->Laender",
    fn: "mastr_children",
    args: { p_prefix: "", p_child_len: 2, p_traeger: SOLAR_SPEICHER, p_year_recent: 2025, p_year_max: null },
    order: CHILD_ORDER,
  },
  {
    label: "children/Bayern->Kreise",
    fn: "mastr_children",
    args: { p_prefix: "09", p_child_len: 5, p_traeger: SOLAR_SPEICHER, p_year_recent: 2025, p_year_max: null },
    order: CHILD_ORDER,
  },
  {
    label: "children/Kreis->Gemeinden",
    fn: "mastr_children",
    args: { p_prefix: "05558", p_child_len: 8, p_traeger: SOLAR_SPEICHER, p_year_recent: 2025, p_year_max: null },
    order: CHILD_ORDER,
  },
  {
    label: "children/Kreis->Gem (Vorjahr)",
    fn: "mastr_children",
    args: { p_prefix: "09679", p_child_len: 8, p_traeger: SOLAR_SPEICHER, p_year_recent: 2025, p_year_max: 2024 },
    order: CHILD_ORDER,
  },
  {
    label: "byYear/DE->Laender",
    fn: "mastr_children_by_year",
    args: { p_prefix: "", p_child_len: 2, p_traeger: SOLAR_SPEICHER, p_year_min: null },
    order: BYYEAR_ORDER,
  },
  {
    label: "byYear/NRW->Kreise",
    fn: "mastr_children_by_year",
    args: { p_prefix: "05", p_child_len: 5, p_traeger: SOLAR_SPEICHER, p_year_min: null },
    order: BYYEAR_ORDER,
  },
  {
    label: "byYear/Kreis->Gemeinden",
    fn: "mastr_children_by_year",
    args: { p_prefix: "05558", p_child_len: 8, p_traeger: SOLAR_SPEICHER, p_year_min: null },
    order: BYYEAR_ORDER,
  },
  {
    label: "byYear/Kreis->Gem (ab 2020)",
    fn: "mastr_children_by_year",
    args: { p_prefix: "09679", p_child_len: 8, p_traeger: SOLAR_SPEICHER, p_year_min: 2020 },
    order: BYYEAR_ORDER,
  },
  {
    label: "top/bundesweit alle",
    fn: "mastr_top_gemeinden",
    args: { p_prefix: "", p_owner: "alle", p_limit: 50, p_min_pop: 0, p_max_pop: null },
    order: TOP_ORDER,
  },
  {
    label: "top/Bayern privat",
    fn: "mastr_top_gemeinden",
    args: { p_prefix: "09", p_owner: "privat", p_limit: 50, p_min_pop: 1000, p_max_pop: 20000 },
    order: TOP_ORDER,
  },
  {
    label: "top/Kreis gewerbe",
    fn: "mastr_top_gemeinden",
    args: { p_prefix: "05558", p_owner: "gewerbe", p_limit: 50, p_min_pop: 0, p_max_pop: null },
    order: TOP_ORDER,
  },
];

type Result = { rows: unknown[]; ms: number; error?: string };

/** Vergleichbare Form: Reihenfolge- und Formatierungsunterschiede duerfen keine
 *  Abweichung vortaeuschen, echte Zahlendifferenzen muessen auffallen. */
function fingerprint(rows: unknown[]): string {
  return JSON.stringify(
    (rows as Record<string, unknown>[])
      .map((r) =>
        Object.entries(r)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(4) : String(v)}`)
          .join(";"),
      )
      .sort(),
  );
}

const PAGE = 1000;

/** Vollstaendig auslesen: sortiert und seitenweise, wie es der Lesepfad
 *  (loadAllCells) auch tut. Eine gekappte Antwort waere ein stiller Teilvergleich. */
async function run(sb: SupabaseClient, p: Probe): Promise<Result> {
  const rows: unknown[] = [];
  let ms = 0;
  for (let from = 0; from < 40_000; from += PAGE) {
    let q = sb.rpc(p.fn, p.args);
    for (const col of p.order) q = q.order(col, { ascending: true });
    const started = Date.now();
    const { data, error } = await q.range(from, from + PAGE - 1);
    ms += Date.now() - started;
    if (error) return { rows: [], ms, error: error.message };
    const page = (data as unknown[]) ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
    await sleep(150);
  }
  return { rows, ms };
}

/** Alle Stichproben nacheinander, mit Pause — nie Buendel gegen die Live-DB
 *  feuern (das hat am 2026-07-21 die Produktion umgelegt). */
async function runAll(sb: SupabaseClient): Promise<Map<string, Result>> {
  const out = new Map<string, Result>();
  for (const p of PROBES) {
    out.set(p.label, await run(sb, p));
    await sleep(250);
  }
  return out;
}

async function main() {
  loadEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen (.env.local).");
    process.exit(1);
  }
  const sb = createClient(url, key);

  console.log(`Stichproben VOR dem Einspielen (${PROBES.length}) …`);
  const before = await runAll(sb);

  if (DRY_RUN) {
    console.log("\n--dry-run: nichts geaendert. Laufzeiten:");
    for (const p of PROBES) {
      const r = before.get(p.label)!;
      console.log(`  ${String(r.ms).padStart(5)} ms  ${p.label}${r.error ? `  FEHLER ${r.error}` : ""}`);
    }
    return;
  }

  console.log("\nSpiele lib/mastr-region-sql.ts ein …");
  const { error } = await sb.rpc("exec_sql", { sql: MASTR_REGION_FUNCTIONS_SQL });
  if (error) {
    console.error("FEHLGESCHLAGEN:", error.message);
    process.exit(1);
  }
  // PostgREST kennt die neuen Signaturen erst nach einem Schema-Neuladen.
  await sb.rpc("exec_sql", { sql: "NOTIFY pgrst, 'reload schema';" });
  await sleep(3000);

  console.log("Stichproben NACH dem Einspielen …");
  const after = await runAll(sb);

  console.log("\n=== Zahlen (muessen identisch sein) und Laufzeit");
  let abweichungen = 0;
  let fehler = 0;
  for (const p of PROBES) {
    const a = before.get(p.label)!;
    const b = after.get(p.label)!;
    if (b.error) {
      fehler++;
      console.log(`  FEHLER      ${p.label}: ${b.error}`);
      continue;
    }
    if (a.error) {
      console.log(`  ?           ${p.label}: vorher Fehler (${a.error}), nachher ${b.rows.length} Zeilen`);
      continue;
    }
    const gleich = fingerprint(a.rows) === fingerprint(b.rows);
    if (!gleich) abweichungen++;
    const faktor = b.ms > 0 ? (a.ms / b.ms).toFixed(1) : "—";
    console.log(
      `  ${gleich ? "identisch  " : "ABWEICHUNG "} ${p.label.padEnd(30)} ` +
        `${String(a.ms).padStart(5)} → ${String(b.ms).padStart(5)} ms  (x${faktor})  ${b.rows.length} Zeilen`,
    );
  }

  if (abweichungen || fehler) {
    console.error(`\nNICHT IN ORDNUNG: ${abweichungen} Abweichung(en), ${fehler} Fehler.`);
    console.error("Die alte Fassung steht in der Git-Historie von lib/mastr-region-sql.ts.");
    process.exit(1);
  }
  console.log("\nAlle Stichproben liefern dieselben Zahlen. Eingespielt.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
