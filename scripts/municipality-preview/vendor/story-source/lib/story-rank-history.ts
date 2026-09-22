import type {DiscoveryReport} from './story-discovery';
export type RankObservation={sourceDate:string;metric:string;period:string;cohort:string;size:number;rank:number;value:number;populationBasis:string};
const metricLabel=(rank:RankObservation)=>rank.metric==='active-solar-commissioning-wp-per-resident-v1'?`Solarzubau je Einwohner im Jahr ${rank.period}`:null;
const valid=(rank:RankObservation)=>Number.isInteger(rank.rank)&&rank.rank>=1&&Number.isInteger(rank.size)&&rank.rank<=rank.size&&Number.isFinite(rank.value)&&rank.value>=0;
/** A current position is useful even before a second comparable edition exists. */
export function appendCurrentRank(report:DiscoveryReport){
 const rank=report.ranking;if(!rank||!valid(rank)||!metricLabel(rank))return;
 if(report.candidates.some(c=>['Rangänderung','Aufsteiger','Absteiger','Rang gehalten','Aktueller Rang'].includes(c.family)))return;
 report.candidates.push({id:`${report.regionId}-rank-current-${rank.sourceDate}`,family:'Aktueller Rang',title:`Platz ${rank.rank.toLocaleString('de-DE')} beim Solarzubau je Einwohner`,status:'ready',priority:65,period:rank.sourceDate,eventKey:'ranking',evidence:[{label:rank.sourceDate,value:rank.rank,unit:'Platz'}],comparison:`${metricLabel(rank)}: ${rank.size.toLocaleString('de-DE')} Gemeinden mit halb bis doppelt so vielen Einwohnern wie der Ort. Einwohnerstand ${rank.populationBasis}.`,reason:'Aktuelle Platzierung aus der vollständig berechneten Vergleichsgruppe.',limitations:['Aktive Anlagen des aktuellen Registerexports nach Inbetriebnahmejahr; kein rekonstruierter historischer Bestand.'],related:[],visual:'Rang'});
}
/** Only compare observations actually retained, with identical cohort and rules. */
export function appendRankChange(report:DiscoveryReport,previous?:DiscoveryReport){
 const a=previous?.ranking,b=report.ranking;
 if(!a||!b||!valid(a)||!valid(b)||previous?.version!==report.version||a.sourceDate>=b.sourceDate||a.metric!==b.metric||a.period!==b.period||a.populationBasis!==b.populationBasis||a.cohort!==b.cohort||a.size!==b.size)return;
 const family=b.rank<a.rank?'Aufsteiger':b.rank>a.rank?'Absteiger':'Rang gehalten';
 const change=Math.abs(a.rank-b.rank).toLocaleString('de-DE');
 const title=family==='Rang gehalten'?`Platz ${b.rank.toLocaleString('de-DE')} beim Solarzubau gehalten`:`${change} ${Math.abs(a.rank-b.rank)===1?'Platz':'Plätze'} ${family==='Aufsteiger'?'aufgestiegen':'abgestiegen'} beim Solarzubau`;
 const id=`${report.regionId}-rank-${a.sourceDate}-${b.sourceDate}`;
 if(report.candidates.some(c=>c.id===id))return;
 report.candidates=report.candidates.filter(c=>c.family!=='Aktueller Rang');
 report.candidates.push({id,family,title,status:'ready',priority:70,period:b.sourceDate,eventKey:'ranking',evidence:[{label:a.sourceDate,value:a.rank,unit:'Platz'},{label:b.sourceDate,value:b.rank,unit:'Platz'}],comparison:`${metricLabel(b)??'Solarzubau im Ortsvergleich'}: ${b.size.toLocaleString('de-DE')} Orte derselben unveränderten Vergleichsgruppe mit halb bis doppelt so vielen Einwohnern; Einwohnerstand ${b.populationBasis}.`,reason:'Zwei gespeicherte Auswertungsstände mit identischer Messgröße, Einwohnerbasis und Gruppenzusammensetzung.',limitations:['Veränderung zwischen Registerausgaben; kann auch durch Nachmeldungen und Korrekturen entstehen. Ein gehaltener Rang bedeutet nicht, dass der Anlagenbestand unverändert ist.'],related:[],visual:'Rangverlauf'});
}
