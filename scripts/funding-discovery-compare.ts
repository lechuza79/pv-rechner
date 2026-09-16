/** Read-only paired audit. Both versions use live sources; no production writes. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FundingSourceReader, EVIDENCE_DIR } from "./lib/funding-source-reader";
import { sucheFoerderseite, setDiscoveryReaderForAudit } from "./funding-discover";

type Sample = { name: string; url: string };
async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("Pass a JSON sample of {name,url} entries");
  const sample = JSON.parse(readFileSync(input, "utf8")) as Sample[];
  const db = { from: () => ({ select: () => ({ range: async () => ({ data: [], error: null }) }) }) } as unknown as SupabaseClient;
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const frozen = process.env.FUNDING_BASELINE_FILE ? JSON.parse(readFileSync(process.env.FUNDING_BASELINE_FILE, "utf8")) as Record<string, unknown>[] : [];
  const results = [];
  for (const [index, item] of sample.entries()) {
    const previous = frozen.find(row => row.url === item.url);
    const pair: Record<string, unknown> = { ...item, ...(previous ? { legacy: previous.legacy, baselineFile: process.env.FUNDING_BASELINE_FILE } : {}) };
    for (const mode of ["legacy", "improved"] as const) {
      if (mode === "legacy" && previous) continue;
      const reader = new FundingSourceReader(db, `${index}-${mode}`, true, mode === "improved");
      setDiscoveryReaderForAudit(reader);
      pair[mode] = await reader.withEvidence(() => sucheFoerderseite(item.url, mode));
    }
    const before = pair.legacy as { value: { funde: { url: string }[] } };
    const after = pair.improved as typeof before;
    const old = new Set(before.value.funde.map(f => f.url));
    pair.additional = after.value.funde.filter(f => !old.has(f.url));
    results.push(pair);
    writeFileSync(resolve(EVIDENCE_DIR, "comparison.json"), JSON.stringify(results, null, 2));
    console.log(`${item.name}: ${before.value.funde.length} -> ${after.value.funde.length} candidate URLs`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
