/**
 * Picks the ONE open health finding the next model run works on, and writes
 * the "attempt started" marker before the model runs. See lib/autofix-ledger.ts.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readState, type Finding, type IncidentState } from "../lib/health-incidents";
import { CHECK_DEFEKT, beginneVersuch, leeresLedger, modelllaeufeAmTag, readLedger, reparaturStand, waehleBefund, type Ledger } from "../lib/autofix-ledger";
import { tagInBerlin } from "../lib/zeit";
import { latestArtifactJson } from "./lib/actions-artifact";

/**
 * Which findings are open, given what triggered this run. A health run that
 * failed without leaving a report is itself the cause; a cancelled one says
 * nothing; a successful one without a report is a broken contract.
 */
export function offeneAusAusloeser(a: { event: string; conclusion?: string; state: IncidentState | null }): Finding[] {
  if (a.state) return Object.values(a.state.incidents);
  if (a.event === "workflow_run") {
    if (a.conclusion === "failure" || a.conclusion === "timed_out") return [CHECK_DEFEKT];
    if (a.conclusion === "cancelled") return [];
  }
  throw new Error("Health result missing; cannot determine open findings");
}

function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const out = process.env.GITHUB_OUTPUT;
  if (!repo || !out) throw new Error("Missing workflow context");
  const event = process.env.EVENT ?? "";
  const gh = (args: string[]) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

  let state: IncidentState | null = null;
  let healthRun = process.env.RUN_ID ?? "";
  if (event === "workflow_run") {
    const dir = mkdtempSync(join(tmpdir(), "health-"));
    try {
      gh(["run", "download", healthRun, "-n", "health-incidents", "-D", dir]);
      state = readState(JSON.parse(readFileSync(join(dir, "state.json"), "utf8")));
    } catch {
      state = null;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } else {
    const latest = latestArtifactJson(repo, "health-incidents", "state.json");
    if (latest) {
      state = readState(latest.json);
      healthRun = String(latest.runId ?? "");
    }
  }
  const offen = offeneAusAusloeser({ event, conclusion: process.env.CONCLUSION, state });

  const gespeichert = latestArtifactJson(repo, "autofix-ledger", "ledger.json");
  const ledger: Ledger = gespeichert ? readLedger(gespeichert.json) : leeresLedger();

  const jetzt = new Date();
  const tag = tagInBerlin(jetzt);
  // Two days back covers the Berlin day in any time zone offset.
  const seit = tagInBerlin(new Date(jetzt.getTime() - 2 * 86_400_000));
  // Paged, not capped: the workflow fires after every health check and CI run,
  // so two days held more than 100 runs (07.10.2026). The first version threw
  // there and stopped every repair; the count must cover all of them, because
  // it is the daily budget.
  const runs: { id: number }[] = [];
  for (let page = 1; ; page++) {
    const seite = JSON.parse(gh(["api", `repos/${repo}/actions/workflows/claude-autofix.yml/runs?per_page=100&page=${page}&created=>=${seit}`])).workflow_runs as { id: number }[];
    runs.push(...seite);
    if (seite.length < 100) break;
    if (page >= 20) throw new Error("Autofix run history beyond 2,000 runs in two days");
  }
  let laeufe = 0;
  for (const run of runs) {
    const r = JSON.parse(gh(["api", `repos/${repo}/actions/runs/${run.id}/jobs?filter=all&per_page=100`]));
    laeufe += modelllaeufeAmTag(r.jobs, tag);
  }

  const plan = waehleBefund({ offen, ledger, jetzt, modelllaeufeHeute: laeufe, manuell: process.env.MANUELL === "true" });
  console.log(`${offen.length} offene Befunde, ${laeufe} Reparaturläufe heute. ${plan.grund}`);
  for (const f of offen) console.log(`- ${f.key}: ${reparaturStand(f.key, ledger, jetzt)}`);
  if (!plan.befund) {
    appendFileSync(out, "key=\nuebrig=0\n");
    return;
  }
  const runId = Number(process.env.GITHUB_RUN_ID);
  mkdirSync(".autofix", { recursive: true });
  writeFileSync(".autofix/ledger.json", JSON.stringify(beginneVersuch(ledger, plan.befund, jetzt, runId), null, 2));
  const vorher = ledger.versuche.filter((v) => v.key === plan.befund!.key).slice(-3)
    .map((v) => `- ${v.tag}: ${v.ergebnis}${v.begruendung ? ` — ${v.begruendung}` : ""}${v.benoetigt ? ` (gebraucht: ${v.benoetigt})` : ""}`);
  const ende = `ENDE_${runId}`;
  appendFileSync(out, [
    `key=${plan.befund.key}`,
    `uebrig=${plan.uebrig}`,
    `health_run=${healthRun}`,
    `text<<${ende}`, plan.befund.text, ende,
    `vorher<<${ende}`, vorher.length ? vorher.join("\n") : "(noch kein Reparaturlauf für diesen Befund)", ende,
    "",
  ].join("\n"));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
