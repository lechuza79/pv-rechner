import 'server-only';
import { supabase } from './supabase-server';
import { pageContentFingerprint } from './page-content-version';

/** Missing persistence must omit freshness, not invent a modification date. */
export async function recordPageContent(path: string, content: unknown, observedAt: string): Promise<string | undefined> {
  if (!supabase || process.env.NODE_ENV !== 'production') return undefined;
  try {
    const { data, error } = await supabase.rpc('record_page_content', {
      p_path: path, p_fingerprint: pageContentFingerprint(content), p_observed_at: observedAt,
    }).abortSignal(AbortSignal.timeout(3000));
    return !error && typeof data === 'string' ? data : undefined;
  } catch { return undefined; }
}

export async function getPageContentModifiedAt(path: string): Promise<string | undefined> {
  if (!supabase) return undefined;
  try {
    const { data, error } = await supabase.from('page_content_state').select('modified_at').eq('path', path).abortSignal(AbortSignal.timeout(3000)).maybeSingle();
    return !error ? data?.modified_at : undefined;
  } catch { return undefined; }
}
