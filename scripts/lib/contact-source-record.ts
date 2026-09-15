import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type SourceKind = 'original-http-html' | 'original-http-pdf' | 'isolated-browser-dom';
export type SourceObservation = { url: string; finalUrl: string; observedAt: string; sourceKind: SourceKind; sourceDigest: string; httpStatus?: number };
export const sourceHash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
function immutable(path: string, bytes: string | Buffer) {
  try { writeFileSync(path, bytes, { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if (!readFileSync(path).equals(Buffer.from(bytes))) throw new Error('Existing source record differs');
  }
}
/** Content is shared by digest; URL/time/kind observations are immutable, separate records. */
export function recordSupplementalSource(directory: string, organizationId: string, bytes: Buffer, observation: Omit<SourceObservation, 'sourceDigest'>) {
  if (!/^\d+$/.test(organizationId) || !Number.isFinite(Date.parse(observation.observedAt))) throw new Error('Invalid source identity/time');
  for (const url of [observation.url, observation.finalUrl]) if (!/^https?:$/.test(new URL(url).protocol)) throw new Error('Invalid source URL');
  if (!['original-http-html','original-http-pdf','isolated-browser-dom'].includes(observation.sourceKind)) throw new Error('Invalid source kind');
  const pdf = observation.sourceKind === 'original-http-pdf';
  if (pdf !== bytes.subarray(0,5).equals(Buffer.from('%PDF-'))) throw new Error('Source type and bytes disagree');
  const sourceDigest = sourceHash(bytes);
  const record: SourceObservation = { url: observation.url, finalUrl: observation.finalUrl, observedAt: observation.observedAt, sourceKind: observation.sourceKind, sourceDigest, ...(observation.httpStatus === undefined ? {} : {httpStatus:observation.httpStatus}) };
  const serialized = JSON.stringify(record);
  const observationDigest = sourceHash(serialized);
  const root = resolve(directory,'supplemental',organizationId);
  mkdirSync(resolve(root,'observations'),{recursive:true});
  immutable(resolve(root,`${sourceDigest}.${pdf?'pdf':'html'}`),bytes);
  immutable(resolve(root,'observations',`${observationDigest}.json`),serialized);
  return {sourceDigest,observationDigest};
}
/** Legacy single observations remain readable; new captures never overwrite them. */
export function readSupplementalSource(directory: string, organizationId: string, url: string, digest: string, kind: 'html'|'pdf', observationDigest?: string): Buffer | null {
  if (!/^\d+$/.test(organizationId) || !/^[a-f0-9]{64}$/.test(digest)) return null;
  try {
    if (!/^https?:$/.test(new URL(url).protocol)) return null;
    const root = resolve(directory,'supplemental',organizationId);
    let metadata;
    if (observationDigest !== undefined) {
      if (!/^[a-f0-9]{64}$/.test(observationDigest)) return null;
      const record = readFileSync(resolve(root,'observations',`${observationDigest}.json`));
      if (sourceHash(record)!==observationDigest) return null;
      metadata=JSON.parse(record.toString());
      if (metadata.sourceDigest!==digest) return null;
      if (kind==='pdf' ? metadata.sourceKind!=='original-http-pdf' : !['original-http-html','isolated-browser-dom'].includes(metadata.sourceKind)) return null;
    } else {
      metadata=JSON.parse(readFileSync(resolve(root,`${digest}.json`),'utf8'));
      if ((kind==='html'?metadata.htmlDigest:metadata.sha256)!==digest) return null;
      if (kind==='pdf' && metadata.sourceKind!=='original-http-pdf') return null;
    }
    if(metadata.finalUrl!==url || !Number.isFinite(Date.parse(metadata.observedAt))) return null;
    const bytes=readFileSync(resolve(root,`${digest}.${kind}`));
    if(sourceHash(bytes)!==digest || (kind==='pdf')!==bytes.subarray(0,5).equals(Buffer.from('%PDF-'))) return null;
    return bytes;
  } catch { return null; }
}
