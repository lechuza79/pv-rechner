import {formatStoryDate} from './story-format';
import {calcCurrentPower} from './simulation';
import type {DiscoveryReport} from './story-discovery';

export const YIELD_METHOD='era5-reference-yield-v1';
export type YieldHour={time:string;temperature:number|null;radiation:number|null};
export type YieldInput={regionId:string;name:string;model:string;startYear:number;endYear:number;hours:YieldHour[];requests:{url:string;retrievedAt:string}[];coordinateBasis?:string};
export type YieldPeriod={key:string;calendar:string;year:number;start:string;end:string;days:number;value:number};
const hourMs=3600000;
const berlin=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'});
const dayCache=new Map<number,string>();
const localDay=(ms:number)=>{const cached=dayCache.get(ms);if(cached)return cached;const parts=berlin.formatToParts(new Date(ms));const day=['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-');if(dayCache.size>200000)dayCache.clear();dayCache.set(ms,day);return day;};
function week(day:string){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const year=d.getUTCFullYear();const n=Math.ceil(((+d-Date.UTC(year,0,1,12))/86400000+1)/7);return `${year}-W${String(n).padStart(2,'0')}`;}
const dateLabel=(p:YieldPeriod,kind:'day'|'week'|'month')=>kind==='week'?`KW ${Number(p.calendar.slice(1))}/${p.year}`:new Intl.DateTimeFormat('de-DE',{timeZone:'UTC',...(kind==='day'?{day:'numeric' as const}:{}),month:kind==='day'?'short':'long',year:'numeric'}).format(new Date(p.start+'T12:00:00Z'));
const daysInMonth=(key:string)=>new Date(Date.UTC(Number(key.slice(0,4)),Number(key.slice(5,7)),0)).getUTCDate();

/** Integrate hourly interval energy, then aggregate complete local calendar periods. */
export function yieldPeriods(input:YieldInput):Record<'day'|'week'|'month',YieldPeriod[]>{
 if(input.model!=='era5'||!Number.isInteger(input.startYear)||!Number.isInteger(input.endYear)||input.endYear-input.startYear<2)throw Error('A consistent multi-year ERA5 window is required');
 const expected=new Map<string,number>();
 for(let t=Date.UTC(input.startYear,0,1)-2*hourMs;t<=Date.UTC(input.endYear+1,0,1)+2*hourMs;t+=hourMs){const day=localDay(t-hourMs/2);if(day>=`${input.startYear}-01-01`&&day<=`${input.endYear}-12-31`)expected.set(day,(expected.get(day)??0)+1);}
 const seen=new Set<number>(),daily=new Map<string,{hours:number;value:number}>();
 for(const h of input.hours){const t=Date.parse(h.time);if(!Number.isFinite(t)||t%hourMs)throw Error('Invalid hourly timestamp');if(seen.has(t))throw Error('Duplicate weather hour');seen.add(t);const day=localDay(t-hourMs/2);if(!expected.has(day))continue;
  if(h.temperature===null||h.radiation===null||!Number.isFinite(h.temperature)||!Number.isFinite(h.radiation)||h.radiation<0||h.radiation>1600||h.temperature< -90||h.temperature>65)throw Error('Invalid or missing weather value');
  const row=daily.get(day)??{hours:0,value:0};row.hours++;
  // Use the existing model at 1 MWp to avoid its whole-watt rounding at 1 kWp.
  row.value+=calcCurrentPower(1000,h.radiation,h.temperature)/1000000;daily.set(day,row);
 }
 if([...expected].some(([d,h])=>daily.get(d)?.hours!==h))throw Error('Incomplete weather window; no peak is established');
 const days=[...daily].sort(([a],[b])=>a.localeCompare(b)).map(([day,row])=>({key:day,calendar:day.slice(5),year:Number(day.slice(0,4)),start:day,end:day,days:1,value:row.value}));
 const group=(kind:'week'|'month')=>{const groups=new Map<string,YieldPeriod>();for(const d of days){const key=kind==='week'?week(d.key):d.key.slice(0,7);const row=groups.get(key)??{key,calendar:key.slice(5),year:Number(key.slice(0,4)),start:d.start,end:d.end,days:0,value:0};row.days++;row.value+=d.value;row.end=d.end;groups.set(key,row);}return [...groups.values()].filter(p=>p.days===(kind==='week'?7:daysInMonth(p.key))&&p.year>=input.startYear&&p.year<=input.endYear);};
 return {day:days,week:group('week'),month:group('month')};
}

export function appendYieldStories(report:DiscoveryReport,input:YieldInput){
 if(input.regionId!==report.regionId)throw Error('Weather location does not match municipality');
 const periods=yieldPeriods(input),window=`${input.startYear}–${input.endYear}`;
 report.candidates=report.candidates.filter(c=>c.family!=='Ertragsspitze als Modell');
 const fetched=input.requests.map(r=>r.retrievedAt).sort().at(-1)?.slice(0,10);if(!fetched)throw Error('Weather provenance missing');
 for(const kind of ['day','week','month'] as const){const rows=periods[kind];if(!rows.length)continue;const max=Math.max(...rows.map(r=>r.value));if(max<=0)continue;const winners=rows.filter(r=>Math.abs(r.value-max)<1e-9);
  for(const winner of winners){const peers=rows.filter(r=>r.calendar===winner.calendar&&r.year!==winner.year);const mean=peers.reduce((n,r)=>n+r.value,0)/peers.length;const second=rows.filter(r=>r.value<max-1e-9).sort((a,b)=>b.value-a.value)[0];const deviation=peers.length>=5&&mean>0?(winner.value/mean-1)*100:null;
   const count=input.endYear-input.startYear+1;
   const title=kind==='month'?`Höchster Ertrag der letzten ${count} Jahre im ${dateLabel(winner,kind)}`:kind==='week'?`Höchster Wochenertrag der letzten ${count} Jahre: ${dateLabel(winner,kind)}`:`Höchster Tagesertrag der letzten ${count} Jahre am ${formatStoryDate(winner.key)}`;
   report.candidates.push({id:`${report.regionId}-${YIELD_METHOD}-${kind}-${window}-${winner.key}`,family:'Ertragsspitze als Modell',status:'ready',priority:74,eventKey:`yield-${kind}-${winner.key}`,period:winner.key,title:winners.length>1?`${title} – geteilter Spitzenplatz`:title,
    yieldSeries:rows.filter(r=>kind==='month'||r.calendar===winner.calendar).map(r=>({period:r.key,value:r.value,highlight:r.key===winner.key})),
    evidence:[{label:'Spitzenwert',value:winner.value,unit:'kWh/kWp'},...(Number.isFinite(mean)&&peers.length>=5?[{label:`Mittel derselben ${kind==='day'?'Kalendertage':kind==='week'?'Kalenderwochen':'Kalendermonate'} in ${peers.length} anderen Jahren`,value:mean,unit:'kWh/kWp'}]:[]),...(deviation!==null?[{label:'Abweichung vom Vergleichsmittel',value:deviation,unit:'%'}]:[]),...(second?[{label:`Nächstniedrigerer Modellwert: ${dateLabel(second,kind)}`,value:second.value,unit:'kWh/kWp'}]:[])],
    comparison:`${rows.length} vollständige ${kind==='day'?'Tage':kind==='week'?'Kalenderwochen':'Monate'} in ${window}. ${peers.length>=5?`Abweichung gegenüber derselben Kalenderperiode in den übrigen ${peers.length} Jahren.`:'Für diese Kalenderperiode sind zu wenige andere Jahre für eine belastbare Durchschnittsabweichung vorhanden.'}`,
    reason:'Höchste ungerundete Periodensumme im benannten Fenster, mit identischer Referenzanlage. Zubau beeinflusst den normierten Vergleich nicht. Keine Signifikanzbehauptung.',
    limitations:['Geschätzter Referenzertrag als Modellrechnung, keine gemessene Stromerzeugung der Stadt.','ERA5-Wetterraster (rund 25 km), horizontale Einstrahlung und bestehendes vereinfachtes Temperatur-/Verlustmodell. Konkrete Dachausrichtungen, Schnee und Betriebsausfälle werden nicht abgebildet.',...(kind==='month'?['Monatssummen berücksichtigen die jeweilige Monatslänge; Schaltfebruare enthalten einen zusätzlichen Tag.']:[]),...(kind==='day'?['Lokale Kalendertage können durch die Zeitumstellung 23 oder 25 Stunden umfassen.']:[]),'Eine knappe Rangfolge der Modellwerte beweist keinen tatsächlichen Ertragsrekord.'],
    provenance:[{label:'Open-Meteo · ERA5 · Modellrechnung',date:fetched,url:'https://open-meteo.com/en/docs/historical-weather-api'}],details:[{label:'Vergleichszeitraum',text:`${winner.start} bis ${winner.end}; Auswertung ${window}. Referenzanlage und Berechnung bleiben für alle Jahre gleich.`}],related:[],visual:'Ertragsspitze und Vergleichswert'});
  }
 }
 const seasonalCheck=report.checks.find(c=>c.family==='Originalmuster: saison');if(seasonalCheck)seasonalCheck.reason='Historische örtliche Wetter-Referenzerträge sind angeschlossen. Das ursprüngliche Strommix-Anteilsmuster benötigt andere Messgrößen und wird dadurch nicht ersetzt.';
 report.checks=report.checks.filter(c=>c.family!=='Historische Referenzerträge');report.checks.push({family:'Historische Referenzerträge',status:report.candidates.some(c=>c.family==='Ertragsspitze als Modell')?'found':'none',reason:`ERA5 ${window}: ${periods.day.length} vollständige Tage, ${periods.week.length} Wochen, ${periods.month.length} Monate; zubaubereinigtes Referenzmodell.`});
}
