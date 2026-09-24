import type {DiscoveryReport,SolarRow} from './story-discovery';
export type AdditionsSeries={months:string[];counts:number[];kwp:number[];segments:{label:string;count:number;kwp:number}[]};
/** Last closed calendar month and eleven predecessors, from a complete export. */
export function appendMonthlyAdditions(report:DiscoveryReport,rows:SolarRow[],complete:boolean){
 if(!complete) return;
 const ordinal=Number(report.sourceDate.slice(0,4))*12+Number(report.sourceDate.slice(5,7))-2;
 const months=Array.from({length:12},(_,i)=>{const n=ordinal-11+i;return `${Math.floor(n/12)}-${String(n%12+1).padStart(2,'0')}`;});
 const local=rows.filter(r=>r.region_id===report.regionId);
 if(local.some(r=>!Number.isFinite(r.count)||!Number.isFinite(r.kwp)||r.count<0||r.kwp<0))throw Error('Invalid additions input');
 const counts=months.map(m=>local.filter(r=>r.month===m).reduce((s,r)=>s+r.count,0));
 const kwp=months.map(m=>local.filter(r=>r.month===m).reduce((s,r)=>s+r.kwp,0));
 const month=months[11];
 if(!counts[11]&&!counts.slice(0,11).some(Boolean))return;
 const labels:Record<string,string>={gebaeude:'Gebäudeanlagen',freiflaeche:'Freiflächenanlagen',steckersolar:'Balkonkraftwerke',sonstige:'Sonstige Solaranlagen'};
 const segments=Object.entries(labels).map(([key,label])=>({label,count:local.filter(r=>r.month===month&&r.segment===key).reduce((s,r)=>s+r.count,0),kwp:local.filter(r=>r.month===month&&r.segment===key).reduce((s,r)=>s+r.kwp,0)})).filter(r=>r.count>0);
 const id=`${report.regionId}-monthly-additions-${month}`;if(report.candidates.some(c=>c.id===id))return;
 const label=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-15T12:00:00Z'));
 report.candidates.push({id,family:'Zubau-Monatsrecap',period:month,eventKey:'monthly-additions-'+month,title:counts[11]?`${counts[11].toLocaleString('de-DE')} ${counts[11]===1?'neue Solaranlage':'neue Solaranlagen'} im ${label}`:`Im ${label} noch kein Solarzubau registriert`,status:'ready',priority:94,comparison:'Zwölf abgeschlossene Monate · vorläufige Registerdaten',evidence:[{label:'Neue Anlagen',value:counts[11],unit:'Anlagen'},{label:'Neue Modulleistung',value:kwp[11],unit:'kWp'}],reason:'Regelmäßiger aktueller Monatsrückblick; keine künstliche Ausreißerbehauptung.',limitations:['Heute aktive Registereinheiten nach Inbetriebnahmedatum. Nachmeldungen und Korrekturen sind möglich; später stillgelegte Einheiten fehlen. Gebäudeanlagen sind nicht automatisch private Dächer.'],related:[],visual:'Monatsverlauf',additionsSeries:{months,counts,kwp,segments}});
}
