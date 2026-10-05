import { createClient } from '@supabase/supabase-js';
import { holeSolakonAngebote } from '../lib/shop-solakon';
import { CATALOG_TABLE } from '../lib/product-catalog';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
if (existsSync('.env.local')) loadEnvFile('.env.local');
async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Datenbankzugang fehlt');
  const db = createClient(url, key);
  const data = await holeSolakonAngebote(AbortSignal.timeout(60_000));
  const { data: count, error } = await db.rpc('replace_product_catalog', {
    p_catalog: 'bkw', p_payload: data.angebote, p_fetched_at: data.abgerufenIso, p_source_at: null,
  });
  if (error) throw new Error(`Katalog konnte nicht geschrieben werden: ${error.message}`);
  const check = await db.from(CATALOG_TABLE).select('item_count,fetched_at').eq('id','bkw').single();
  if (check.error || !count || check.data?.item_count !== count || Date.parse(check.data?.fetched_at ?? '') !== Date.parse(data.abgerufenIso))
    throw new Error('Schreibprüfung fehlgeschlagen');
  console.log(`${count} BKW-Angebote vollständig gespeichert. Abruf: ${data.abgerufenIso}. Der Shop nennt keinen separaten Händlerdatenstand.`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Import fehlgeschlagen'); process.exitCode=1; });
