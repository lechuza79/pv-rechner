// Set `last_verified` on funding_programs rows in Supabase.
//
// Usage:
//   node scripts/set-funding-verified.mjs                 → all non-bund programs, date = today
//   node scripts/set-funding-verified.mjs 2026-07-01      → all non-bund, explicit date
//   node scripts/set-funding-verified.mjs 2026-07-01 id1 id2 ...  → only those ids
//
// Why a script, not a route: the funding watcher (scheduled task) sets the
// "Zuletzt geprüft" belief date after a full verification run. The page label
// (fundingStandLabel) reads `lastVerified`; this is the only writer for it
// besides a manual DB edit. Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY
// from .env.local. Service role only — never ship this to the client.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY in .env.local"); process.exit(1); }

const args = process.argv.slice(2);
const dateArg = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const date = dateArg ?? new Date().toISOString().slice(0, 10);
const explicitIds = args.filter((a) => a !== dateArg);

const sb = createClient(url, key);

let ids = explicitIds;
if (ids.length === 0) {
  const { data, error } = await sb.from("funding_programs").select("id, data");
  if (error) { console.error("Read failed:", error.message); process.exit(1); }
  ids = data.filter((r) => r.data?.level !== "bund").map((r) => r.id);
}

const { error, count } = await sb
  .from("funding_programs")
  .update({ last_verified: date }, { count: "exact" })
  .in("id", ids);

if (error) { console.error("Update failed:", error.message); process.exit(1); }
console.log(`last_verified=${date} gesetzt für ${count ?? ids.length} Programm(e).`);
