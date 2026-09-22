/** Deterministic editorial screening, not statistical significance or publication approval. */
export const DISCOVERY_VERSION='municipal-discovery-v9';
export type SolarRow={region_id:string;segment:string;month:string;count:number;kwp:number};
export type FundingContext={start:string;end?:string;label:string;url:string;checkedAt?:string;startLabel?:string};
export type DiscoveryInput={name:string;regionId:string;sourceDate:string;source:string;completeExport:boolean;rows:SolarRow[];funding?:FundingContext[];peer?:{population:number;populationDate?:string;populationBasis?:string;median:number;n:number;minPopulation:number;maxPopulation:number}};
export type Evidence={label:string;value:number;unit:string};
export type Candidate={rankSummary?:import('./story-ranking-month').RankMonthRow[];yieldSeries?:{period:string;value:number;highlight:boolean}[];provenance?:{label:string;date:string;url?:string}[];details?:{label:string;text:string}[];id:string;family:string;title:string;status:'ready'|'review';priority:number;period:string;comparison:string;evidence:Evidence[];reason:string;limitations:string[];related:string[];visual:string;eventKey:string};
export type Check={family:string;status:'found'|'none'|'missing';reason:string};
export type DiscoveryReport={rankMonth?:import('./story-ranking-month').RankMonthSnapshot;coverage?:{topic:string;first:string;last:string;count:number}[];inputKey?:string;ranking?:import('./story-rank-history').RankObservation;previousSourceDate?:string;previousCandidateIds?:string[];previousCandidateFingerprints?:string[];version:string;name:string;regionId:string;sourceDate:string;source:string;candidates:Candidate[];checks:Check[];warnings:string[];scannedRows:number;merged:number};
const names:Record<string,string>={steckersolar:'Balkonkraftwerke',gebaeude:'Gebäudeanlagen',freiflaeche:'Freiflächenanlagen',sonstige:'Sonstige Solaranlagen'};
const ordinal=(m:string)=>Number(m.slice(0,4))*12+Number(m.slice(5,7))-1;
const monthFormatter=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'});
const monthAt=(n:number)=>`${Math.floor(n/12)}-${String(n%12+1).padStart(2,'0')}`;
const monthName=(m:string)=>monthFormatter.format(new Date(`${m}-15T12:00:00Z`));
const median=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return s.length?(s[Math.floor((s.length-1)/2)]+s[Math.floor(s.length/2)])/2:0;};
export function discoverStories(input:DiscoveryInput):DiscoveryReport {
 const candidates:Candidate[]=[],checks:Check[]=[],warnings:string[]=[];
 const report:DiscoveryReport={version:DISCOVERY_VERSION,name:input.name,regionId:input.regionId,sourceDate:input.sourceDate,source:input.source,candidates,checks,warnings,scannedRows:input.rows.length,merged:0};
 const validDate=/^\d{4}-\d{2}-\d{2}$/.test(input.sourceDate)&&Number.isFinite(Date.parse(input.sourceDate))&&new Date(input.sourceDate).toISOString().slice(0,10)===input.sourceDate;
 const keys=new Set<string>();
 const invalid=input.rows.some(r=>{const key=r.segment+'|'+r.month;const bad=r.region_id!==input.regionId||!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month)||!Number.isInteger(r.count)||r.count<0||!Number.isFinite(r.kwp)||r.kwp<0||r.month>input.sourceDate.slice(0,7)||keys.has(key);keys.add(key);return bad;});
 if(!validDate||!input.completeExport||invalid||!input.rows.length){checks.push({family:'Datenprüfung',status:'missing',reason:!validDate?'Exportdatum fehlt oder ist ungültig.':!input.completeExport?'Vollständigkeit des Exports nicht belegt.':invalid?'Ungültige, doppelte oder fremde Monatswerte.':'Keine auswertbaren Zeilen.'});return report;}
 const year=Number(input.sourceDate.slice(0,4)),cutoff=ordinal(input.sourceDate.slice(0,7))-3,lastYear=Math.min(year-1,Math.floor(cutoff/12)-1);
 warnings.push('Aktive Registereinheiten nach Inbetriebnahme; kein rekonstruierter historischer Gesamtbestand.','Spitzen- und historische Ereignisvergleiche lassen drei jüngste Monate aus. Die vorläufige Jahreszwischenbilanz reicht bis zum letzten abgeschlossenen Monat; Nachmeldungen bleiben möglich.','Schwellen sind redaktionelle Auswahlregeln. Keine Signifikanz- oder Kausalitätsbehauptung.');
 const rows=input.rows.filter(r=>ordinal(r.month)<cutoff);
 if(rows.some(r=>r.month<'2000-01'))warnings.push('Frühe Inbetriebnahmedaten sind Registerangaben, kein unabhängig belegtes Baujahr. Sie werden nicht anhand einer pauschalen Jahresgrenze entfernt.');
 function add(c:Omit<Candidate,'id'|'related'|'limitations'> & {limitations?:string[]}){candidates.push({...c,id:`${input.regionId}-${c.family}-${c.eventKey}-${c.period}-${c.evidence.map(e=>e.unit).join('-')}`,related:[],limitations:c.limitations??[]});}
 function check(family:string,before:number,reason:string){checks.push({family,status:candidates.length>before?'found':'none',reason:candidates.length>before?`${candidates.length-before} einzelne Beobachtungen.`:reason});}
 for(const segment of [...new Set(rows.map(r=>r.segment))].sort()){
  const rs=rows.filter(r=>r.segment===segment).sort((a,b)=>a.month.localeCompare(b.month));const label=names[segment]??segment;
  const years=new Map<number,{count:number;kwp:number}>();for(const r of rs){const y=Number(r.month.slice(0,4)),v=years.get(y)??{count:0,kwp:0};v.count+=r.count;v.kwp+=r.kwp;years.set(y,v);}
  let before=candidates.length;
  for(const metric of ['count','kwp'] as const)for(let y=Number(rs[0].month.slice(0,4))+1;y<=lastYear;y++){
   const current=years.get(y)?.[metric]??0,previous=years.get(y-1)?.[metric]??0,unit=metric==='count'?'Anlagen':'kWp';
   if(y-1<Number(rs[0].month.slice(0,4)))continue;
   // A missing annual addition is news only after three consecutive active years.
   if(current===0&&![1,2,3].every(offset=>(years.get(y-offset)?.[metric]??0)>0))continue;
   const delta=current-previous;const minimum=metric==='count'?10:100;
   if(Math.abs(delta)>=minimum&&previous>0&&Math.abs(delta/previous)>=0.25)add({family:'Jahresveränderung',eventKey:`${segment}-${y}`,title:current===0?`${label}: ${y} erstmals seit drei Jahren kein Zubau`:`${label}: ${y} ${delta>0?'mehr':'weniger'} ${metric==='count'?'Inbetriebnahmen':'neue Modulleistung'}`,status:'ready',priority:Math.min(80,45+Math.abs(delta/previous)*10),period:String(y),comparison:`Kalenderjahr ${y} gegenüber ${y-1}`,evidence:[{label:String(y-1),value:previous,unit},{label:String(y),value:current,unit}],reason:current===0?'Kein Zubau nach drei aufeinanderfolgenden Jahren mit Zubau im aktiven Registerbestand.':'Mindestens 25 % Änderung und mindestens 10 Anlagen bzw. 100 kWp absolute Differenz.',visual:current===0?'Mehrjähriger Verlauf mit Zubaupause':'Jahresvergleich'});
  }
  check(`${label}: Jahresveränderung`,before,'Kein ausreichend großer Anstieg oder Rückgang in der vollständig verfügbaren Jahresreihe.');
  before=candidates.length;
  for(const metric of ['count','kwp'] as const){const firstYear=Number(rs[0].month.slice(0,4));const full=Array.from({length:Math.max(0,lastYear-firstYear+1)},(_,i)=>[firstYear+i,years.get(firstYear+i)??{count:0,kwp:0}] as const);if(full.length<5)continue;const top=[...full].sort((a,b)=>b[1][metric]-a[1][metric]);if(top[0][1][metric]<=top[1][1][metric]||top[0][1][metric]<(metric==='count'?10:100))continue;add({family:'Jahreshöchstwert',eventKey:`${segment}-${top[0][0]}`,title:`${label}: höchster ${metric==='count'?'Jahreszubau':'Leistungszubau'} der Vergleichsreihe`,status:'ready',priority:72,period:String(top[0][0]),comparison:`Erfasste vollständige Jahrgänge ${Math.min(...full.map(v=>v[0]))}–${lastYear}`,evidence:[{label:String(top[0][0]),value:top[0][1][metric],unit:metric==='count'?'Anlagen':'kWp'},{label:`Nächsthöchster Jahrgang ${top[1][0]}`,value:top[1][1][metric],unit:metric==='count'?'Anlagen':'kWp'}],reason:'Eindeutiger Höchstwert unter mindestens fünf erfassten Jahrgängen.',visual:'Jahresverlauf'});}
  check(`${label}: Jahreshöchstwert`,before,'Kein eindeutiger Jahreshöchstwert mit mindestens fünf erfassten Jahrgängen.');
  before=candidates.length;
  for(const metric of ['count','kwp'] as const){const top=[...rs].sort((a,b)=>b[metric]-a[metric]);if(top.length<2||cutoff-ordinal(rs[0].month)<12)continue;const peak=top[0],runner=top[1];if(peak[metric]<(metric==='count'?10:100)||peak[metric]<runner[metric]*2||peak[metric]===runner[metric])continue;add({family:'Monatsspitze',eventKey:`${segment}-${peak.month.slice(0,4)}`,title:`${label}: ${monthName(peak.month)} sticht bei ${metric==='count'?'der Anlagenzahl':'der Modulleistung'} heraus`,status:'ready',priority:78,period:peak.month,comparison:`Alle Monate ${rs[0].month}–${monthAt(cutoff-1)} im vollständigen aktiven Export, einschließlich Nullmonaten; Vergleich mit dem zweithöchsten Wert`,evidence:[{label:peak.month,value:peak[metric],unit:metric==='count'?'Anlagen':'kWp'},{label:runner.month,value:runner[metric],unit:metric==='count'?'Anlagen':'kWp'}],reason:'Mindestens doppelt so hoch wie der nächsthöchste Monat; absolute Mindestmenge erfüllt.',visual:'Monatsverlauf'});}
  check(`${label}: Monatsspitze`,before,'Kein hinreichend abgesetzter Monatswert in der gesamten reifen Reihe.');
  before=candidates.length;
  for(const r of rs.filter(r=>r.kwp>=1000&&r.count<=3))add({family:'Großanlagen-Hinweis',eventKey:`${segment}-${r.month.slice(0,4)}`,title:`${monthName(r.month)}: viel Leistung in ${r.count} Registereinheit${r.count===1?'':'en'}`,status:'ready',priority:85,period:r.month,comparison:`${label}, Monatssumme`,evidence:[{label:r.month,value:r.kwp,unit:'kWp'},{label:'Einheiten',value:r.count,unit:'Anlagen'}],reason:'Mindestens 1 MWp verteilt auf höchstens drei Einheiten.',limitations:['Die Monatssumme ist belegt. Eine Registereinheit ist nicht automatisch ein eigenständiges Projekt; aus der Summe folgt kein benanntes Großprojekt.'],visual:'Anlagenzahl und Modulleistung'});
  check(`${label}: Großanlagen`,before,'Kein Monat mit mindestens 1 MWp und höchstens drei Einheiten.');
  before=candidates.length;
  const elapsedMonths=Number(input.sourceDate.slice(5,7))-1;
  if(elapsedMonths>0){
   const periodRows=input.rows.filter(r=>r.segment===segment);
   const sum=(y:number)=>periodRows.filter(r=>r.month.startsWith(String(y))&&Number(r.month.slice(5))<=elapsedMonths).reduce((total,r)=>total+r.count,0);
   const a=sum(year),b=sum(year-1);
   if(b>=10){
    const end=new Intl.DateTimeFormat('de-DE',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(year,elapsedMonths-1,1)));
    const range=elapsedMonths===1?'Januar':`Januar bis ${end}`;
    add({family:'Vorjahreszeitraum',eventKey:`${segment}-${year}`,title:`${label}: ${a===b?'gleich viele wie':a>b?'mehr':'weniger'} im Vorjahresvergleich`,status:'ready',priority:75,period:`${year}-01 bis ${year}-${String(elapsedMonths).padStart(2,'0')}`,comparison:`${range} ${year} im Vergleich zu ${range} ${year-1}`,evidence:[{label:String(year-1),value:b,unit:'Anlagen'},{label:String(year),value:a,unit:'Anlagen'}],reason:'Vorläufige Jahreszwischenbilanz über dieselben abgeschlossenen Kalendermonate; mindestens zehn Anlagen im Vorjahreszeitraum. Keine Auswahl nach Höhe der Veränderung.',limitations:['Vorläufige Registerdaten: Nachmeldungen und Korrekturen können die Zahlen noch verändern.'],visual:'Periodenvergleich'});
   }
  }
  check(`${label}: Vorjahreszeitraum`,before,'Noch kein abgeschlossener Monat oder weniger als zehn Anlagen im Vorjahreszeitraum.');
  before=candidates.length;
  const recent=[lastYear-2,lastYear-1,lastYear].map(y=>years.get(y)?.count??0);
  const prior=[lastYear-5,lastYear-4,lastYear-3].map(y=>years.get(y)?.count??0);
  if(Number(rs[0].month.slice(0,4))<=lastYear-3&&Math.min(...recent)>=10&&median(recent)>=Math.max(10,median(prior))*2&&Math.max(...recent)<=Math.min(...recent)*1.5)add({family:'Dauerhaft höheres Niveau',eventKey:`${segment}-${lastYear}`,title:`${label}: drei Jahre auf höherem Niveau`,status:'ready',priority:70,period:`${lastYear-2}–${lastYear}`,comparison:`Drei volle Jahre ${lastYear-2}–${lastYear} gegenüber ${lastYear-5}–${lastYear-3}; fehlende frühe Jahrgänge als null aktive Einheiten im vollständigen Export`,evidence:[...recent.map((value,i)=>({label:String(lastYear-2+i),value,unit:'Anlagen'})),{label:'Median drei Vorjahre',value:median(prior),unit:'Anlagen'}],reason:'Drei Jahre mindestens zehn Anlagen, mindestens doppelt so hoher Median und untereinander höchstens Faktor 1,5. Beschreibender Niveauvergleich, kein Strukturbruchtest.',visual:'Jahresverlauf'});
  check(`${label}: Dauerhaft höheres Niveau`,before,'Kein über drei vollständige Jahre stabiles höheres Niveau nach der festgelegten Regel.');

  before=candidates.length;
  // A calendar comparison alone mostly rediscovers secular growth. Require
  // both a recent-level and a growth-adjusted same-month excess instead.
  const byMonth=new Map(rs.map(r=>[ordinal(r.month),r]));
  for(const metric of ['count','kwp'] as const)for(const r of rs){
   const unit=metric==='count'?'Anlagen':'kWp',minimum=metric==='count'?10:100;
   const at=ordinal(r.month),first=ordinal(rs[0].month);
   if(at-first<24)continue;
   const prior12=Array.from({length:12},(_,i)=>byMonth.get(at-1-i)?.[metric]??0);
   const older12=Array.from({length:12},(_,i)=>byMonth.get(at-13-i)?.[metric]??0);
   const oldTotal=older12.reduce((a,b)=>a+b,0),recentTotal=prior12.reduce((a,b)=>a+b,0);
   if(oldTotal<minimum||recentTotal<minimum)continue;
   const sameMonth=byMonth.get(at-12)?.[metric]??0;
   const expected=sameMonth*Math.max(1,recentTotal/oldTotal);
   const recentMedian=median(prior12);
   if(r[metric]>=minimum&&r[metric]-Math.max(expected,recentMedian)>=minimum&&r[metric]>=2*Math.max(expected,recentMedian)){
    add({family:'Lokale Monatsspitze',eventKey:`${segment}-${r.month}`,title:`${label}: ${monthName(r.month)} hebt sich bei ${metric==='count'?'der Anlagenzahl':'der Modulleistung'} vom jüngeren Verlauf ab`,status:'ready',priority:80,period:r.month,comparison:`${monthName(r.month)} gegenüber ${monthAt(at-12)}–${monthAt(at-1)} und dem Vorjahresmonat ${monthAt(at-12)}; dessen Wert wird bei Wachstum mit dem Verhältnis der beiden vorangegangenen Zwölfmonats-Summen angehoben.`,evidence:[{label:monthName(r.month),value:r[metric],unit},{label:'Median zwölf vorherige Monate',value:recentMedian,unit},{label:'Vorjahresmonat',value:sameMonth,unit},{label:'An Wachstum angepasster Vergleichswert',value:expected,unit}],reason:'Mindestens zehn Anlagen bzw. 100 kWp mehr und mindestens doppelt so hoch wie beide Vergleichswerte. Nullreferenzen ergeben keine Faktorbehauptung. Keine Signifikanzbehauptung.',limitations:['Beschreibender Spitzenvergleich; Ursache und Nachmeldungen sind damit nicht geklärt.'],visual:'Monatsverlauf'});
   }
  }
  check(`${label}: Lokale Monatsspitze`,before,'Keine Spitze gegenüber jüngstem Niveau und wachstumsangepasstem Vorjahresmonat; mindestens 24 Monate Vorgeschichte erforderlich.');
  before=candidates.length;
  for(let y=Number(rs[0].month.slice(0,4))+1;y<=lastYear;y++){
   const a=years.get(y-1),b=years.get(y);if(!a||!b||a.count<10||b.count<10||!a.kwp)continue;
   if((b.count-a.count)*(b.kwp-a.kwp)<0&&Math.abs(b.kwp/a.kwp-1)>=.1){
    add({family:'Anlagenzahl und Größe',eventKey:`${segment}-${y}`,title:`${label}: ${y} ${b.count<a.count?'weniger Anlagen, aber mehr Modulleistung':'mehr Anlagen, aber weniger Modulleistung'}`,status:'ready',priority:76,period:String(y),comparison:`Vollständiger Jahrgang ${y} gegenüber ${y-1}`,evidence:[{label:String(y-1),value:a.count,unit:'Anlagen'},{label:String(y),value:b.count,unit:'Anlagen'},{label:String(y-1),value:a.kwp,unit:'kWp'},{label:String(y),value:b.kwp,unit:'kWp'}],reason:'Anlagenzahl und Modulleistung entwickeln sich gegenläufig; mindestens 10 % Leistungsunterschied.',visual:'Anzahl und Leistung getrennt vergleichen'});
   }
  }
  check(`${label}: Gegenläufige Entwicklung`,before,'Keine gegenläufige Entwicklung mit mindestens zehn Anlagen je Jahrgang und 10 % Leistungsunterschied.');

 }
 let before=candidates.length;
 for(const f of input.funding??[]){for(const [boundary,label] of [[f.start,f.startLabel??'Förderbeginn'],[f.end,'Förderende']] as const){if(!boundary)continue;const near=rows.filter(r=>r.segment==='steckersolar'&&Math.abs(ordinal(r.month)-ordinal(boundary))<=1).sort((a,b)=>b.count-a.count)[0];const bkw=rows.filter(r=>r.segment==='steckersolar');const boundaryAt=ordinal(boundary);const first=bkw.length?Math.min(...bkw.map(r=>ordinal(r.month))):Infinity;const values=new Map(bkw.map(r=>[ordinal(r.month),r.count]));const baseline=boundaryAt-first>=13?Array.from({length:12},(_,i)=>values.get(boundaryAt-2-i)??0):[];if(near&&near.count>=10&&baseline.length>=12&&median(baseline)>0&&near.count>=median(baseline)*2)add({family:'Förderkontext',eventKey:`steckersolar-${near.month.slice(0,4)}`,title:`Balkonkraftwerke rund um ${label}`,status:f.checkedAt&&/^\d{4}-\d{2}-\d{2}$/.test(f.checkedAt)?'ready':'review',provenance:f.checkedAt?[{label:'Marktstammdatenregister',date:input.sourceDate},{label:f.label,date:f.checkedAt,url:f.url}]:undefined,priority:90,period:near.month,comparison:`${label} ${boundary}; Vergleichsmonate ${monthAt(boundaryAt-13)}–${monthAt(boundaryAt-2)}, Nullmonate eingeschlossen`,evidence:[{label:near.month,value:near.count,unit:'Anlagen'},{label:'Median zwölf vorherige Vergleichsmonate',value:median(baseline),unit:'Anlagen'}],reason:`Amtlich belegter Kontext: ${f.label} (${f.url}).`,limitations:['Zeitlicher Zusammenhang, keine gemessene Förderwirkung. Monatswerte sind keine Förderfallzahlen.'],visual:'Monatsverlauf mit Förderphase'});}}
 check('Förderkontext',before,input.funding?.length?'Kein auffälliger Monatswert nahe den belegten Terminen.':'Keine belegte lokale Förderhistorie als Eingabe vorhanden.');if(!input.funding?.length)checks.at(-1)!.status='missing';
 before=candidates.length;
 const totals=[...new Set(input.rows.map(r=>r.segment))].sort().map(segment=>({segment,count:input.rows.filter(r=>r.segment===segment).reduce((s,r)=>s+r.count,0),kwp:input.rows.filter(r=>r.segment===segment).reduce((s,r)=>s+r.kwp,0)}));const tc=totals.reduce((s,r)=>s+r.count,0),tp=totals.reduce((s,r)=>s+r.kwp,0);
 if(tc>=5&&tp>0)add({family:'Bestandsprofil',eventKey:'structure-all',title:'Wie sich die Solarleistung auf die Anlagentypen verteilt',status:'ready',priority:42,period:input.sourceDate,comparison:`Alle ${tc.toLocaleString('de-DE')} aktiven Solareinheiten im Export ${input.sourceDate}`,evidence:totals.map(t=>({label:names[t.segment]??t.segment,value:t.kwp,unit:'kWp'})),reason:'Vollständiger Mix der deklarierten Anlagentypen.',limitations:['Gebäudeanlagen werden ohne zusätzliche Nutzungszuordnung nicht als Privat- oder Gewerbedächer bezeichnet.'],visual:'Donut'});
 for(const t of totals)if(tc&&tp&&Math.abs(t.count/tc-t.kwp/tp)>=0.2)add({family:'Anzahl und Leistung',eventKey:`structure-${t.segment}`,title:`${names[t.segment]??t.segment}: Anlagenanteil und Leistungsanteil unterscheiden sich`,status:'ready',priority:40,period:input.sourceDate,comparison:'Alle aktiven Solareinheiten der Stadt, alle Anlagentypen',evidence:[{label:'Anlagenanteil',value:Math.round(t.count/tc*1000)/10,unit:'%'},{label:'Leistungsanteil',value:Math.round(t.kwp/tp*1000)/10,unit:'%'}],reason:'Mindestens 20 Prozentpunkte Unterschied; Bestandsstory, kein neues Ereignis.',visual:'Zwei Anteilsbalken'});
 check('Anzahl und Leistung',before,'Keine Anlagengruppe mit mindestens 20 Prozentpunkten Differenz.');
 if(input.peer&&input.peer.n>=10&&input.peer.population>0&&input.peer.median>0){const p=input.peer;const kwp=rows.filter(r=>r.month.startsWith(String(lastYear))).reduce((s,r)=>s+r.kwp,0);const value=kwp*1000/p.population;add({family:'Ortsvergleich',eventKey:'peers',title:'Solarzubau je Einwohner im Größenvergleich',status:p.populationBasis?'ready':'review',priority:50,period:String(lastYear),comparison:`${p.n} andere Orte mit ${p.minPopulation}–${p.maxPopulation} Einwohnern`,evidence:[{label:input.name,value:Math.round(value),unit:'Wp/Einwohner'},{label:'Median Vergleichsorte',value:Math.round(p.median),unit:'Wp/Einwohner'}],reason:'Gleicher Jahrgang, Größenklasse 0,5–2x Einwohnerzahl. Keine Rangbehauptung.',limitations:[p.populationBasis??(!p.populationDate?'Bezugsdatum der Einwohnerzahlen fehlt.':'Einwohnerstand '+p.populationDate),'Flächenverfügbarkeit und Großanlagen können Unterschiede erklären.'],visual:'Ortsvergleich'});checks.push({family:'Ortsvergleich',status:'found',reason:'Vergleich mit benannter Größenklasse berechnet; verwendete Einwohnerbasis steht am Befund.'});}else checks.push({family:'Ortsvergleich',status:'missing',reason:'Keine ausreichend große Vergleichsgruppe mit Einwohnerzahlen.'});
 checks.push({family:'Historische Rangänderung',status:'missing',reason:'Zwei vergleichbare historische Rangstände erforderlich.'},{family:'Bestandsmeilenstein',status:'missing',reason:'Aktueller aktiver Bestand rekonstruiert den damaligen Bestand inklusive Stilllegungen nicht.'});
 // Preserve independent claims. A shared segment/year is not a duplicate claim.
 const unique=new Map<string,Candidate>();
 for(const c of candidates.sort((a,b)=>b.period.localeCompare(a.period)||b.priority-a.priority||a.id.localeCompare(b.id))){
  const key=JSON.stringify([c.family,c.eventKey,c.period,c.evidence]);
  if(unique.has(key))report.merged++;else unique.set(key,c);
 }
 report.candidates=[...unique.values()];return report;
}
