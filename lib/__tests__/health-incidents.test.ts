import { describe, it, expect } from 'vitest';
import { advanceIncidents, emptyState, readState, type Finding } from '../health-incidents';
import { readFileSync } from 'node:fs';
const now = '2026-09-16T10:00:00Z';
const a: Finding = { key: 'atlas-cold-latency', text: '7.72 seconds' };
const b: Finding = { key: 'db-latency:municipality', text: '1200 ms' };
const next = (state = emptyState(), findings = [a], unknown: string[] = []) => advanceIncidents(state, findings, now, unknown);

describe('cause-specific incident lifecycle', () => {
  it('reproduces the old red-series bug: A,A,B must not escalate B', () => {
    const second = next(next().state);
    const switched = next(second.state, [b]);
    expect(switched.escalations).toEqual([]);
    expect(switched.recovered.map(i => i.key)).toEqual([a.key]);
    expect(switched.state.incidents[b.key].count).toBe(1);
  });
  it('escalates exactly once on the third observation despite changing timings', () => {
    const second = next(next().state, [{ ...a, text: '6.10 seconds' }]);
    const third = next(second.state);
    expect(third.escalations).toHaveLength(1);
    expect(next(third.state).escalations).toEqual([]);
    expect(third.autofix).toBe(true);
  });
  it('new cause is independent while another stays open', () => {
    let state = next(next(next().state).state).state;
    for (let i = 0; i < 2; i++) { const r = next(state, [a,b]); expect(r.escalations).toEqual([]); state = r.state; }
    expect(next(state, [a,b]).escalations.map(i => i.key)).toEqual([b.key]);
  });
  it('reports recovery, then escalates recurrence again', () => {
    const red = next(emptyState(), [{ ...a, urgent: true }]);
    const green = next(red.state, []);
    expect(green.recovered).toHaveLength(1);
    expect(green.autofix).toBe(false);
    expect(next(green.state, [{ ...a, urgent: true }]).escalations).toHaveLength(1);
  });
  it('security/outage and operator findings are immediate but deduplicated', () => {
    for (const finding of [{...a, urgent:true}, {...a, operator:true}]) {
      const first = next(emptyState(), [finding]);
      expect(first.escalations).toHaveLength(1);
      expect(next(first.state, [finding]).escalations).toEqual([]);
      expect(first.autofix).toBe(!("operator" in finding && finding.operator));
    }
  });
  it('missing cold evidence does not claim recovery or count another observation', () => {
    const first = next();
    const unmeasured = next(first.state, [], [a.key]);
    expect(unmeasured.recovered).toEqual([]);
    expect(unmeasured.state.incidents[a.key].count).toBe(1);
  });
  it('same-run samples cannot manufacture persistence', () => {
    expect(next(emptyState(), [a,a,a]).state.incidents[a.key].count).toBe(1);
  });
  it('damaged state fails loudly', () => {
    expect(() => readState({version:1, incidents:{a:{}}})).toThrow();
    expect(() => readState({version:2, incidents:{}})).toThrow();
    expect(readState(next().state)).toEqual(next().state);
  });
});

describe('workflow delivery contract', () => {
  const health = readFileSync('.github/workflows/health-check.yml', 'utf8');
  const repair = readFileSync('.github/workflows/claude-autofix.yml', 'utf8');
  it('serializes the ledger and persists before the only intentional failure', () => {
    expect(health).toContain('cancel-in-progress: false');
    expect(health.indexOf('actions/upload-artifact@')).toBeLessThan(health.indexOf('- name: Neue Eskalation'));
    expect(health).toContain("if: steps.check.outputs.escalate == 'true'");
    expect(health).not.toContain('continue-on-error');
    expect(health).not.toContain('set +e');
  });
  it('autofix uses the measured report even when the workflow is successful', () => {
    expect(repair).toContain('types: [completed]');
    expect(repair).toContain('.autofix | tostring');
    expect(repair).toContain("if: needs.incident.outputs.repair == 'true'");
    expect(repair).toContain('[ "$CONCLUSION" = "failure" ]');
  });
});

import { selectHistory } from '../../scripts/health-history';
it('restores the latest persisted main report, including failed runs, not branch/expired artifacts; a prior attempt of the current run is retained', () => {
  const artifact = (id: number, branch = 'main', expired = false) => ({id,expired,workflow_run:{id,head_branch:branch,repository_id:1,head_repository_id:1}});
  expect(selectHistory([artifact(3),artifact(4),artifact(7,'topic'),artifact(8,'main',true),artifact(9)])?.id).toBe(9);
  expect(selectHistory([{...artifact(99),workflow_run:{id:99,head_branch:'main',repository_id:1,head_repository_id:2}}])).toBeUndefined();
  expect(selectHistory([])).toBeUndefined();
});
