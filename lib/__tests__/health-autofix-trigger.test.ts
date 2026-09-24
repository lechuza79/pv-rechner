import { it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

it('runs the actual autofix gate shell for healthy, unhealthy, broken and malformed reports', () => {
  const workflow = readFileSync('.github/workflows/claude-autofix.yml','utf8');
  expect(workflow).toContain('github.event.workflow_run.head_repository.full_name == github.repository');
  const block = workflow.split('      - name: Read health result')[1].split('\n  autofix:')[0];
  const body = block.split('        run: |\n')[1].split('\n').map(l => l.slice(10)).join('\n');
  const dir = mkdtempSync(join(tmpdir(),'health-trigger-'));
  try {
    writeFileSync(join(dir,'gh'), '#!/bin/sh\n[ "$NO_ARTIFACT" = "1" ] && exit 1\nmkdir -p "$FIXTURE_DIR"\nprintf "%s" "$RESULT_JSON" > "$FIXTURE_DIR/result.json"\n', {mode:0o755});
    for (const sample of [
      {json:'{"version":1,"autofix":false}',conclusion:'success',expected:'repair=false'},
      {json:'{"version":1,"autofix":true}',conclusion:'success',expected:'repair=true'},
      {json:'',conclusion:'failure',missing:true,expected:'repair=true'},
      {json:'',conclusion:'success',missing:true,expected:null},
      {json:'',conclusion:'cancelled',missing:true,expected:'repair=false'},
      {json:'{"version":1}',conclusion:'success',expected:null},
    ]) {
      const out = join(dir,'output'); writeFileSync(out,'');
      let failed = false;
      try {
        execFileSync('bash',['-e','-c',body.replaceAll('/tmp/health',join(dir,'artifact'))], {env:{...process.env,PATH:`${dir}:${process.env.PATH}`,EVENT:'workflow_run',RUN_ID:'123',CONCLUSION:sample.conclusion,GITHUB_OUTPUT:out,FIXTURE_DIR:join(dir,'artifact'),RESULT_JSON:sample.json,NO_ARTIFACT:sample.missing?'1':'0'},stdio:'pipe'});
      } catch { failed = true; }
      expect(failed,JSON.stringify(sample)).toBe(sample.expected === null);
      if (sample.expected) expect(readFileSync(out,'utf8').trim()).toBe(sample.expected);
    }
  } finally { rmSync(dir,{recursive:true,force:true}); }
}, 20000);

it('countermeasurement has the same monitoring credentials and preserves non-measurement failure logs', () => {
  const health = readFileSync('.github/workflows/health-check.yml','utf8');
  const repair = readFileSync('.github/workflows/claude-autofix.yml','utf8');
  const counter = repair.split('      - name: Gegenmessung')[1].split('      - name:')[0];
  const credentials = [...health.matchAll(/^\s+([A-Z_]+): \$\{\{ secrets\./gm)].map(m=>m[1]);
  expect(credentials).toContain('CRON_SECRET');
  for (const key of credentials) expect(counter,`countermeasurement lacks ${key}`).toContain(`${key}:`);
  const trigger = repair.split('      - name: Auslösenden Befund holen')[1].split('      # Zusätzlich')[0];
  expect(trigger).toContain('--log > /tmp/ausloeser.txt');
  expect(trigger).not.toContain('sed -n');
});
