import type {Candidate,DiscoveryReport} from './story-discovery';
export type MonthlyRank={key:string;label:string;scope:string;rank:number;size:number;value:number;cohort:string;rules:string;href?:string};
export type RankMonthSnapshot={month:string;observedAt:string;ranks:MonthlyRank[]};
export type RankMonthRow=MonthlyRank&{previousRank?:number;delta?:number;state:'initial'|'up'|'down'|'held'|'changed-basis'};
const previousMonth=(month:string)=>{const date=new Date(`${month}-01T12:00:00Z`);date.setUTCMonth(date.getUTCMonth()-1);return date.toISOString().slice(0,7);};
export function rankingMonthRows(current:RankMonthSnapshot,previous?:RankMonthSnapshot):RankMonthRow[]{
 const before=previous?.month===previousMonth(current.month)?new Map(previous.ranks.map(rank=>[rank.key,rank])):new Map<string,MonthlyRank>();
 return current.ranks.filter(rank=>Number.isInteger(rank.rank)&&rank.rank>0&&rank.rank<=rank.size&&Number.isFinite(rank.value)).map(rank=>{
  const old=before.get(rank.key);
  if(!old)return {...rank,state:'initial'};
  if(old.rules!==rank.rules||old.cohort!==rank.cohort||old.size!==rank.size)return {...rank,state:'changed-basis'};
  const delta=old.rank-rank.rank;
  return {...rank,previousRank:old.rank,delta,state:delta>0?'up':delta<0?'down':'held'};
 });
}
/** Editorial thresholds apply identically to every metric, area and class. */
export function rankingDistinction(rank:number,size:number):string|null{
 if(!Number.isInteger(rank)||!Number.isInteger(size)||size<3||rank<1||rank>size)return null;
 if(rank===1)return 'Platz 1';
 if(rank/size>0.1)return null;
 const threshold=[3,10,25,50,100].find(limit=>rank<=limit&&limit/size<=0.1);
 return threshold?`Top ${threshold}`:'Beste 10 %';
}
export function rankingHighlight(row:RankMonthRow):string|null{
 const now=rankingDistinction(row.rank,row.size);
 const before=row.previousRank===undefined?null:rankingDistinction(row.previousRank,row.size);
 if(!now&&!before)return null;
 if(row.state==='initial'||row.state==='changed-basis')return now;
 if(now!==before){
  if(!now)return `${before} verlassen`;
  if(!before||(row.delta??0)>0)return `Neu: ${now}`;
  return `${now} · zuvor ${before}`;
 }
 return `${now} ${row.state==='held'?'gehalten':row.state==='up'?'· aufgestiegen':'· zurückgefallen'}`;
}
export function rankingHighlights(rows:RankMonthRow[]):RankMonthRow[]{
 return rows.filter(row=>rankingHighlight(row)!==null).sort((a,b)=>
  Number(b.rank===1)-Number(a.rank===1)||Math.abs(b.delta??0)/b.size-Math.abs(a.delta??0)/a.size||a.rank/a.size-b.rank/b.size||a.key.localeCompare(b.key));
}
const oldFamilies=new Set(['Aktueller Rang','Aufsteiger','Absteiger','Rang gehalten','Rangänderung','Rang-Monatsupdate']);
/** Exactly one story per city/month, retaining every available category and scope. */
export function appendRankingMonth(report:DiscoveryReport,current:RankMonthSnapshot,previous?:RankMonthSnapshot){
 const rows=rankingMonthRows(current,previous);if(!rows.length)return;
 const number=(n:number)=>n.toLocaleString('de-DE');
 const highlights=rankingHighlights(rows);
 const leaders=highlights.filter(row=>row.rank===1),up=highlights.filter(row=>row.state==='up'),down=highlights.filter(row=>row.state==='down'),held=highlights.filter(row=>row.state==='held');
 const month=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${current.month}-01T12:00:00Z`));
 const initial=rows.every(row=>row.state==='initial');
 const lead=leaders.length?`${report.name}: ${leaders.every(row=>row.state==='held')?'Platz 1 gehalten':leaders.length===1?'Platz 1 im Solar-Ranking':`Platz 1 in ${number(leaders.length)} Vergleichen`}`:`${report.name}: die Platzierungen im ${month}`;
 const summary=initial?'Die Ausgangsbasis für die monatlichen Rangupdates. Ab dem nächsten vergleichbaren Monatsstand zeigen wir hier gemeinsam Aufstieg, Abstieg und gehaltene Plätze.':`${up.length} verbessert, ${down.length} zurückgefallen, ${held.length} gehalten. Verglichen wird mit dem Vormonat; neue oder veränderte Vergleichsgrundlagen sind gesondert gekennzeichnet.`;
 const candidate:Candidate={id:`${report.regionId}-ranking-month-${current.month}`,family:'Rang-Monatsupdate',eventKey:'ranking-month',title:lead,status:'ready',priority:leaders.length?85:65,period:current.month,comparison:summary,reason:'Spitzenplatzierungen im Verhältnis zur Teilnehmerzahl; alle Ränge bleiben in der Rangtabelle zugänglich.',evidence:rows.map(row=>({label:`${row.label} · ${row.scope}`,value:row.rank,unit:'Platz'})),rankSummary:rows,limitations:['Ränge sind relative Positionen. Änderungen können auch durch andere Gemeinden, Nachmeldungen oder Registerkorrekturen entstehen.'],related:[],visual:'Rangübersicht',provenance:[{label:'Atlas-Ranglisten · gespeicherter Stand',date:current.observedAt.slice(0,10)}]};
 report.candidates=report.candidates.filter(c=>!oldFamilies.has(c.family)||c.family==='Rang-Monatsupdate'&&c.period!==current.month);
 if(highlights.length)report.candidates.push(candidate);
 report.rankMonth=current;
}
