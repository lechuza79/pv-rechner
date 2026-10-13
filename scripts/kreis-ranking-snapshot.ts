import { mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { loadKreisRankingDatenFresh } from '../lib/kreis-ranking-server';
import { getMastrDataAsOf } from '../lib/mastr-data';
import { supabase } from '../lib/supabase-server';
import { GEMEINDE_PAKET_BUCKET } from '../lib/gemeinde-paket-server';
import { checkedDistrictRankingSnapshot, DISTRICT_RANKING_PATH } from '../lib/kreis-ranking-snapshot';

async function main(){
  const stand=await getMastrDataAsOf();
  if(!stand)throw new Error('Missing register date');
  const data=await loadKreisRankingDatenFresh();
  if(stand!==await getMastrDataAsOf())throw new Error('Register changed during ranking preparation');
  const snapshot=checkedDistrictRankingSnapshot({version:1,stand,builtAt:new Date().toISOString(),kreise:data.kreise});
  const body=JSON.stringify(snapshot);
  const file=join(process.cwd(),'.cache',DISTRICT_RANKING_PATH);
  await mkdir(dirname(file),{recursive:true});
  await writeFile(`${file}.tmp`,body);await rename(`${file}.tmp`,file);
  if(process.argv.includes('--publish')){
    if(!supabase)throw new Error('Missing database connection');
    const {error}=await supabase.storage.from(GEMEINDE_PAKET_BUCKET).upload(DISTRICT_RANKING_PATH,body,{contentType:'application/json',upsert:true});
    if(error)throw error;
  }
  console.log(`Prepared ${snapshot.kreise.length} districts; register ${stand}; ${body.length} bytes; ${process.argv.includes('--publish')?'published':'local only'}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
