/**
 * Closes the attempt the plan opened: checks the model's verdict against main
 * and records it. A run without a checkable verdict is recorded as SILENT and
 * fails this workflow — and the next health check reports it as a finding.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { bewerteErgebnis, readLedger, schliesseVersuch } from "../lib/autofix-ledger";

export function commitAufMain(sha: string): boolean {
  try {
    execFileSync("git", ["fetch", "-q", "origin", "main"], { stdio: "pipe" });
    execFileSync("git", ["merge-base", "--is-ancestor", sha, "origin/main"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const key = process.env.KEY;
  const runId = Number(process.env.GITHUB_RUN_ID);
  if (!key || !process.env.GITHUB_OUTPUT) throw new Error("Missing workflow context");
  const ledger = readLedger(JSON.parse(readFileSync(".autofix/ledger.json", "utf8")));
  const b = bewerteErgebnis(process.env.STRUCTURED, commitAufMain);
  writeFileSync(".autofix/ledger.json", JSON.stringify(schliesseVersuch(ledger, runId, key, b, new Date()), null, 2));
  const zeile = `Reparatur ${key}: ${b.ergebnis} — ${b.begruendung}${b.benoetigt ? ` (gebraucht: ${b.benoetigt})` : ""}`;
  console.log(zeile);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ${zeile}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `ergebnis=${b.ergebnis}\n`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
