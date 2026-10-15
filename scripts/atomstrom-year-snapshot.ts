/** Reproducible, read-only source import. No writes to the live database.
 * Usage: npx tsx scripts/atomstrom-year-snapshot.ts 2025 /path/to/source-cache
 * The source directory contains the eight original Energy-Charts responses.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { aggregateNuclearYear, IMPORT_COUNTRIES, type NuclearYearSnapshot } from '../lib/atomstrom-year';
const year = Number(process.argv[2]), directory = process.argv[3];
if (year !== 2025 || !directory) throw new Error('This reviewed preview supports 2025 only; supply its source directory');
const sources: NuclearYearSnapshot['sources'] = [];
let retrievedAt = 0;
const load = (endpoint: string, country: string) => {
  const sourcePath = join(directory, `${endpoint}-${country}.json`);
  retrievedAt = Math.max(retrievedAt, statSync(sourcePath).mtimeMs);
  const text = readFileSync(sourcePath, 'utf8');
  const query = new URLSearchParams({ country, start: `${year}-01-01T00:00:00+01:00`, end: `${year}-12-31T23:59:59+01:00` });
  sources.push({ url: `https://api.energy-charts.info/${endpoint}?${query}`, sha256: createHash('sha256').update(text).digest('hex') });
  return JSON.parse(text);
};
const flows = load('cbpf', 'de');
const power = Object.fromEntries(['de', ...Object.keys(IMPORT_COUNTRIES)].map(code => [code, load('public_power', code)]));
const values = aggregateNuclearYear(year, flows, power);
const methodVersion = 'calendar-overlap-v1';
const fingerprint = createHash('sha256').update(JSON.stringify({ methodVersion, ...values })).digest('hex');
const output = join('data', 'atomstrom', `${year}.json`);
const previous: NuclearYearSnapshot | null = existsSync(output) ? JSON.parse(readFileSync(output, 'utf8')) : null;
const now = new Date().toISOString();
const snapshot: NuclearYearSnapshot = { ...values, methodVersion, fingerprint, retrievedAt: new Date(retrievedAt).toISOString(), modifiedAt: previous?.fingerprint === fingerprint ? previous.modifiedAt : now, sources };
mkdirSync(join('data', 'atomstrom'), { recursive: true });
writeFileSync(output, JSON.stringify(snapshot, null, 2) + '\n');
console.log(JSON.stringify({ output, coveredHours: values.coveredHours, expectedHours: values.expectedHours, nuclearGwh: values.nuclearGwh, modifiedAt: snapshot.modifiedAt }));
