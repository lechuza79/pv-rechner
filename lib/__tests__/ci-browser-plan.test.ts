import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { groups, selectPlan, planForEvent, smokeMatches, gatePasses, verifyDiscovery } from '../../scripts/ci-browser-plan.cjs';

const widget = 'components/charts/AnnualGrowthWidget.tsx';
const dialog = 'components/EinbettenDialog.tsx';
const sha = 'a'.repeat(40);
const base = 'b'.repeat(40);

describe('Conservative browser scope', () => {
  it('keeps all mapped owner tests plus the site-wide smoke baseline', () => {
    const plan = selectPlan([widget, dialog]);
    expect(plan.mode).toBe('targeted');
    expect(plan.specs).toEqual([...new Set(['e2e/rundgang.spec.ts', ...groups.flatMap(group => group.specs)])].sort());
    expect(smokeMatches(JSON.stringify(plan))).toHaveLength(plan.specs.length);
  });
  it.each(['components/ExportableWidgetFrame.tsx', 'app/globals.css', 'package-lock.json', 'lib/pv.ts', '.github/workflows/ci.yml', 'playwright.config.ts', 'scripts/ci-browser-plan.cjs', 'unknown.ts', 'docs/anleitung/tests.md', 'e2e/rundgang.spec.ts'])(
    'runs everything for shared, unmapped or policy changes: %s', (path) => {
      expect(selectPlan([widget, path]).mode).toBe('full');
    },
  );
  it('does not scope test-only changes or an empty comparison', () => {
    expect(selectPlan(['e2e/annual-growth-embed.spec.ts']).mode).toBe('full');
    expect(selectPlan([]).mode).toBe('full');
    expect(selectPlan([widget, 'e2e/annual-growth-embed.spec.ts']).mode).toBe('targeted');
  });
  it('falls back when an owned test is deleted', () => {
    expect(selectPlan([widget], () => false).mode).toBe('full');
  });
  it.each(['schedule', 'workflow_dispatch', 'unknown'])('runs full for %s', (event) => {
    expect(planForEvent(event, {}, sha).mode).toBe('full');
  });
  it('uses the PR merge base and the tested merge commit, including rename source paths', () => {
    const calls: string[][] = [];
    const git = (...args: string[]) => {
      calls.push(args);
      return args[0] === 'merge-base' ? base : `${widget}\0components/UnknownPreviousName.tsx\0`;
    };
    const plan = planForEvent('pull_request', {pull_request: {base: {sha: base}, head: {sha}}}, sha, git);
    expect(plan.mode).toBe('full');
    expect(calls[1]).toEqual(['diff', '--name-only', '-z', '--no-renames', base, sha, '--']);
  });
  it('compares the entire push, not just its last commit', () => {
    const calls: string[][] = [];
    expect(planForEvent('push', {before: base}, sha, (...args: string[]) => {
      calls.push(args); return `${widget}\0`;
    }).mode).toBe('targeted');
    expect(calls[0]).toContain(base);
  });
  it('fails closed for absent/zero bases, malformed commits and failed git commands', () => {
    for (const before of [undefined, '0'.repeat(40), '--help']) {
      expect(planForEvent('push', {before}, sha).mode).toBe('full');
    }
    expect(planForEvent('push', {before: base}, sha, () => {throw new Error('missing history');}).mode).toBe('full');
    expect(planForEvent('pull_request', {}, sha).mode).toBe('full');
  });
  it.each(['{}', '{', '{"mode":"targeted","specs":[]}', '{"mode":"full","specs":["other"]}', '{"mode":"targeted","specs":["e2e/rundgang.spec.ts","other"]}'])(
    'rejects invalid selection %s', raw => expect(() => smokeMatches(raw)).toThrow(),
  );
  it('keeps full/default local discovery unchanged', () => {
    expect(smokeMatches(undefined)).toBeUndefined();
    expect(smokeMatches('{"mode":"full","specs":[]}')).toBeUndefined();
  });
  it('rejects plans whose named spec has no actual Playwright tests', () => {
    const plan = {specs: ['e2e/annual-growth-embed.spec.ts']};
    expect(() => verifyDiscovery(plan, {suites: []})).toThrow();
    expect(() => verifyDiscovery(plan, {suites: [{specs: [{file: 'annual-growth-embed.spec.ts', tests: [{}]}]}]})).not.toThrow();
    expect(() => verifyDiscovery(plan, {suites: [{specs: [{file: 'annual-growth-embed.spec.ts', tests: []}]}]})).toThrow();
  });
  it('actually discovers every mapped spec through Playwright', () => {
    const plan = selectPlan(groups.flatMap(group => group.files));
    const output = execFileSync('node', ['node_modules/@playwright/test/cli.js', 'test', '--project=smoke', '--list', '--reporter=json'], {
      encoding: 'utf8', env: {...process.env, CI_BROWSER_PLAN: JSON.stringify(plan)}, maxBuffer: 20 * 1024 * 1024,
    });
    expect(() => verifyDiscovery(plan, JSON.parse(output))).not.toThrow();
  }, 30000);
});

describe('Required gate', () => {
  const success = Object.fromEntries(['plan', 'unit', 'build', 'smoke', 'flows', 'telefon', 'kontrast'].map(job => [job, {result: 'success'}]));
  it('requires every group in full mode and intentional flow skip in targeted mode', () => {
    expect(gatePasses('full', success)).toBe(true);
    expect(gatePasses('targeted', {...success, flows: {result: 'skipped'}})).toBe(true);
    expect(gatePasses('full', {...success, flows: {result: 'skipped'}})).toBe(false);
    expect(gatePasses('', success)).toBe(false);
  });
  it.each(Object.keys(success))('cannot hide a failed/cancelled/missing job: %s', job => {
    for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
      expect(gatePasses('full', {...success, [job]: {result}})).toBe(false);
      if (job !== 'flows') expect(gatePasses('targeted', {...success, flows: {result: 'skipped'}, [job]: {result}})).toBe(false);
    }
  });
  it('wires the selection and all checks into the unchanged protected gate', () => {
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(workflow).toContain('cron: "30 0 * * *"');
    expect(workflow).toContain('fetch-depth: 0');
    expect(workflow).toContain('CI_BROWSER_PLAN: ${{ needs.plan.outputs.plan }}');
    expect(workflow).toContain("if: needs.plan.outputs.mode == 'full'");
    expect(workflow).toContain('needs: [plan, unit, build, smoke, flows, telefon, kontrast]');
    expect(workflow).toContain('name: Type check + unit tests + e2e smoke');
    expect(workflow).toContain('node scripts/ci-browser-plan.cjs verify');
  });
});
