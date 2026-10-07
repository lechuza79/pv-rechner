/**
 * Ships a repair commit to main the only way main accepts it: the required
 * gate check must have passed on that exact commit, and the commit must
 * contain main (branch protection, strict). The model pushes its fix to its
 * own branch; this step runs the gate there, waits for the verdict and
 * fast-forwards main. Measured on 07.10.2026: the first repair that worked
 * pushed straight to main and was refused by the branch protection.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const PFLICHTPRUEFUNG = "Type check + unit tests + e2e smoke";
const MAX_RUNDEN = 3;
const WARTEN_MIN = 35;

export type Pruefung = { status: string; conclusion: string | null } | undefined;
export type Schritt = "warten" | "uebernehmen" | "neu_aufsetzen" | "abgelehnt";

/** What to do with a fix commit, given its gate check and whether it contains main. */
export function lieferSchritt(p: Pruefung, enthaeltMain: boolean): Schritt {
  if (!p || p.status !== "completed") return "warten";
  if (p.conclusion !== "success") return "abgelehnt";
  return enthaeltMain ? "uebernehmen" : "neu_aufsetzen";
}

/** The commit the model reports must be the head of its own branch — nothing else is shipped. */
export function zweigFuer(runId: number | string): string {
  return `autofix/${runId}`;
}

function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GH_TOKEN;
  const out = process.env.GITHUB_OUTPUT;
  if (!repo || !token || !out) throw new Error("Missing workflow context");
  const zweig = zweigFuer(process.env.GITHUB_RUN_ID ?? "");
  const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const gh = (...a: string[]) => execFileSync("gh", a, { encoding: "utf8" });
  const ende = (zeile: string) => { appendFileSync(out, `${zeile}\n`); console.log(zeile); };

  let behauptet = "";
  try { behauptet = String(JSON.parse(process.env.STRUCTURED ?? "").commit ?? ""); } catch { /* checked below */ }
  git("remote", "set-url", "origin", `https://x-access-token:${token}@github.com/${repo}.git`);
  try { git("fetch", "-q", "origin", "main", zweig); } catch { return ende(`abgelehnt=Der Fix-Zweig ${zweig} existiert nicht — der Lauf hat seinen Fix nicht dorthin geschoben.`); }
  let sha = git("rev-parse", `origin/${zweig}`);
  if (!behauptet || !sha.startsWith(behauptet)) return ende(`abgelehnt=Der gemeldete Commit (${behauptet || "keiner"}) ist nicht die Spitze von ${zweig}.`);

  for (let runde = 1; runde <= MAX_RUNDEN; runde++) {
    gh("workflow", "run", "ci.yml", "--ref", zweig);
    const bis = Date.now() + WARTEN_MIN * 60_000;
    let schritt: Schritt = "warten";
    while (Date.now() < bis) {
      execFileSync("sleep", ["30"]);
      const runs = JSON.parse(gh("api", `repos/${repo}/commits/${sha}/check-runs?check_name=${encodeURIComponent(PFLICHTPRUEFUNG)}`)).check_runs as Pruefung[];
      git("fetch", "-q", "origin", "main");
      let enthaelt = true;
      try { git("merge-base", "--is-ancestor", "origin/main", sha); } catch { enthaelt = false; }
      schritt = lieferSchritt(runs[0], enthaelt);
      if (schritt !== "warten") break;
    }
    if (schritt === "warten") return ende(`abgelehnt=Die Pflichtprüfung auf ${sha.slice(0, 7)} kam in ${WARTEN_MIN} Minuten zu keinem Urteil.`);
    if (schritt === "abgelehnt") return ende(`abgelehnt=Der Fix ${sha.slice(0, 7)} fiel in der Pflichtprüfung durch (Zweig ${zweig}).`);
    if (schritt === "uebernehmen") {
      try { git("push", "origin", `${sha}:refs/heads/main`); } catch (e) {
        if (runde === MAX_RUNDEN) return ende(`abgelehnt=main nahm ${sha.slice(0, 7)} nicht an: ${String(e).split("\n")[0]}`);
        continue; // main moved between check and push: set up again
      }
      try { git("push", "-q", "origin", "--delete", zweig); } catch { /* the branch is only a vehicle */ }
      try { gh("workflow", "run", "health-check.yml", "--ref", "main"); } catch { /* next scheduled check measures anyway */ }
      return ende(`geliefert=${sha}`);
    }
    // main moved on: put the fix on top and run the gate again.
    try {
      git("reset", "-q", "--hard");
      git("checkout", "-q", "-B", "autofix-liefern", sha);
      git("-c", "user.name=claude[bot]", "-c", "user.email=noreply@solar-check.io", "rebase", "-q", "origin/main");
      git("push", "-q", "--force", "origin", `HEAD:refs/heads/${zweig}`);
      sha = git("rev-parse", "HEAD");
    } catch {
      return ende(`abgelehnt=Der Fix ${sha.slice(0, 7)} ließ sich nicht auf den neuen Stand von main setzen (Konflikt).`);
    }
  }
  return ende(`abgelehnt=main bewegte sich in ${MAX_RUNDEN} Runden jedes Mal weiter.`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
