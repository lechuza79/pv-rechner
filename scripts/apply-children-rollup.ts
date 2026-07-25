/**
 * Einmal-Fix: mastr_children + mastr_children_by_year auf den vorberechneten
 * mastr_region_rollup umstellen (Land/Kreis-Kinder), statt live über 562k
 * Gemeinde-Zeilen zu aggregieren (>8s → Timeout). Gemeinde-Kinder (len 8)
 * bleiben Live-Scan; zusätzlich Selbstheilung, falls der Rollup mal leer ist.
 *
 * Wendet NUR die zwei Funktionen an (CREATE OR REPLACE = sofort, kein Daten-Scan,
 * kein Refresh → DB-schonend). Wirkt sofort live, kein Deploy nötig.
 *
 *   npx tsx scripts/apply-children-rollup.ts
 *
 * Reviewt (adversarisch) auf Zahlen-Äquivalenz zum Live-Aggregat + Robustheit.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const CHILDREN_SQL = `
CREATE OR REPLACE FUNCTION mastr_children(
  p_prefix text, p_child_len int, p_traeger text[],
  p_year_recent int DEFAULT NULL, p_year_max int DEFAULT NULL
) RETURNS TABLE (region_id text, segment text, count bigint, kwp numeric, count_recent bigint)
LANGUAGE sql STABLE AS $fn$
  -- Land (2) / Kreis (5): aus dem vorberechneten Rollup (region_key hat genau
  -- diese Länge = left(region_id, p_child_len)) statt live-Aggregation.
  SELECT r.region_key AS region_id, r.segment,
         sum(r.count)::bigint, sum(r.kwp),
         sum(CASE WHEN p_year_recent IS NOT NULL AND r.year = p_year_recent THEN r.count ELSE 0 END)::bigint
  FROM mastr_region_rollup r
  WHERE p_child_len IN (2, 5)
    AND length(r.region_key) = p_child_len
    AND (p_prefix = '' OR r.region_key LIKE p_prefix || '%')
    AND r.energietraeger = ANY(p_traeger)
    AND (p_year_max IS NULL OR r.year <= p_year_max)
  GROUP BY 1, 2
  UNION ALL
  -- Gemeinde-Kinder (len 8, kleiner prefix-indizierter Scan) UND Selbstheilung:
  -- fehlt der Rollup für diese Ebene/Prefix (Refresh vergessen/fehlgeschlagen),
  -- live aggregieren statt leer liefern. Bei vorhandenem Rollup ist NOT EXISTS
  -- falsch → dieser Zweig trägt für len 2/5 nichts bei (kein Doppelzählen).
  SELECT left(a.region_id, p_child_len) AS region_id, a.segment,
         sum(a.count)::bigint, sum(a.kwp),
         sum(CASE WHEN p_year_recent IS NOT NULL AND a.year = p_year_recent THEN a.count ELSE 0 END)::bigint
  FROM mastr_aggregates_gem a
  WHERE (
          p_child_len NOT IN (2, 5)
          OR NOT EXISTS (
            SELECT 1 FROM mastr_region_rollup r2
            WHERE length(r2.region_key) = p_child_len
              AND (p_prefix = '' OR r2.region_key LIKE p_prefix || '%')
          )
        )
    AND a.energietraeger = ANY(p_traeger)
    AND (p_prefix = '' OR a.region_id LIKE p_prefix || '%')
    AND (p_year_max IS NULL OR a.year <= p_year_max)
  GROUP BY 1, 2
$fn$;
`;

const CHILDREN_BY_YEAR_SQL = `
CREATE OR REPLACE FUNCTION mastr_children_by_year(
  p_prefix text, p_child_len int, p_traeger text[], p_year_min int DEFAULT NULL
) RETURNS TABLE (region_id text, segment text, year int, count bigint, kwp numeric, kwh numeric)
LANGUAGE sql STABLE AS $fn$
  SELECT r.region_key AS region_id, r.segment, r.year,
         sum(r.count)::bigint, sum(r.kwp), sum(r.kwh)
  FROM mastr_region_rollup r
  WHERE p_child_len IN (2, 5)
    AND length(r.region_key) = p_child_len
    AND (p_prefix = '' OR r.region_key LIKE p_prefix || '%')
    AND r.energietraeger = ANY(p_traeger)
    AND (p_year_min IS NULL OR r.year >= p_year_min)
  GROUP BY 1, 2, 3
  UNION ALL
  SELECT left(a.region_id, p_child_len) AS region_id, a.segment, a.year,
         sum(a.count)::bigint, sum(a.kwp), sum(a.kwh)
  FROM mastr_aggregates_gem a
  WHERE (
          p_child_len NOT IN (2, 5)
          OR NOT EXISTS (
            SELECT 1 FROM mastr_region_rollup r2
            WHERE length(r2.region_key) = p_child_len
              AND (p_prefix = '' OR r2.region_key LIKE p_prefix || '%')
          )
        )
    AND a.energietraeger = ANY(p_traeger)
    AND (p_prefix = '' OR a.region_id LIKE p_prefix || '%')
    AND (p_year_min IS NULL OR a.year >= p_year_min)
  GROUP BY 1, 2, 3
$fn$;
`;

async function main() {
  loadEnv();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  const { createClient } = await import("@supabase/supabase-js");
  const sup = createClient(url, key, { auth: { persistSession: false } });

  // Baseline: bundesweite Kinder (DE → 16 Länder) VOR der Umstellung.
  const timeCall = async (label: string, prefix: string, childLen: number) => {
    const t0 = Date.now();
    const { data, error } = await sup.rpc("mastr_children", {
      p_prefix: prefix,
      p_child_len: childLen,
      p_traeger: ["solar"],
    });
    const ms = Date.now() - t0;
    console.log(`  ${label}: ${error ? "ERROR " + error.message : `${(data?.length ?? 0)} Zeilen`} — ${ms} ms`);
    return { ms, rows: data?.length ?? 0, error };
  };

  console.log("── VORHER (Live-Aggregation) ──");
  await timeCall("DE → Länder     ", "", 2).catch((e) => console.log("  DE:", e.message));
  await timeCall("Bayern → Kreise ", "09", 5).catch((e) => console.log("  BY:", e.message));

  console.log("\n── Funktionen ersetzen ──");
  for (const [name, sql] of [
    ["mastr_children", CHILDREN_SQL],
    ["mastr_children_by_year", CHILDREN_BY_YEAR_SQL],
  ] as const) {
    const { error } = await sup.rpc("exec_sql", { sql });
    console.log(`  ${name}: ${error ? "ERROR " + error.message : "ok"}`);
    if (error) throw error;
  }

  console.log("\n── NACHHER (Rollup) ──");
  await timeCall("DE → Länder     ", "", 2);
  await timeCall("Bayern → Kreise ", "09", 5);
  await timeCall("NRW → Kreise    ", "05", 5);
  await timeCall("Kreis → Gemeinden", "09571", 8);

  console.log("\nFertig. Zahlen-Plausibilität separat mit `npm run atlas:verify` prüfen.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
