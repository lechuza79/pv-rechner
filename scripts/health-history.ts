import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptyState, readState } from '../lib/health-incidents';

import { latestArtifactJson, selectHistory } from './lib/actions-artifact';
export { selectHistory };

function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('GITHUB_REPOSITORY missing');
  const gh = (args: string[]) => execFileSync('gh', args, { encoding: 'utf8' });
  mkdirSync('.health', { recursive: true });
  const data = JSON.parse(gh(['api', `repos/${repo}/actions/artifacts?name=health-incidents&per_page=100`]));
  const artifact = selectHistory(data.artifacts);
  if (!artifact) {
    if (!process.argv.includes('--bootstrap')) throw new Error('Incident history missing. Explicit bootstrap is required; refusing to silently reset incidents.');
    writeFileSync('.health/previous.json', JSON.stringify(emptyState()));
  } else {
    const dir = mkdtempSync(join(tmpdir(), 'health-history-'));
    try {
      const zip = execFileSync('gh', ['api', `repos/${repo}/actions/artifacts/${artifact.id}/zip`]);
      writeFileSync(join(dir, 'state.zip'), zip);
      execFileSync('unzip', ['-q', join(dir, 'state.zip'), '-d', dir]);
      const state = readState(JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')));
      writeFileSync('.health/previous.json', JSON.stringify(state));
      console.log(`Incident history restored from run ${artifact.workflow_run?.id}`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  // The repair ledger: absent is fine (no repair run yet), a failed read is not —
  // the health check then reports it as unreadable instead of "nothing silent".
  try {
    const ledger = latestArtifactJson(repo, 'autofix-ledger', 'ledger.json');
    if (ledger) writeFileSync('.health/autofix-ledger.json', JSON.stringify(ledger.json));
  } catch (e) {
    writeFileSync('.health/autofix-ledger.json', JSON.stringify({ version: 0, fehler: String(e) }));
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
