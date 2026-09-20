/**
 * Monthly upkeep of the local ERA5 archive.
 *
 * Makes sure every hour a preparation run will ask for is on disk, checks that
 * it really is, and leaves a manifest saying so. Safe to run again at any time:
 * finished blocks are skipped without a request, and a run that dies halfway
 * leaves no manifest for the block it was working on.
 *
 * It deliberately does not start the story preparation itself — that runner
 * holds its own lock and belongs to the preparation run, not to the download.
 *
 *   npm run era5:monat -- --month=2026-08 --jahr=2025
 *   npm run era5:monat -- --month=2026-08 --revision   (auf Überarbeitung prüfen)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import {
  ERA5_VARIABLES,
  era5ChunksFor,
  era5HourOf,
  era5IsoOf,
  type Era5Variable,
} from '../lib/era5-archive';
import { era5BlockReady, era5ReadManifest, ERA5_STORE_ROOT } from '../lib/era5-store';

const arg = (key: string, fallback = '') =>
  process.argv.find((a) => a.startsWith('--' + key + '='))?.slice(key.length + 3) ?? fallback;
const flag = (key: string) => process.argv.includes('--' + key);
const iso = (ms: number) => new Date(ms).toISOString();

const month = arg('month');
if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('--month=JJJJ-MM angeben.');
const [year, monthNumber] = month.split('-').map(Number);
/** The annual profile shows the year before the register month, as the run does. */
const annualYear = Number(arg('jahr', String(year - (monthNumber <= 2 ? 2 : 1))));

const ranges = [
  { label: month, from: era5HourOf(iso(Date.UTC(year, monthNumber - 1, 0))), to: era5HourOf(iso(Date.UTC(year, monthNumber, 1))) },
  { label: String(annualYear), from: era5HourOf(iso(Date.UTC(annualYear, 0, 1))), to: era5HourOf(iso(Date.UTC(annualYear + 1, 0, 1))) },
];

function sync(args: string[]) {
  execFileSync('npx', ['tsx', 'scripts/era5-sync.ts', ...args], { stdio: 'inherit' });
}
async function main() {
if (!flag('nur-pruefen')) {
  sync([`--month=${month}`, '--parallel=' + arg('parallel', '3')]);
  sync([`--year=${annualYear}`, '--parallel=' + arg('parallel', '3')]);
}

/** Every block every range needs, checked against the store rather than assumed. */
const missing: string[] = [];
const blocks: { variable: Era5Variable; chunk: number; sourceLastModified: string | null; retrievedAt: string }[] = [];
for (const range of ranges) {
  for (const chunk of era5ChunksFor(range.from, range.to)) {
    for (const variable of ERA5_VARIABLES) {
      if (!era5BlockReady(variable, chunk)) { missing.push(`${variable}/${chunk}`); continue; }
      const entry = era5ReadManifest(variable, chunk);
      blocks.push({ variable, chunk, sourceLastModified: entry.sourceLastModified, retrievedAt: entry.retrievedAt });
    }
  }
}

if (flag('revision')) {
  // We can see THAT the archive rewrote a block, not that it switched from the
  // preliminary to the final stream — the archive does not publish that flag.
  // A rewrite is therefore a finding to look at, never an automatic overwrite
  // of figures that have already been prepared.
  const seen = new Map<string, { variable: Era5Variable; chunk: number; stored: string | null }>();
  for (const block of blocks) seen.set(`${block.variable}/${block.chunk}`, { variable: block.variable, chunk: block.chunk, stored: block.sourceLastModified });
  const changed: string[] = [];
  for (const [label, entry] of Array.from(seen)) {
    const url = `https://openmeteo.s3.amazonaws.com/data/copernicus_era5/${entry.variable}/chunk_${entry.chunk}.om`;
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30000) });
    const now = response.headers.get('last-modified');
    if (now !== entry.stored) changed.push(`${label}: gespeichert ${entry.stored ?? '?'} → jetzt ${now ?? '?'}`);
  }
  console.log(changed.length ? `\n${changed.length} Blöcke wurden im Archiv überarbeitet:` : '\nKein Block wurde im Archiv überarbeitet.');
  for (const line of changed) console.log('  ' + line);
  if (changed.length) {
    console.log('Bestehende Berechnungsstände bleiben unverändert. Zum Neuladen: era5:sync mit --revision.');
  }
}

if (missing.length) {
  console.error(`\nFehlende Blöcke: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  const manifest = {
    month,
    annualYear,
    ranges: ranges.map((range) => ({ label: range.label, from: era5IsoOf(range.from), to: era5IsoOf(range.to - 1) })),
    variables: ERA5_VARIABLES,
    blocks: blocks.length,
    completedAt: new Date().toISOString(),
  };
  mkdirSync(ERA5_STORE_ROOT, { recursive: true });
  const path = `${ERA5_STORE_ROOT}/ready-${month}.json`;
  writeFileSync(path + '.tmp', JSON.stringify(manifest, null, 1));
  renameSync(path + '.tmp', path);
  console.log(`\nVollständig: ${blocks.length} Blöcke für ${month} und ${annualYear}.`);
  console.log(`Nächster Schritt: npm run story:prepare -- --provider=era5-archive …`);
}
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
