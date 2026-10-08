import {createHash} from 'node:crypto';
import {rankingKategorien,rankingRows} from './atlas-ranking';
import {RANKING_FELDER} from './ranking-felder';
import {bundeslandByAgs} from './mastr-regions';
import type {GemeindeStats} from './awards';
import type {MonthlyRank,RankMonthSnapshot} from './story-ranking-month';
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
type Ranked={rows:ReturnType<typeof rankingRows>;byId:Map<string,ReturnType<typeof rankingRows>[number]>;cohort?:string};
/**
 * One ranking per category, scope and field, shared by every town of a run.
 *
 * The package run asks for the same nationwide, state and district rankings
 * once per town — 11,000 times for the national ones. Measured on 08.10.2026,
 * rebuilding them per town was the largest single cost of a package (over a
 * third of its CPU time). Keyed on the stats array, so a new data set never
 * reads an old ranking.
 */
const memo=new WeakMap<GemeindeStats[],Map<string,Ranked>>();
function ranked(stats:GemeindeStats[],category:ReturnType<typeof rankingKategorien>[number],scopeId:string|null,field:(typeof RANKING_FELDER)[number]|null):Ranked{
 let byStats=memo.get(stats);if(!byStats){byStats=new Map();memo.set(stats,byStats);}
 const key=[category.key,scopeId??'de',field?.slug??'all'].join(':');
 let hit=byStats.get(key);
 if(!hit){const rows=rankingRows(stats,category,scopeId,field,false);hit={rows,byId:new Map(rows.map(row=>[row.regionId,row]))};byStats.set(key,hit);}
 return hit;
}
const cohortOf=(hit:Ranked)=>hit.cohort??=digest(hit.rows.map(row=>[row.regionId,row.population]).sort());
/** Reuse the public Atlas rules across all applicable category/scope combinations. */
export function atlasRankMonth(stats:GemeindeStats[],id:string,sourceDate:string,districtName:string,regionSlugs:Record<string,string>={}):RankMonthSnapshot{
 const city=stats.find(row=>row.regionId===id);const ranks:MonthlyRank[]=[];
 if(city){
  const scopes=[{id:null,label:'Deutschland'},{id:id.slice(0,2),label:bundeslandByAgs(id.slice(0,2))?.name??'Bundesland'},{id:id.slice(0,5),label:districtName}];
  for(const category of rankingKategorien())for(const scope of scopes){
   const fields=category.traeger==='buerger'?RANKING_FELDER.filter(field=>field.gilt(city)):[null];
   for(const field of fields){
    const hit=ranked(stats,category,scope.id,field),rows=hit.rows,own=hit.byId.get(id);
    if(!own||rows.length<3)continue;
    const area=scope.id?[regionSlugs[id.slice(0,2)],...(scope.id.length===5?[regionSlugs[id.slice(0,5)]]:[])]:[];
    const href=area.every(Boolean)?'/solar-atlas/ranking/'+[category.slug,field?.slug,...area,...(own.platz>200?[`seite-${Math.ceil(own.platz/200)}`]:[])].filter(Boolean).join('/')+'#rangliste':undefined;
    ranks.push({href,key:[category.key,scope.id??'de',field?.slug??'all'].join(':'),label:category.thema,scope:scope.label+(field?` · ${field.langform}`:''),rank:own.platz,size:rows.length,value:own.wert,cohort:cohortOf(hit),rules:digest([category.key,category.thema,category.metric.toString(),category.plausibel?.toString(),category.key.startsWith('tempo-')||category.key==='zubau'?sourceDate.slice(0,4):'stock'])});
   }
  }
 }
 return {month:sourceDate.slice(0,7),observedAt:sourceDate,ranks};
}
