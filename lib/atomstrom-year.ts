import { FOSSIL_KEYS, RENEWABLE_KEYS, SONSTIGE_KEYS } from './chart-utils';

export const IMPORT_COUNTRIES = { fr: 'Frankreich', cz: 'Tschechien', ch: 'Schweiz', se: 'Schweden', be: 'Belgien', nl: 'Niederlande' } as const;
const FLOW_NAMES: Record<string, keyof typeof IMPORT_COUNTRIES> = { France: 'fr', 'Czech Republic': 'cz', Switzerland: 'ch', Sweden: 'se', Belgium: 'be', Netherlands: 'nl' };
export type SourceSeries = { name: string; data: (number | null)[] };
export type PowerSource = { unix_seconds: number[]; production_types: SourceSeries[] };
export type FlowSource = { unix_seconds: number[]; countries: SourceSeries[] };
export type YearMonth = { month: string; nuclearGwh: number; coveredHours: number; expectedHours: number; generation: { renewable: number; fossil: number; other: number }; countries: Record<string, number> };
export type NuclearYearData = {
  year: number; start: string; end: string; nuclearGwh: number; coveredHours: number; expectedHours: number;
  generation: YearMonth['generation']; countries: Record<string, number>; months: YearMonth[];
};
export type NuclearYearSnapshot = NuclearYearData & {
  methodVersion: string; retrievedAt: string; modifiedAt: string; fingerprint: string;
  sources: { url: string; sha256: string }[];
};
const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const monthFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit' });
function indexPower(source: PowerSource) {
  const diffs = source.unix_seconds.slice(1).map((ts, i) => ts - source.unix_seconds[i]);
  if (!diffs.length || diffs.some(n => n <= 0)) throw new Error('Unordered or missing source timestamps');
  const counts = new Map<number, number>();
  diffs.forEach(n => counts.set(n, (counts.get(n) ?? 0) + 1));
  const cadence = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  if (cadence !== 900 && cadence !== 3600) throw new Error('Unsupported source cadence');
  const rows = source.unix_seconds.map((ts, i) => {
    const values = Object.fromEntries(source.production_types.map(p => [key(p.name), p.data[i]]));
    const total = Object.entries(values).reduce((sum, [name, value]) => sum + (finite(value) && value > 0 && !['load', 'share', 'cross_border', 'consumption'].some(excluded => name.includes(excluded)) ? value : 0), 0);
    return { ts, end: Math.min(ts + cadence, source.unix_seconds[i + 1] ?? Infinity), values, total };
  });
  let cursor = 0;
  return (ts: number, end: number) => {
    while (cursor + 1 < rows.length && rows[cursor + 1].ts <= ts) cursor++;
    const row = rows[cursor];
    return row && row.ts <= ts && row.end >= end ? row : null;
  };
}
/** Calendar-year integration. Hourly mixes cover their own four quarter-hours;
 * gaps are never forward-filled. A missing importing neighbour excludes the
 * entire interval, including German generation, so the share has one period.
 * The nuclear share uses the reported positive generation, as in the live model.
 */
export function aggregateNuclearYear(year: number, flows: FlowSource, power: Record<string, PowerSource>): NuclearYearData {
  if (!Number.isInteger(year) || year < 2024) throw new Error('Only post-phaseout years are supported');
  const start = `${year}-01-01T00:00:00+01:00`, end = `${year + 1}-01-01T00:00:00+01:00`;
  const from = Date.parse(start) / 1000, until = Date.parse(end) / 1000;
  const flowMap = new Map(flows.unix_seconds.map((ts, i) => [ts, i]));
  if (flowMap.size !== flows.unix_seconds.length) throw new Error('Duplicate flow timestamp');
  const lookups = Object.fromEntries(Object.entries(power).map(([code, source]) => [code, indexPower(source)]));
  const flowSeries = Object.fromEntries(flows.countries.filter(c => FLOW_NAMES[c.name]).map(c => [FLOW_NAMES[c.name], c.data]));
  const monthly = new Map<string, YearMonth>();
  for (let ts = from; ts < until; ts += 900) {
    const month = monthFormatter.format(ts * 1000);
    if (!monthly.has(month)) monthly.set(month, { month, nuclearGwh: 0, coveredHours: 0, expectedHours: 0, generation: { renewable: 0, fossil: 0, other: 0 }, countries: Object.fromEntries(Object.keys(IMPORT_COUNTRIES).map(c => [c, 0])) });
    const bucket = monthly.get(month)!;
    bucket.expectedHours += .25;
    const i = flowMap.get(ts), de = lookups.de?.(ts, ts + 900);
    if (i === undefined || !de) continue;
    const groups = { renewable: RENEWABLE_KEYS, fossil: FOSSIL_KEYS, other: SONSTIGE_KEYS };
    if (Object.values(groups).flat().some(k => !finite(de.values[k]))) continue;
    const contributions: Record<string, number> = {};
    let complete = true;
    for (const code of Object.keys(IMPORT_COUNTRIES)) {
      const flow = flowSeries[code]?.[i];
      if (!finite(flow)) { complete = false; break; }
      if (flow <= 0) { contributions[code] = 0; continue; }
      const mix = lookups[code]?.(ts, ts + 900);
      if (!mix || !finite(mix.values.nuclear) || mix.values.nuclear < 0 || mix.total <= 0) { complete = false; break; }
      contributions[code] = flow * mix.values.nuclear / mix.total * .25;
    }
    if (!complete) continue;
    bucket.coveredHours += .25;
    for (const [code, value] of Object.entries(contributions)) { bucket.countries[code] += value; bucket.nuclearGwh += value; }
    for (const [group, keys] of Object.entries(groups)) bucket.generation[group as keyof YearMonth['generation']] += keys.reduce((sum, k) => sum + Math.max(0, Number(de.values[k])), 0) * .25 / 1000;
  }
  const months = [...monthly.values()];
  return { year, start, end, months, nuclearGwh: months.reduce((s, m) => s + m.nuclearGwh, 0), coveredHours: months.reduce((s, m) => s + m.coveredHours, 0), expectedHours: (until - from) / 3600,
    generation: { renewable: months.reduce((s, m) => s + m.generation.renewable, 0), fossil: months.reduce((s, m) => s + m.generation.fossil, 0), other: months.reduce((s, m) => s + m.generation.other, 0) },
    countries: Object.fromEntries(Object.keys(IMPORT_COUNTRIES).map(code => [code, months.reduce((s, m) => s + m.countries[code], 0)])) };
}
