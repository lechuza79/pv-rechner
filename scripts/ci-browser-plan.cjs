const { appendFileSync, existsSync, readFileSync } = require('node:fs');
const { execFileSync, spawnSync } = require('node:child_process');

// Explicit leaf ownership only. Shared frames, registries, data/calculation code,
// configuration and unknown paths deliberately fall back to the complete suite.
const groups = [
  {
    files: ['components/PartnerWidgetConfigurator.tsx', 'components/PartnerWidgetConfigurator.module.css', 'components/EinbettenDialog.tsx'],
    specs: ['e2e/annual-growth-embed.spec.ts', 'e2e/embed-auf-eigener-seite.spec.ts', 'e2e/widget-modal-layout.spec.ts', 'e2e/widget-export.spec.ts', 'e2e/lizenz-abgrenzung.spec.ts'],
  },
  {
    files: ['components/charts/AnnualGrowthWidget.tsx'],
    specs: ['e2e/annual-growth-embed.spec.ts', 'e2e/widget-allocated-layout.spec.ts', 'e2e/gemeindeseite.spec.ts', 'e2e/landkreis-vorschau.spec.ts', 'e2e/widget-export.spec.ts', 'e2e/zubau-vergleich.spec.ts'],
  },
];
const baseline = ['e2e/rundgang.spec.ts'];
const fullPlan = (reason) => ({ mode: 'full', specs: [], reason });

function selectPlan(paths, available = existsSync) {
  if (!paths.length) return fullPlan('No reliable changed-file set');
  const selected = new Set(baseline);
  // Test edits are accepted only alongside their owning source change. A test
  // change alone, or any unknown path, must not silently narrow coverage.
  const owners = groups.filter((group) => group.files.some((file) => paths.includes(file)));
  for (const path of paths) {
    const owner = owners.find((group) => group.files.includes(path) || group.specs.includes(path));
    if (!owner) return fullPlan(`Unmapped or shared file: ${path}`);
    for (const spec of owner.specs) selected.add(spec);
  }
  const specs = [...selected].sort();
  if (specs.some((spec) => !available(spec))) return fullPlan('Mapped test file is missing');
  return { mode: 'targeted', specs, reason: 'All changed files have explicit leaf ownership' };
}

function planForEvent(eventName, event, sha, git = (...args) => execFileSync('git', args, { encoding: 'utf8' })) {
  if (!['pull_request', 'push'].includes(eventName)) return fullPlan('Scheduled/manual/unknown event: complete suite');
  try {
    const validSha = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value) && !/^0+$/.test(value);
    if (!validSha(sha)) return fullPlan('Missing checked-out commit');
    let base;
    if (eventName === 'pull_request') {
      const pr = event.pull_request;
      if (!validSha(pr?.base?.sha) || !validSha(pr?.head?.sha)) return fullPlan('Missing PR comparison');
      base = git('merge-base', pr.base.sha, pr.head.sha).trim();
    } else {
      base = event.before;
    }
    if (!validSha(base)) return fullPlan('Missing diff base');
    // --no-renames includes BOTH sides of a rename. Compare the tested merge
    // commit for PRs, including base-branch changes since the branch diverged.
    const paths = git('diff', '--name-only', '-z', '--no-renames', base, sha, '--').split('\0').filter(Boolean);
    return selectPlan(paths);
  } catch {
    return fullPlan('Comparison unavailable: complete suite');
  }
}

function smokeMatches(raw) {
  if (!raw) return undefined; // Local/default runs keep the complete suite.
  const plan = JSON.parse(raw);
  if (plan.mode === 'full' && Array.isArray(plan.specs) && plan.specs.length === 0) return undefined;
  const allowed = new Set([...baseline, ...groups.flatMap((group) => group.specs)]);
  if (plan.mode !== 'targeted' || !Array.isArray(plan.specs) || !plan.specs.includes(baseline[0]) || plan.specs.length < 2 || plan.specs.some((spec) => !allowed.has(spec) || !existsSync(spec))) {
    throw new Error('Invalid browser-test plan; refusing a partial green run');
  }
  return plan.specs.map((spec) => `**/${spec}`);
}

function gatePasses(mode, results) {
  if (!['full', 'targeted'].includes(mode)) return false;
  return ['plan', 'unit', 'build', 'smoke', 'telefon', 'kontrast'].every((job) => results[job]?.result === 'success')
    && results.flows?.result === (mode === 'full' ? 'success' : 'skipped');
}

function verifyDiscovery(plan, report) {
  const found = new Set();
  function visit(suite) {
    for (const spec of suite.specs ?? []) {
      if (spec.tests?.length) found.add(spec.file.replaceAll('\\', '/').replace(/^.*\/e2e\//, ''));
    }
    for (const child of suite.suites ?? []) visit(child);
  }
  visit(report);
  if (report.errors?.length || plan.specs.some((spec) => !found.has(spec.replace(/^e2e\//, '')))) {
    throw new Error('A selected spec has no discovered smoke tests');
  }
}

module.exports = { groups, fullPlan, selectPlan, planForEvent, smokeMatches, gatePasses, verifyDiscovery };

if (require.main === module) {
  const command = process.argv[2];
  if (command === 'gate') {
    if (!gatePasses(process.env.CI_PLAN_MODE, JSON.parse(process.env.CI_JOB_RESULTS ?? '{}'))) process.exit(1);
  } else if (command === 'verify') {
    const raw = process.env.CI_BROWSER_PLAN;
    smokeMatches(raw);
    if (raw && JSON.parse(raw).mode === 'targeted') {
      const run = spawnSync('npx', ['playwright', 'test', '--project=smoke', '--list', '--reporter=json'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
      if (run.status !== 0) throw new Error(run.stderr || 'Test discovery failed');
      verifyDiscovery(JSON.parse(raw), JSON.parse(run.stdout));
    }
  } else if (command === 'plan') {
    let plan;
    try {
      plan = planForEvent(process.env.GITHUB_EVENT_NAME, JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')), process.env.GITHUB_SHA);
    } catch { plan = fullPlan('Event unavailable: complete suite'); }
    appendFileSync(process.env.GITHUB_OUTPUT, `mode=${plan.mode}\nplan=${JSON.stringify(plan)}\n`);
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Browser test scope: ${plan.mode}\n\n${plan.reason}\n\n${plan.specs.join('\n')}\n\nTypecheck, unit tests, build, phone/menu and contrast checks always run.\n`);
  } else { throw new Error('Expected plan, verify or gate'); }
}
