import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type Job = { steps?: { name: string; conclusion: string | null; status: string; started_at?: string | null }[] };
export function usedModel(jobs: Job[], day: string): boolean {
  return jobs.some(job => job.steps?.some(step => step.name === 'Claude analysiert und behebt' && step.conclusion !== 'skipped' && step.status !== 'queued' && !!step.started_at?.startsWith(day)));
}
function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo || !process.env.GITHUB_OUTPUT) throw new Error('Missing workflow context');
  const api = (path: string) => JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const runs = api(`repos/${repo}/actions/workflows/claude-autofix.yml/runs?per_page=100&created=>=${since}`).workflow_runs;
  if (runs.length >= 100) throw new Error('Autofix budget history truncated');
  let used = false;
  for (const run of runs) {
    const result = api(`repos/${repo}/actions/runs/${run.id}/jobs?filter=all&per_page=100`);
    if (result.total_count > 100) throw new Error('Autofix job history truncated');
    if (usedModel(result.jobs, today)) { used = true; break; }
  }
  const proceed = !used || process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  console.log(proceed ? 'Analysis budget available.' : 'A model analysis already ran today. Findings remain open and can escalate.');
  appendFileSync(process.env.GITHUB_OUTPUT, `weiter=${proceed}\n`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
