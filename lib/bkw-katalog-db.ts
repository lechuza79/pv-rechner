import 'server-only';
import { supabase } from './supabase-server';
import { withDbTimeout, DB_SOFT_READ_TIMEOUT_MS } from './db-timeout';
import type { ShopAngebote, ShopAngebot } from './shop-solakon';
import { CATALOG_TABLE, CATALOG_LIMITS } from './product-catalog';

/** A complete persisted snapshot; visitors never trigger merchant imports. */
export async function readBkwCatalog(): Promise<ShopAngebote> {
  if (!supabase) throw new Error('Katalogzugang fehlt');
  const result = await withDbTimeout(supabase.from(CATALOG_TABLE)
    .select('payload,fetched_at,item_count').eq('id','bkw').single(), 'bkw-katalog', DB_SOFT_READ_TIMEOUT_MS);
  if (result.error || !result.data) throw new Error('Angebotskatalog nicht erreichbar');
  const { payload, fetched_at, item_count } = result.data;
  const age = Date.now() - Date.parse(fetched_at);
  if (!Number.isFinite(age) || age < -300_000 || age > CATALOG_LIMITS.bkw * 3_600_000)
    throw new Error('Angebotskatalog ist nicht aktuell');
  if (!Array.isArray(payload) || !payload.length || payload.length !== item_count)
    throw new Error('Angebotskatalog ist unvollständig');
  return { angebote: payload as ShopAngebot[], abgerufenIso: fetched_at };
}
