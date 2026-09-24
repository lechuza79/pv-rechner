/** Rebuild local ranking projections from the corrected current register; no database writes. */
import {loadEnvConfig} from '@next/env';
import {readFileSync,writeFileSync} from 'node:fs';
import {atlasRankMonth} from '../lib/story-ranking-atlas';
loadEnvConfig(process.cwd());
async function main(){
 const {loadAwardStats,loadKreisNames,loadElternSlugs}=await import('../lib/awards-server');
 const [stats,names,slugs]=await Promise.all([loadAwardStats(),loadKreisNames(),loadElternSlugs()]);
 const path='lib/story-ranking-month-data.json';const saved=JSON.parse(readFileSync(path,'utf8'));
 const affected=JSON.parse(readFileSync('scripts/.cache/story-key-repair-2026-09-18/affected.json','utf8')) as string[];
 const ids=new Set([...Object.keys(saved),...affected,...stats.filter(s=>s.regionId.startsWith('06435')).map(s=>s.regionId)]);
 for(const id of ids){
  // The correction establishes a new baseline: no changes inferred from a broken cohort.
  saved[id]={current:atlasRankMonth(stats,id,'2026-09-18',names[id.slice(0,5)]??'Kreisfreie Stadt',slugs)};
 }
 writeFileSync(path,JSON.stringify(saved));
 writeFileSync('scripts/.cache/story-key-repair-2026-09-18/ranking-audit.json',JSON.stringify({correctedAt:'2026-09-18',cities:ids.size,hanau:saved['06415000'],hanauInOldDistrict:stats.filter(s=>s.regionId.startsWith('06435')&&s.name==='Hanau').length}));
 console.log('Corrected ranking projections',ids.size,'Hanau ranks',saved['06415000'].current.ranks.length);
}
main().catch(e=>{console.error(e);process.exitCode=1});
