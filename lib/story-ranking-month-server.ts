import 'server-only';
import localRankings from './story-ranking-month-data.json';
import type {RankMonthSnapshot} from './story-ranking-month';
import {supabase} from './supabase-server';
import {loadElternSlugs} from './awards-server';
import {atlasRankMonth} from './story-ranking-atlas';
import type {GemeindeStats} from './awards';
/** Complete central observations are authoritative; partial captures never qualify. */
export async function loadRankingMonth(id:string){
 if(!supabase)throw new Error('Datenbank nicht verfügbar');
 const {data,error}=await supabase.from('municipality_rank_observations').select('source_date,rules_version').eq('group_key','all').eq('payload->>complete','true').order('source_date',{ascending:false}).limit(24);
 if(error)throw new Error('Ranghistorie konnte nicht geladen werden');
 const editions=data??[];if(!editions.length)return null;
 const latest=editions[0];
 const corrected=(localRankings as Record<string,{current:RankMonthSnapshot;previous?:RankMonthSnapshot}>)[id];
 // Never overwrite a verified local correction with an older central observation.
 if(corrected && corrected.current.observedAt>latest.source_date)return corrected;
 const date=new Date(`${latest.source_date.slice(0,7)}-01T12:00:00Z`);date.setUTCMonth(date.getUTCMonth()-1);
 const previous=editions.find(edition=>edition.source_date.startsWith(date.toISOString().slice(0,7))&&edition.rules_version===latest.rules_version);
 const district=await supabase.from('mastr_regions').select('name').eq('region_id',id.slice(0,5)).maybeSingle();
 if(district.error)throw new Error('Vergleichsgebiet konnte nicht geladen werden');
 const regionSlugs=await loadElternSlugs();
 const make=async(edition:typeof latest)=>{
  const result=await supabase!.from('municipality_rank_observations').select('payload').eq('group_key','all').eq('source_date',edition.source_date).eq('rules_version',edition.rules_version).single();
  if(result.error||!result.data?.payload?.complete||!Array.isArray(result.data.payload.stats))throw new Error('Unvollständiger Rangstand');
  return atlasRankMonth(result.data.payload.stats as GemeindeStats[],id,edition.source_date,district.data?.name??'Landkreisvergleich',regionSlugs);
 };
 return {current:await make(latest),...previous?{previous:await make(previous)}:{}};
}
