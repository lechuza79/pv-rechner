import 'server-only';
import {after} from 'next/server';
import {createCache, clampAbsoluteRange} from './energy-api';
import {computeNuclearImport, NuclearImportDataError, type NuclearImportResponse} from './nuclear-import';
import {ladeLetztenStand, speichereLetztenStand} from './energy-letzter-stand';

const cache = createCache<NuclearImportResponse>(10 * 60 * 1000); // 10 min
const longCache = createCache<NuclearImportResponse>(30 * 60 * 1000); // 30 min
const historicalCache = createCache<NuclearImportResponse>(24 * 60 * 60 * 1000); // 24h for past periods

/** Shared server boundary for pages, widgets and the API, including outage recovery. */
export async function readNuclearImport(params: URLSearchParams, now = new Date()): Promise<{payload: NuclearImportResponse; maxAge: number}> {
  const hoursBack = Math.min(Number(params.get("hours")) || 24, 8784);

  // Validate + clamp the untrusted date range (floor 2015, ceiling today).
  // Malformed or missing → range is null and we fall back to the hours window.
  const range = clampAbsoluteRange(
    params.get("start"), // ISO date e.g. "2025-01-01"
    params.get("end"),   // ISO date e.g. "2025-12-31"
  );
  const isAbsolute = range !== null;
  const cacheKey = isAbsolute ? `nuclear-${range.start}-${range.end}` : `nuclear-${hoursBack}`;
  const rangeHours = isAbsolute
    ? Math.ceil((new Date(range.end + "T23:59:59Z").getTime() - new Date(range.start + "T00:00:00Z").getTime()) / 3600000)
    : hoursBack;

  // Historical (past) periods get 24h cache; they don't change
  const isPast = isAbsolute && new Date(range.end + "T23:59:59Z").getTime() < now.getTime() - 2 * 24 * 3600000;
  const store = isPast ? historicalCache : rangeHours > 168 ? longCache : cache;
  const cached = store.get(cacheKey);
  if (cached) {
    const maxAge = isPast ? 2592000 : 600; // 30 days for past periods
    return {payload: cached, maxAge};
  }

  let startStr: string;
  let endStr: string;
  if (isAbsolute) {
    startStr = range.start + "T00:00:00+01:00";
    endStr = range.end + "T23:59:59+01:00";
  } else {
    const start = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
    startStr = start.toISOString().slice(0, 19) + "+01:00";
    endStr = now.toISOString().slice(0, 19) + "+01:00";
  }

  try {
    const response = await computeNuclearImport(startStr, endStr, rangeHours);
    if (!response.data.length) throw new NuclearImportDataError('no-observations');
    const payload = {...response, fetchedAt: new Date().toISOString()};
    store.set(cacheKey, payload);
    after(() => speichereLetztenStand('nuclear-import', cacheKey, payload));
    return {payload, maxAge: isPast ? 2592000 : 600};
  } catch (error) {
    const stale = store.getStale(cacheKey) ?? await ladeLetztenStand<NuclearImportResponse>('nuclear-import', cacheKey);
    if (stale?.data.length) return {payload: {...stale, stale: true}, maxAge: 60};
    throw error;
  }
}
