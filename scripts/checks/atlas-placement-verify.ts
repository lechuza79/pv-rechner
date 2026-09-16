// Run with node --conditions react-server --env-file=.env.local --import tsx.
// Read-only full equality check against the unchanged ranking implementation.
import { deepStrictEqual } from "node:assert";
import { loadAwardStatsFresh } from "../../lib/awards-server";
import { computePlacements } from "../../lib/award-hook";
import { supabase } from "../../lib/supabase-server";

async function main() {
  if (!supabase) throw new Error("Database not configured");
  const stats = await loadAwardStatsFresh();
  const expected = computePlacements(stats);
  let checked = 0;
  for (let from = 0; ; from += 250) {
    const { data, error } = await supabase.from("atlas_platzierungen")
      .select("region_id,platzierungen").order("region_id").range(from, from + 249);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      deepStrictEqual(row.platzierungen, expected.get(row.region_id) ?? [], row.region_id);
      checked++;
    }
    if (!data || data.length < 250) break;
  }
  deepStrictEqual(checked, stats.length);
  if (!checked) throw new Error("No municipalities checked");
  console.log(`Exact placement equality: ${checked}/${stats.length} municipalities`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
