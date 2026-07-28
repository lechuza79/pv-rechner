// Set `last_verified` on funding_programs rows in Supabase.
//
// Usage:
//   node scripts/set-funding-verified.mjs 2026-07-01 id1 id2 ...  → only those ids
//   node scripts/set-funding-verified.mjs --all 2026-07-01        → every non-bund program
//
// Why a script, not a route: the funding watcher (scheduled task) sets the
// "Zuletzt geprüft" belief date after a verification run. The page label
// (fundingStandLabel) reads `lastVerified`; this is the only writer for it
// besides a manual DB edit. Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY
// from .env.local. Service role only — never ship this to the client.
//
// `--all` is opt-in and NOT the default (changed 28.07.2026). It used to be:
// running the script bare stamped today's date on every program. A news-watcher
// run that verified exactly ONE program (Frankfurt) called it that way and wrote
// "Zuletzt geprüft: heute" onto 36 region pages — 35 of them untrue. That date is
// the trust signal the pages are built on; a wrong one is the worst class of bug
// this project has (see CLAUDE.md, "Zahlen und Einheiten"). Only a FULL run per
// scripts/foerder-verify.md may pass --all; anything else names its ids.
// Repair, if it happens again: set last_verified back to NULL for the programs
// that were not actually checked — the label then honestly falls back to the
// editorial `stand` from the code seed.

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
const all = args.includes("--all");
const dateArg = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const date = dateArg ?? new Date().toISOString().slice(0, 10);
const explicitIds = args.filter((a) => a !== dateArg && a !== "--all");

if (!all && explicitIds.length === 0) {
  console.error(
    "Keine Programm-Ids angegeben.\n" +
    "Das Prüfdatum wird auf den Seiten als \"Zuletzt geprüft\" angezeigt — es darf nur\n" +
    "auf Programmen stehen, die in diesem Lauf wirklich gegen die Trägerquelle geprüft\n" +
    "wurden. Nenne die Ids:\n" +
    "  node scripts/set-funding-verified.mjs 2026-07-01 frankfurt-klimabonus\n" +
    "Nur nach einem VOLL-Lauf (scripts/foerder-verify.md) ist --all zulässig.",
  );
  process.exit(1);
}

const sb = createClient(url, key);

let ids = explicitIds;
if (all) {
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
