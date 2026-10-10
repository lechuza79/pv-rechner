import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// GitHub artifacts are durable across runners; cache eviction is not a ledger.
type Artifact = { id: number; created_at: string; expired: boolean; workflow_run?: { id: number; head_branch: string; repository_id: number; head_repository_id: number } };
export function selectHistory(artifacts: Artifact[]) {
  return artifacts.filter(a => !a.expired && a.workflow_run?.head_branch === 'main' && typeof a.workflow_run.repository_id === 'number' && a.workflow_run.head_repository_id === a.workflow_run.repository_id).sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id)[0];
}

/**
 * Reads one JSON file from the newest non-expired artifact of that name that
 * was produced on main. Returns null when no such artifact exists; throws on
 * any other failure (an unreadable artifact is not an empty one).
 */
export function latestArtifactJson(repo: string, name: string, file: string, timeout = 60_000): { json: unknown; runId?: number } | null {
  const gh = (args: string[]) => execFileSync("gh", args, { timeout, maxBuffer: 64 * 1024 * 1024 });
  const data = JSON.parse(gh(["api", `repos/${repo}/actions/artifacts?name=${name}&per_page=100`]).toString("utf8"));
  const artifact = selectHistory(data.artifacts);
  if (!artifact) return null;
  const dir = mkdtempSync(join(tmpdir(), `${name}-`));
  try {
    writeFileSync(join(dir, "a.zip"), gh(["api", `repos/${repo}/actions/artifacts/${artifact.id}/zip`]));
    execFileSync("unzip", ["-q", join(dir, "a.zip"), "-d", dir]);
    return { json: JSON.parse(readFileSync(join(dir, file), "utf8")), runId: artifact.workflow_run?.id };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
