import 'server-only';
import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GEMEINDE_PAKET_BUCKET } from './gemeinde-paket-server';
import { checkedDistrictRankingSnapshot, DISTRICT_RANKING_PATH } from './kreis-ranking-snapshot';
import { withDbTimeout } from './db-timeout';
import { ATLAS_DATEN_TAG } from './atlas-revalidate-routen';

/** One prepared read; the expensive rollup scan belongs exclusively to the update job. */
export const readDistrictRankingSnapshot=cache(async()=>{
  if(process.env.NODE_ENV==='development'){
    const local=await readFile(join(process.cwd(),'.cache',DISTRICT_RANKING_PATH),'utf8').catch((error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')return null;throw error;});
    if(local)return checkedDistrictRankingSnapshot(JSON.parse(local));
  }
  const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_KEY;
  if(!url||!key)return null;
  const response=await withDbTimeout(fetch(`${url}/storage/v1/object/${GEMEINDE_PAKET_BUCKET}/${DISTRICT_RANKING_PATH}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},next:{revalidate:86400,tags:[ATLAS_DATEN_TAG]}}),'prepared district rankings');
  if(response.status===404||response.status===400)return null;
  if(!response.ok)throw new Error(`Prepared district rankings: HTTP ${response.status}`);
  return checkedDistrictRankingSnapshot(await response.json());
});
