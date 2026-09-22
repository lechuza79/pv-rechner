import {createHash} from 'node:crypto';
import {rankingKategorien,rankingRows} from './atlas-ranking';
import {RANKING_FELDER} from './ranking-felder';
import {bundeslandByAgs} from './mastr-regions';
import type {GemeindeStats} from './awards';
import type {MonthlyRank,RankMonthSnapshot} from './story-ranking-month';
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Reuse the public Atlas rules across all applicable category/scope combinations. */
export function atlasRankMonth(stats:GemeindeStats[],id:string,sourceDate:string,districtName:string,regionSlugs:Record<string,string>={}):RankMonthSnapshot{
 const city=stats.find(row=>row.regionId===id);const ranks:MonthlyRank[]=[];
 if(city){
  const scopes=[{id:null,label:'Deutschland'},{id:id.slice(0,2),label:bundeslandByAgs(id.slice(0,2))?.name??'Bundesland'},{id:id.slice(0,5),label:districtName}];
  for(const category of rankingKategorien())for(const scope of scopes){
   const fields=category.traeger==='buerger'?RANKING_FELDER.filter(field=>field.gilt(city)):[null];
   for(const field of fields){
    const rows=rankingRows(stats,category,scope.id,field,false),own=rows.find(row=>row.regionId===id);
    if(!own||rows.length<3)continue;
    const area=scope.id?[regionSlugs[id.slice(0,2)],...(scope.id.length===5?[regionSlugs[id.slice(0,5)]]:[])]:[];
    const href=area.every(Boolean)?'/solar-atlas/ranking/'+[category.slug,field?.slug,...area,...(own.platz>200?[`seite-${Math.ceil(own.platz/200)}`]:[])].filter(Boolean).join('/')+'#rangliste':undefined;
    ranks.push({href,key:[category.key,scope.id??'de',field?.slug??'all'].join(':'),label:category.thema,scope:scope.label+(field?` · ${field.langform}`:''),rank:own.platz,size:rows.length,value:own.wert,cohort:digest(rows.map(row=>[row.regionId,row.population]).sort()),rules:digest([category.key,category.thema,category.metric.toString(),category.plausibel?.toString(),category.key.startsWith('tempo-')||category.key==='zubau'?sourceDate.slice(0,4):'stock'])});
   }
  }
 }
 return {month:sourceDate.slice(0,7),observedAt:sourceDate,ranks};
}
