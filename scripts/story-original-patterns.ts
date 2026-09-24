/** Read-only, source-driven municipal counterparts of the original editorial patterns. */
import type {Candidate,DiscoveryReport,SolarRow} from '../lib/story-discovery';
import type {HousingRow} from '../lib/story-housing-discovery';
export type OriginalRegion={region_id:string;name:string;population:number;population_as_of?:string};
type Input={regions:OriginalRegion[];rows:SolarRow[];sourceDate:string;housing?:HousingRow[]};
export type PatternCoverage={pattern:string;status:'found'|'none'|'missing'|'not-applicable';reason:string};
const patterns=['ausreisser','kontrast','umkehrung','aufholer','topliste','david','flaechenmix','foerderluecke','kohorte','heizungsfoerderung','wohnform','anomalie','saison'] as const;
const band=(p:number)=>p<500?'unter500':p<2000?'500–1.999':p<10000?'2.000–9.999':p<50000?'10.000–49.999':p<100000?'50.000–99.999':'ab100.000';
const labels:Record<string,string>={gebaeude:'Gebäudeanlagen',steckersolar:'Balkonkraftwerke',freiflaeche:'Freiflächenanlagen',sonstige:'Sonstige Solaranlagen'};
export function prepareOriginalPatterns(input:Input){
 const validDate=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(!validDate(input.sourceDate))throw new Error('Invalid source date for original pattern replay');
 const cutoff=Number(input.sourceDate.slice(0,4))*12+Number(input.sourceDate.slice(5,7))-4;
 const year=Math.min(Number(input.sourceDate.slice(0,4))-1,Math.floor(cutoff/12)-1);
 const grouped=new Map<string,SolarRow[]>();for(const r of input.rows){const a=grouped.get(r.region_id)??[];a.push(r);grouped.set(r.region_id,a);}
 const invalidCities=new Set<string>();for(const [id,rs] of grouped){const keys=new Set<string>();for(const r of rs){const key=r.segment+'|'+r.month;if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month)||r.month>input.sourceDate.slice(0,7)||!Number.isInteger(r.count)||r.count<0||!Number.isFinite(r.kwp)||r.kwp<0||keys.has(key))invalidCities.add(id);keys.add(key);}}
 const towns=input.regions.map(r=>{const rs=grouped.get(r.region_id)??[];return {...r,rows:rs,bkw:rs.filter(x=>x.segment==='steckersolar').reduce((s,x)=>s+x.count,0),bkwNew:rs.filter(x=>x.segment==='steckersolar'&&x.month.startsWith(String(year))).reduce((s,x)=>s+x.count,0),building:rs.filter(x=>x.segment==='gebaeude').reduce((s,x)=>s+x.kwp,0),buildingCount:rs.filter(x=>x.segment==='gebaeude').reduce((s,x)=>s+x.count,0)};});
 type Town=typeof towns[number];
 const byId=new Map(towns.map(t=>[t.region_id,t]));
 const cohorts=new Map<string,Town[]>(),editions=new Map<string,Town[]>();
 for(const t of towns){if(!Number.isFinite(t.population)||t.population<500||!t.population_as_of||!validDate(t.population_as_of)||!t.rows.length||invalidCities.has(t.region_id))continue;const key=t.population_as_of+'|'+band(t.population);for(const [map,k] of [[cohorts,key],[editions,t.population_as_of]] as const){const a=map.get(k)??[];a.push(t);map.set(k,a);}}
 const housing=new Map((input.housing??[]).map(h=>[h.region_id,h]));
 const metrics=[{key:'bkw',label:'Balkonkraftwerke je 1.000 Einwohner',unit:'Anlagen/1.000 Einwohner',value:(t:Town)=>t.bkw*1000/t.population,quantity:(t:Town)=>t.bkw},{key:'bkw-new',label:`Balkon-Zubau ${year} je 1.000 Einwohner`,unit:'Anlagen/1.000 Einwohner',value:(t:Town)=>t.bkwNew*1000/t.population,quantity:(t:Town)=>t.bkwNew},{key:'building',label:'Gebäude-Solarleistung je Einwohner',unit:'Wp/Einwohner',value:(t:Town)=>t.building*1000/t.population,quantity:(t:Town)=>t.buildingCount}];
 const metricOrder=new Map<string,Town[]>(),largest=new Map<string,Town[]>(),leaderOrders=new Map<string,Town[]>();
 return function addOriginalPatterns(report:DiscoveryReport):PatternCoverage[]{
  const town=byId.get(report.regionId),coverage:PatternCoverage[]=[];
  if(report.sourceDate!==input.sourceDate||invalidCities.has(report.regionId)||report.checks.some(c=>c.family==='Datenprüfung'&&c.status==='missing'))return patterns.map(pattern=>({pattern,status:'missing',reason:'Quellenausgabe passt nicht oder die primäre Datenprüfung ist fehlgeschlagen.'}));
  if(!town)return patterns.map(pattern=>({pattern,status:'missing',reason:'Gemeindeschlüssel nicht im Eingabeverzeichnis.'}));
  const own=town,cohort=cohorts.get((own.population_as_of??'')+'|'+band(own.population))??[],edition=editions.get(own.population_as_of??'')??[];
  const counts=new Map<string,number>();
  const context=`Gemeinden mit ${band(own.population)} Einwohnern, Gemeindeverzeichnis-Gebietsstand ${own.population_as_of}; aktive Registereinheiten, Export ${input.sourceDate}.`;
  const caveats=['Einwohnerzahlen sind die aktuelle Verzeichnisbasis, kein historischer Einwohnerstand. Gebäudeanlagen sind nicht automatisch Privatdächer. Unterschiede belegen keine Ursache.'];
  function emit(pattern:string,key:string,title:string,evidence:Candidate['evidence'],comparison:string,period=input.sourceDate,limitations=caveats){
   const id=`${own.region_id}-original-${pattern}-${key}-${period}`;if(report.candidates.some(c=>c.id===id)){counts.set(pattern,(counts.get(pattern)??0)+1);return;}
   report.candidates.push({id,family:`Originalmuster: ${pattern}`,title,status:'ready',priority:55,period,comparison,evidence,reason:`Quellenbasierter Lauf des ursprünglichen Musters ${pattern}; keine nationale Begrenzung der Fundzahl.`,limitations,provenance:[{label:'Marktstammdatenregister',date:input.sourceDate},...(pattern==='wohnform'&&housing.get(own.region_id)?[{label:'Zensus',date:housing.get(own.region_id)!.stichtag}]:[])],related:[],visual:'Wertevergleich',eventKey:['umkehrung','aufholer'].includes(pattern)?'original-rank-contrast-bkw-stock-growth':`original-${pattern}-${key}`});counts.set(pattern,(counts.get(pattern)??0)+1);
  }
  if(cohort.length>=20){
   for(const m of metrics){
    if(m.quantity(own)<5)continue;
    const peers=cohort.filter(t=>t.region_id!==own.region_id),value=m.value(own);
    const medianKey=(own.population_as_of??'')+'|'+band(own.population)+'|'+m.key;let medianOrder=metricOrder.get(medianKey);if(!medianOrder){medianOrder=[...cohort].sort((a,b)=>m.value(a)-m.value(b)||a.region_id.localeCompare(b.region_id));metricOrder.set(medianKey,medianOrder);}const withoutOwn=medianOrder.filter(t=>t.region_id!==own.region_id);const baseline=(m.value(withoutOwn[Math.floor((withoutOwn.length-1)/2)])+m.value(withoutOwn[Math.floor(withoutOwn.length/2)]))/2;if(baseline<=0)continue;
    if(value>=baseline*2||value<=baseline/2)emit('ausreisser',m.key,`${own.name}: ${m.label} ${value>baseline?'über':'unter'} dem Vergleichsmedian`,[{label:own.name,value,unit:m.unit},{label:'Median Vergleichsorte',value:baseline,unit:m.unit}],`${peers.length} andere ${context}`);
    // A predeclared representative of the opposing quartile avoids selecting a convenient named extreme.
    const sortKey=(own.population_as_of??'')+'|'+band(own.population)+'|'+m.key;let sorted=metricOrder.get(sortKey);if(!sorted){sorted=[...cohort].sort((a,b)=>m.value(a)-m.value(b)||a.region_id.localeCompare(b.region_id));metricOrder.set(sortKey,sorted);}const ordered=sorted.filter(t=>t.region_id!==own.region_id);
    const other=ordered[Math.floor((value>=baseline ? .25 : .75)*(ordered.length-1))],reference=m.value(other);
    if(reference>0&&(value>=reference*2||value<=reference/2))emit('kontrast',m.key,`${own.name} und ${other.name}: ${m.label} im Vergleich`,[{label:own.name,value,unit:m.unit},{label:other.name,value:reference,unit:m.unit}],`${context} Vergleichsort am ${value>=baseline?'unteren':'oberen'} Quartil der ${peers.length} anderen Orte. Keine zufällige Einzelauswahl.`);
   }
   const eligible=cohort.filter(t=>t.bkw>=5&&t.bkwNew>=5);
   if(eligible.length>=20&&own.bkw>=5&&own.bkwNew>=5){
    const rank=(key:'bkw'|'bkwNew')=>1+eligible.filter(t=>t[key]/t.population>own[key]/own.population).length;
    const stock=rank('bkw'),growth=rank('bkwNew');
    if(Math.abs(stock-growth)/(eligible.length-1)>=.4){const evidence=[{label:'Rang Balkonbestand',value:stock,unit:'Rang'},{label:`Rang Balkon-Zubau ${year}`,value:growth,unit:'Rang'}];const comp=`Identische ${eligible.length} Gemeinden derselben Größenklasse und Verzeichnisbasis; je 1.000 Einwohner. Bestand zum Exportdatum, Zubau im Kalenderjahr ${year}. Rang 1 ist der höchste Wert.`;
     emit('umkehrung','bkw-stock-growth',`${own.name}: Balkonbestand und Zubautempo stehen unterschiedlich im Vergleich`,evidence,comp,String(year));
     emit('aufholer','bkw-stock-growth',`${own.name}: ${growth<stock?'stärker beim Zubautempo als beim Balkonbestand':'stärker beim Balkonbestand als beim Zubautempo'}`,evidence,comp,String(year));
    }
   }
  }
  const bkwMetric=metrics[0],editionKey=own.population_as_of??'';let big=largest.get(editionKey);if(!big){big=[...edition].filter(t=>t.bkw>=5).sort((a,b)=>b.population-a.population||a.region_id.localeCompare(b.region_id)).slice(0,3);largest.set(editionKey,big);}
  if(own.population>=500&&own.population<20000&&own.bkw>=5&&big.length===3){const pop=big.reduce((s,t)=>s+t.population,0),ref=big.reduce((s,t)=>s+t.bkw,0)*1000/pop,value=bkwMetric.value(own);if(ref>0&&value>=ref*3)emit('david','bkw',`${own.name}: mehr Balkonkraftwerke je Einwohner als die drei größten Städte zusammen`,[{label:own.name,value,unit:bkwMetric.unit},{label:big.map(t=>t.name).join(', '),value:ref,unit:bkwMetric.unit}],`Die drei einwohnerstärksten Städte derselben Verzeichnisbasis ${own.population_as_of}; gemeinsamer Quotient aus ${big.reduce((s,t)=>s+t.bkw,0)} Balkonkraftwerken und ${pop} Einwohnern, kein Mittelwert von Quoten.`);}
  if(edition.length>=100){
   const eligible=edition.filter(t=>t.bkw>=5);let ordered=leaderOrders.get(editionKey);if(!ordered){ordered=[...eligible].sort((a,b)=>bkwMetric.value(b)-bkwMetric.value(a));leaderOrders.set(editionKey,ordered);}
   const boundary=ordered[9];if(boundary){const leaders=ordered.filter(t=>bkwMetric.value(t)>=bkwMetric.value(boundary));if(leaders.some(t=>t.region_id===own.region_id)){
    const state=own.region_id.slice(0,2),inTop=leaders.filter(t=>t.region_id.startsWith(state)).length,all=eligible.filter(t=>t.region_id.startsWith(state)).length;
    if(inTop/leaders.length>=2*all/eligible.length)emit('topliste','bkw-state',`${own.name} gehört zur Spitzengruppe bei Balkonkraftwerken je Einwohner`,[{label:'Bundeslandanteil in der Spitzengruppe',value:100*inTop/leaders.length,unit:'%'},{label:'Bundeslandanteil unter Vergleichsorten',value:100*all/eligible.length,unit:'%'}],`Erste zehn Plätze einschließlich aller Gleichstände (${leaders.length} Orte), ${eligible.length} auswertbare Orte; Merkmal gleiches Bundesland wie ${own.name}. Der Vergleich erklärt keine Ursache.`);
   }}
  }
  for(const segment of [...new Set(own.rows.map(r=>r.segment))].sort()){
   const annual=new Map<number,{count:number;kwp:number}>();for(const r of own.rows.filter(r=>r.segment===segment&&Number(r.month.slice(0,4))<=year)){const y=Number(r.month.slice(0,4)),v=annual.get(y)??{count:0,kwp:0};v.count+=r.count;v.kwp+=r.kwp;annual.set(y,v);}
   for(const [y,v] of [...annual].sort((a,b)=>a[0]-b[0])){const prev=annual.get(y-1);if(!prev||v.count<10||prev.count<10||prev.kwp<=0)continue;const a=prev.kwp/prev.count,b=v.kwp/v.count;if(Math.abs(b/a-1)>=.3)emit('kohorte',`${segment}-${y}`,`${labels[segment]??segment}: ${y} im Mittel ${b>a?'größere':'kleinere'} Registereinheiten`,[{label:String(y-1),value:a,unit:'kWp/Einheit'},{label:String(y),value:b,unit:'kWp/Einheit'}],`Aktive Einheiten nach Inbetriebnahmejahr; ${prev.count} Einheiten ${y-1}, ${v.count} Einheiten ${y}. Arithmetische Mittelwerte, keine Aussage über eine typische Anlage.`,String(y),['Stillgelegte Anlagen fehlen im aktuellen aktiven Export. Leistungsdurchschnitt ist nicht Median.']);}
  }
  const home=housing.get(own.region_id);if(home&&validDate(home.stichtag)&&Number.isFinite(home.wohnungen)&&home.wohnungen>=200&&own.buildingCount>=5)emit('wohnform','building-per-home',`${own.name}: Gebäude-Solarleistung je Wohnung`,[{label:'Gebäude-Solarleistung je Wohnung',value:own.building*1000/home.wohnungen,unit:'Wp/Wohnung'}],`Gebäudeanlagen im Registerexport ${input.sourceDate}, ${home.wohnungen} Wohnungen laut Zensus ${home.stichtag}. Unterschiedliche Stichtage ausdrücklich ausgewiesen.`,input.sourceDate,['Gebäudeanlagen umfassen auch Nichtwohngebäude; keine Zuordnung der Anlagen zu Wohnungen und kein Dachpotenzial.']);
  for(const pattern of patterns){
   const n=counts.get(pattern)??0;
   if(n){coverage.push({pattern,status:'found',reason:`${n} neu berechnete kommunale Beobachtungen.`});continue;}
   const families:Record<string,string[]>={flaechenmix:['Bestandsprofil','Anzahl und Leistung'],anomalie:['Monatsspitze','Lokale Monatsspitze','Tageshöchstwert','Wochenhöchstwert'],wohnform:['Wohnstruktur']};
   if(families[pattern]){const matches=report.candidates.filter(c=>families[pattern].includes(c.family));coverage.push({pattern,status:matches.length?'found':'none',reason:`Durch angeschlossene Quellenmodule abgedeckt: ${families[pattern].join(', ')}; ${matches.length} Beobachtungen.`});continue;}
   if(pattern==='foerderluecke'||pattern==='heizungsfoerderung'||pattern==='saison'){coverage.push({pattern,status:'missing',reason:pattern==='saison'?'Kommunale Wetter-/Erzeugungsreihe fehlt; nationale Strommixwerte sind kein Ortswert.':pattern==='foerderluecke'?'Kein vollständiger kompatibler Fördervergleich als Eingabe; dokumentierte Änderungen ersetzen keine Förderlückenprüfung.':'Verifizierte Heizungsförderbedingungen und lokale Berechtigung fehlen in diesem Registerlauf.'});continue;}
   coverage.push({pattern,status:['ausreisser','kontrast','umkehrung','aufholer'].includes(pattern)&&cohort.length<20?'missing':'none',reason:cohort.length<20?'Weniger als zwanzig vergleichbare Orte mit nachgewiesener Verzeichnisbasis.':'Ausgewertet; keine passende Beobachtung nach der dokumentierten Mindestmenge und Vergleichsregel.'});
  }
  for(const c of coverage)report.checks.push({family:`Originalmuster: ${c.pattern}`,status:c.status==='not-applicable'?'none':c.status,reason:c.reason});
  return coverage;
 };
}
