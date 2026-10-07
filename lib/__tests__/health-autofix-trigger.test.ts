import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

it('countermeasurement has the same monitoring credentials and preserves non-measurement failure logs', () => {
  const health = readFileSync('.github/workflows/health-check.yml','utf8');
  const repair = readFileSync('.github/workflows/claude-autofix.yml','utf8');
  const counter = repair.split('      - name: Gegenmessung')[1].split('      - name:')[0];
  const credentials = [...health.matchAll(/^\s+([A-Z_]+): \$\{\{ secrets\./gm)].map(m=>m[1]);
  expect(credentials).toContain('CRON_SECRET');
  for (const key of credentials) expect(counter,`countermeasurement lacks ${key}`).toContain(`${key}:`);
  expect(repair).toContain('github.event.workflow_run.head_repository.full_name == github.repository');
  const trigger = repair.split('      - name: Auslösenden Befund holen')[1].split('      # Zusätzlich')[0];
  expect(trigger).toContain('--log > /tmp/ausloeser.txt');
  expect(trigger).not.toContain('sed -n');
});
