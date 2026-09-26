import type {DiscoveryReport} from './story-discovery';
export type DetailSeries={daily:{segment:string;day:string;count:number;kwp:number}[];weekly:{segment:string;week:string;count:number;kwp:number}[]};
function weekEnd(week:string){const [year,n]=week.split('-W').map(Number);const jan4=new Date(Date.UTC(year,0,4));const monday=jan4.getTime()-((jan4.getUTCDay()+6)%7)*86400000;return new Date(monday+(n*7-1)*86400000).toISOString().slice(0,10);}
function validPeriod(period:string,weekly:boolean){
 if(!weekly)return /^\d{4}-\d{2}-\d{2}$/.test(period)&&Number.isFinite(Date.parse(period))&&new Date(period).toISOString().slice(0,10)===period;
 if(!/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(period))return false;
 // Thursday defines the ISO year, including whether week 53 exists.
 return new Date(Date.parse(weekEnd(period))-3*86400000).getUTCFullYear()===Number(period.slice(0,4));
}
/** Descriptive maxima, globally and in a moving context. Never project or significance claims. */
export function addPeriodStories(report:DiscoveryReport,series:DetailSeries){
 if(!validPeriod(report.sourceDate,false))return;
 const cutoff=new Date(`${report.sourceDate.slice(0,7)}-01T00:00:00Z`);cutoff.setUTCMonth(cutoff.getUTCMonth()-3);
 for(const cadence of ['daily','weekly'] as const){
  const start=report.candidates.length,keys=new Set<string>();
  const invalid=series[cadence].some(r=>{const period='day' in r?r.day:r.week,key=r.segment+'|'+period;const bad=!validPeriod(period,cadence==='weekly')||keys.has(key)||!Number.isInteger(r.count)||r.count<0||!Number.isFinite(r.kwp)||r.kwp<0;keys.add(key);return bad;});
  if(invalid){report.checks.push({family:cadence==='daily'?'Tageswerte':'Wochenwerte',status:'missing',reason:'Ungültige Zeiträume, Werte oder doppelte Einträge; keine Spitzen daraus abgeleitet.'});continue;}
  const rows=series[cadence].map(r=>({...r,period:'day' in r?r.day:r.week,end:'day' in r?r.day:weekEnd(r.week)})).filter(r=>r.end<cutoff.toISOString().slice(0,10));
  for(const segment of [...new Set(rows.map(r=>r.segment))].sort()){
   const all=rows.filter(r=>r.segment===segment).sort((a,b)=>a.end.localeCompare(b.end));
   if(!all.length||Date.parse(all.at(-1)!.end)-Date.parse(all[0].end)<730*86400000)continue;
   for(const metric of ['count','kwp'] as const){
    const minimum=metric==='count'?10:100,ordered=[...all].sort((a,b)=>b[metric]-a[metric]||a.period.localeCompare(b.period));
    const family=cadence==='daily'?'Tageshöchstwert':'Wochenhöchstwert',unit=metric==='count'?'Anlagen':'kWp';
    const label=({steckersolar:'Balkonkraftwerke',gebaeude:'Gebäudeanlagen',freiflaeche:'Freiflächenanlagen',sonstige:'Sonstige Solaranlagen'} as Record<string,string>)[segment]??segment;
    const emitted=new Set<string>();
    const add=(a:typeof all[number],b:typeof all[number],comparison:string)=>{
     if(emitted.has(a.period)||a[metric]<minimum||b[metric]<=0||a[metric]<2*b[metric]||a[metric]-b[metric]<minimum)return;
     emitted.add(a.period);
     report.candidates.push({id:`${report.regionId}-${family}-${segment}-${metric}-${a.period}`,family,title:`${label}: ${a.period} sticht bei ${metric==='count'?'der Anlagenzahl':'der Modulleistung'} heraus`,status:'ready',priority:60,period:a.period,eventKey:`${segment}-${a.period}`,evidence:[{label:a.period,value:a[metric],unit},{label:b.period,value:b[metric],unit}],comparison,reason:'Mindestens doppelt so hoch wie der höchste Vergleichswert und mindestens zehn Anlagen bzw. 100 kWp mehr. Beschreibender Vergleich, kein Signifikanztest.',limitations:['Aktive Einheiten nach gemeldetem Inbetriebnahmedatum. Häufungen können auch durch gemeinsame Datumsangaben entstehen.'],related:[],visual:cadence==='daily'?'Tagesverlauf':'Wochenverlauf'});
    };
    if(ordered.length>=2)add(ordered[0],ordered[1],`${cadence==='daily'?'Inbetriebnahmetage':'Vollständige ISO-Kalenderwochen'} ${all[0].period}–${all.at(-1)!.period}; Vergleich mit dem zweithöchsten Wert.`);
    // Keep local episodes even when a much older record dominates the global series.
    // Two years cover two seasonal cycles; absent days within the complete export are zero.
    const deque:typeof all=[];let head=0;
    for(const a of all){
     const begin=new Date(`${a.end}T00:00:00Z`);begin.setUTCFullYear(begin.getUTCFullYear()-2);
     const from=begin.toISOString().slice(0,10);
     const periodStart=(r:typeof a)=>cadence==='weekly'?new Date(Date.parse(r.end)-6*86400000).toISOString().slice(0,10):r.end;
     while(head<deque.length&&periodStart(deque[head])<from)head++;
     if(all[0].end<=from&&head<deque.length)add(a,deque[head],`${a.period} gegenüber ${cadence==='daily'?'den Inbetriebnahmetagen':'den vollständig enthaltenen ISO-Kalenderwochen'} vom ${from} bis vor ${a.period}; höchster Wert dieser zwei vorherigen Jahre.`);
     while(deque.length>head&&deque.at(-1)![metric]<a[metric])deque.pop();
     deque.push(a);
    }
   }
  }
  report.checks.push({family:cadence==='daily'?'Tageswerte':'Wochenwerte',status:report.candidates.length>start?'found':'none',reason:`Vollständige lokale Reihe und rollierende Zweijahres-Kontexte ausgewertet: ${report.candidates.length-start} klar abgesetzte Werte. Keine Tageswerte als erzeugte Energie interpretiert.`});
 }
}
