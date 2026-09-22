const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const paths = require('./paths.cjs');

test('every release asset is present in this checkout and matches its fingerprint', () => {
  const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'handoff-assets.json')));
  assert.ok(rows.length > 100);
  for (const row of rows) {
    assert.ok(row.path.startsWith('public/') && !row.path.split('/').includes('..'), row.path);
    const file = path.join(paths.repoRoot, row.path);
    assert.ok(!fs.lstatSync(file).isSymbolicLink(), row.path);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), row.sha256, row.path);
  }
});

test('all captured source files are local, complete and unchanged from their recorded inputs', () => {
  const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'vendor/source-manifest.json')));
  for (const row of rows) {
    const file = path.join(__dirname, 'vendor', row.origin, row.path);
    assert.ok(!fs.lstatSync(file).isSymbolicLink(), row.path);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), row.sha256, row.path);
  }
  for (const name of ['atlas-ranking.ts', 'ranking-felder.ts', 'story-ranking-month.ts']) {
    assert.ok(fs.existsSync(path.join(paths.storySourceRoot, 'lib', name)), name);
  }
});

test('built story inputs never resolve outside this checkout', () => {
  const metadata = JSON.parse(fs.readFileSync(path.join(__dirname, 'build/story-sources.json')));
  for (const input of Object.keys(metadata.inputs)) {
    const resolved = path.resolve(paths.repoRoot, input);
    assert.ok(resolved.startsWith(paths.repoRoot + path.sep), input);
  }
});
