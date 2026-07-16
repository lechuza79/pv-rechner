/**
 * Solar-Atlas data integrity check.
 *
 *   npm run atlas:verify
 *
 * Every number on every atlas page is a prefix rollup of one stored grain
 * (Gemeinde). That makes the whole hierarchy checkable by arithmetic: if a Kreis
 * total does not equal the sum of the Gemeinden listed under it, a page is
 * showing a ranking that does not add up to its own headline — and nobody would
 * notice, because both numbers look plausible on their own.
 *
 * This script asserts that. It exits non-zero on any mismatch, so the monthly
 * refresh can gate on it.
 *
 * The known hazards it is built to catch:
 *   - MaStR knows ~117 more Gemeinde keys than the Destatis Gemeindeverzeichnis
 *     does (retired keys after mergers). Their plants roll into the Kreis by
 *     prefix but have no row to be listed under, so they vanish from the ranking
 *     while still counting in the total.
 *   - PostgREST silently caps a response at 1000 rows. A truncated read produces
 *     a smaller sum, not an error.
 *   - A slug collision would let two Gemeinden share a URL.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(): void {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function log(msg: string, kind: "info" | "ok" | "warn" | "err" = "info") {
  const prefix = { info: "•", ok: "✓", warn: "!", err: "✗" }[kind];
  process.stderr.write(`${prefix} ${msg}\n`);
}

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

type Sup = Awaited<ReturnType<typeof client>>;

async function client() {
  loadEnvFile();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

type Cell = { region_id: string; segment: string; year: number; count: number; kwp: number; kwh: number };

/** Paginated read — the same shape lib/atlas.ts uses, for the same reason. */
async function children(sup: Sup, prefix: string, childLen: number): Promise<Cell[]> {
  const PAGE = 1000;
  const all: Cell[] = [];
  for (let from = 0; from < 60_000; from += PAGE) {
    const { data, error } = await sup
      .rpc("mastr_children_by_year", {
        p_prefix: prefix,
        p_child_len: childLen,
        p_traeger: ["solar"],
        p_year_min: null,
      })
      .order("region_id", { ascending: true })
      .order("segment", { ascending: true })
      .order("year", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`mastr_children_by_year(${prefix}): ${error.message}`);
    const rows = (data ?? []) as Cell[];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
  throw new Error(`children(${prefix}) exceeded 60.000 cells`);
}

async function total(sup: Sup, prefix: string): Promise<number> {
  const { data, error } = await sup.rpc("mastr_region_series", { p_prefix: prefix, p_traeger: ["solar"] });
  if (error) throw new Error(`mastr_region_series(${prefix}): ${error.message}`);
  return (data ?? []).reduce((s: number, r: { count: number }) => s + Number(r.count), 0);
}

async function regionIds(sup: Sup, parent: string): Promise<Set<string>> {
  const { data, error } = await sup.from("mastr_regions").select("region_id").eq("parent_region_id", parent);
  if (error) throw new Error(`regions(${parent}): ${error.message}`);
  return new Set((data ?? []).map((r: { region_id: string }) => r.region_id));
}

type Problem = { where: string; detail: string };

async function main(): Promise<void> {
  const sup = await client();
  const problems: Problem[] = [];

  // ── 1. Duplicate cells ──────────────────────────────────────────────────────
  // A paging bug returns the same page twice; the sums then look merely "high",
  // which is exactly the kind of wrong nobody spots.
  log("Checking a Kreis read for duplicates...");
  const sample = await children(sup, "09679", 8);
  const keys = new Set(sample.map((c) => `${c.region_id}|${c.segment}|${c.year}`));
  if (keys.size !== sample.length) {
    problems.push({ where: "paging", detail: `${sample.length - keys.size} duplicate cells in Kreis 09679` });
  } else {
    log(`  ${nf(sample.length)} cells, no duplicates`, "ok");
  }

  // ── 2. DE = sum of Bundesländer ─────────────────────────────────────────────
  log("Checking Deutschland = sum of Bundesländer...");
  const deTotal = await total(sup, "");
  const blCells = await children(sup, "", 2);
  const blSum = blCells.reduce((s, c) => s + c.count, 0);
  if (deTotal !== blSum) {
    problems.push({ where: "de", detail: `total ${nf(deTotal)} vs sum of Bundesländer ${nf(blSum)}` });
  } else {
    log(`  ${nf(deTotal)} plants, consistent`, "ok");
  }

  // ── 3. Every Bundesland = sum of its Kreise, every Kreis = sum of Gemeinden ──
  // The Gemeinde level is where the two sources meet: MaStR supplies the plants,
  // Destatis the regions. A key MaStR knows and Destatis does not counts in the
  // total but appears in no ranking — that gap is what this measures.
  const blIds = Array.from(await regionIds(sup, "de")).sort();
  let unassignedTotal = 0;
  const unassignedKeys = new Set<string>();

  for (const bl of blIds) {
    const blTotal = await total(sup, bl);
    const kreisCells = await children(sup, bl, 5);
    const kreisSum = kreisCells.reduce((s, c) => s + c.count, 0);
    if (blTotal !== kreisSum) {
      problems.push({ where: `BL ${bl}`, detail: `total ${nf(blTotal)} vs sum of Kreise ${nf(kreisSum)}` });
    }

    const kreisIds = Array.from(await regionIds(sup, bl)).sort();
    for (const kreis of kreisIds) {
      const cells = await children(sup, kreis, 8);
      const known = await regionIds(sup, kreis);
      const listed = cells.filter((c) => known.has(c.region_id)).reduce((s, c) => s + c.count, 0);
      const orphan = cells.filter((c) => !known.has(c.region_id));
      const orphanSum = orphan.reduce((s, c) => s + c.count, 0);
      const kTotal = await total(sup, kreis);

      if (listed + orphanSum !== kTotal) {
        problems.push({
          where: `Kreis ${kreis}`,
          detail: `total ${nf(kTotal)} vs listed ${nf(listed)} + unassigned ${nf(orphanSum)}`,
        });
      }
      if (orphanSum > 0) {
        unassignedTotal += orphanSum;
        for (const o of orphan) unassignedKeys.add(o.region_id);
      }
    }
    log(`  ${bl}: ${nf(blTotal)} plants across ${kreisIds.length} Kreise`, "ok");
  }

  // ── 4. Slug uniqueness among siblings ───────────────────────────────────────
  // Paginated, and the count is asserted afterwards. The first version of this
  // check read the table in one go and reported "1.000 slugs checked" against
  // 11.361 regions — a green tick for a tenth of the data. The check fell into
  // exactly the silent 1000-row cap it exists to catch, which is why the count
  // is now compared against the table's own total rather than trusted.
  log("Checking slug uniqueness...");
  const { count: slugTotal, error: cntErr } = await sup
    .from("mastr_regions")
    .select("region_id", { count: "exact", head: true })
    .not("slug", "is", null);
  if (cntErr) throw new Error(`slug count: ${cntErr.message}`);

  const seen = new Map<string, string>();
  let read = 0;
  for (let from = 0; from < 60_000; from += 1000) {
    const { data, error } = await sup
      .from("mastr_regions")
      .select("region_id, parent_region_id, slug")
      .not("slug", "is", null)
      .order("region_id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`slug check: ${error.message}`);
    const rows = (data ?? []) as { region_id: string; parent_region_id: string; slug: string }[];
    read += rows.length;
    for (const r of rows) {
      const k = `${r.parent_region_id}/${r.slug}`;
      const prev = seen.get(k);
      if (prev) problems.push({ where: "slug", detail: `${k}: ${prev} vs ${r.region_id}` });
      else seen.set(k, r.region_id);
    }
    if (rows.length < 1000) break;
  }
  if (read !== (slugTotal ?? 0)) {
    problems.push({ where: "slug", detail: `read ${nf(read)} of ${nf(slugTotal ?? 0)} slugs — the check itself was truncated` });
  }
  log(`  ${nf(read)} of ${nf(slugTotal ?? 0)} slugs checked`, read === slugTotal ? "ok" : "err");

  // ── Report ──────────────────────────────────────────────────────────────────
  process.stderr.write("\n");
  if (unassignedTotal > 0) {
    const share = (unassignedTotal / deTotal) * 100;
    log(
      `${nf(unassignedTotal)} plants (${share.toFixed(3)} %) sit on ${unassignedKeys.size} Gemeinde keys the ` +
        `Gemeindeverzeichnis does not know — they count in every total but appear in no ranking`,
      share > 0.5 ? "err" : "warn",
    );
    for (const k of Array.from(unassignedKeys).slice(0, 10)) log(`    ${k}`);
    // A rounding error is tolerable and honest; a real share means the rankings
    // contradict the headline above them.
    if (share > 0.5) problems.push({ where: "coverage", detail: `${share.toFixed(2)} % of plants unassignable` });
  } else {
    log("Every plant sits on a Gemeinde the Gemeindeverzeichnis knows", "ok");
  }

  if (problems.length > 0) {
    log(`${problems.length} problem(s):`, "err");
    for (const p of problems.slice(0, 30)) log(`    ${p.where}: ${p.detail}`, "err");
    process.exit(1);
  }
  log("Atlas data consistent at every level", "ok");
}

main().catch((err) => {
  log((err as Error).message, "err");
  process.exit(1);
});
