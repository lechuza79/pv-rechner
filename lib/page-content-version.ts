import { createHash } from 'node:crypto';

/** Hash semantic content, never retrieval clocks or relative date labels. */
export function pageContentFingerprint(content: unknown): string {
  function stable(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
    return value;
  }
  return createHash('sha256').update(JSON.stringify(stable(content))).digest('hex');
}
