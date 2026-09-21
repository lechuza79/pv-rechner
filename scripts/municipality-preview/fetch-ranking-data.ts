/** Read complete ranking editions; write only local preview assets. */
import {loadEnvConfig} from '@next/env';
import {createClient} from '@supabase/supabase-js';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
async function main(){
 loadEnvConfig('/Users/eule/projects/pv-rechner');
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;
 if(!url||!key)throw Error('Ranking database credentials unavailable');
 const db=createClient(url,key,{auth:{persistSession:false}});
 const {data:editions,error}=await db.from('municipality_rank_observations').select('source_date,rules_version').eq('group_key','all').eq('payload->>complete','true').order('source_date',{ascending:false}).limit(24);
 if(error||!editions?.length)throw Error('No complete ranking editions available');
 const latest=editions[0];
 const prior=editions.find(e=>e.source_date.slice(0,7)<latest.source_date.slice(0,7)&&e.rules_version===latest.rules_version);
 const load=async(e:typeof latest)=>{const r=await db.from('municipality_rank_observations').select('payload').eq('group_key','all').eq('source_date',e.source_date).eq('rules_version',e.rules_version).single();if(r.error||!r.data?.payload?.complete||!Array.isArray(r.data.payload.stats))throw Error('Incomplete ranking edition');return r.data.payload.stats;};
 let stats=await load(latest);const old=prior?await load(prior):null;let sourceDate=latest.source_date;
 const source=process.env.STORY_SOURCE_ROOT??'/Users/eule/projects/pv-rechner/.worktrees/codex-kommunen-templates';
 // Preserve the newer verified local source instead of rolling back to an older central edition.
 const retained=JSON.parse(await readFile(path.join(source,'lib/story-ranking-month-data.json'),'utf8'))['09679147'].current;
 if(retained.observedAt>sourceDate){stats=JSON.parse(await readFile(path.join(source,'scripts/.cache/story-ranking-month/sources/3a1bf9ee977d1a94c75b09e7a6890eed3278fd4fa03bed9ca5021972a81c7182.json'),'utf8'));sourceDate=retained.observedAt;}
 const {rankingRows,rankingKategorien}=await import(path.join(source,'lib/atlas-ranking.ts'));
 const {RANKING_FELDER}=await import(path.join(source,'lib/ranking-felder.ts'));
 const {rankingDistinction}=await import(path.join(source,'lib/story-ranking-month.ts'));
 const asset='public/atlas-design-preview/ranking-discoveries.json';
 const saved=JSON.parse(await readFile(asset,'utf8'));
 let changes=0;
 for(const entry of saved){
  const [key,scope,fieldSlug]=entry.key.split(':');
  const category=rankingKategorien().find((c:any)=>c.key===key),field=RANKING_FELDER.find((f:any)=>f.slug===fieldSlug)??null;
  if(!category)throw Error('Unknown category');
  const current=rankingRows(stats,category,scope==='de'?null:scope,field,true);
  const previous=old?rankingRows(old,category,scope==='de'?null:scope,field):null;
  const sameCohort=previous&&previous.length===current.length&&current.every((r:any)=>previous.some((p:any)=>p.regionId===r.regionId));
  const previousRanks=new Map(previous?.map((r:any)=>[r.regionId,r.platz])??[]);
  const own=current.find((r:any)=>r.regionId==='09679147');if(!own)throw Error('Municipality absent from ranking');
  entry.rank=own.platz;entry.size=current.length;entry.value=own.wert;entry.asOf=sourceDate;
  entry.distinction=own.platz<=3?'Platz '+own.platz:rankingDistinction(own.platz,current.length);
  entry.changePeriod=sameCohort?'Seit '+prior!.source_date:category.metricVorjahr?'Seit Jahresbeginn':null;
  entry.rows=current.map((r:any)=>{const change=sameCohort?Number(previousRanks.get(r.regionId))-r.platz:r.veraenderung;if(change!=null)changes++;return {id:r.regionId,name:r.name,rank:r.platz,value:r.wert,change};});
  delete entry.rowsUnavailableReason;
 }
 await writeFile(asset,JSON.stringify(saved));
 console.log(JSON.stringify({sourceDate,centralSourceDate:latest.source_date,previousDate:prior?.source_date??null,lists:saved.length,rowsWithChange:changes}));
}
main().catch(()=>{console.error('Ranking data fetch failed; existing preview data retained.');process.exitCode=1;});
