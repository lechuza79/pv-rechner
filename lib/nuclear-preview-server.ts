import 'server-only';
import type {NuclearImportResponse} from './nuclear-import';
import {readNuclearImport} from './nuclear-import-data';
import {usesLivePreviewData, livePreviewJson} from './preview-data';

async function loadWindow(query: string, now: Date): Promise<NuclearImportResponse> {
 const payload = usesLivePreviewData()
  ? await livePreviewJson(`/api/energy/nuclear-import?${query}`) as unknown as NuclearImportResponse
  : (await readNuclearImport(new URLSearchParams(query), now)).payload;
 if (!payload.data?.length || payload.source === 'error') throw new Error('Nuclear import observations unavailable');
 return payload;
}

/** One real-data loader for the page, embed and visual reference. */
export async function nuclearPreviewData(now = new Date()): Promise<NuclearImportResponse | null> {
 try { return await loadWindow('hours=168', now); } catch { return null; }
}

/** Keep the recoverable rolling week and add older raw intervals for complete calendar days. */
export async function nuclearEnergyPreviewData(now = new Date()): Promise<NuclearImportResponse | null> {
 const day = (offset: number) => new Date(now.getTime() - offset * 86400000).toISOString().slice(0, 10);
 // Both windows retain quarter-hour resolution. The older supplement is optional:
 // its failure must not discard the available week or invent missing observations.
 const [older, recent] = await Promise.allSettled([
  loadWindow(`start=${day(9)}&end=${day(7)}`, now),
  loadWindow('hours=168', now),
 ]);
 if (recent.status !== 'fulfilled') return null;
 const parts = older.status === 'fulfilled' ? [older.value, recent.value] : [recent.value];
 const data = [...new Map(parts.flatMap(part => part.data).map(point => [point.ts, point])).values()]
  .sort((a, b) => a.ts.localeCompare(b.ts));
 return {...recent.value, data};
}
