import {calcCurrentPower} from './simulation';
export type SolarMonth={town?:string;month:string;days:{date:string;mw:number[];mwh:number}[];totalMwh:number;peakDay:string;peakMw:number;sourceDate:string;retrievedAt:string;sourceUrl:string};
type Weather={hourly:{time:string[];temperature_2m:(number|null)[];shortwave_radiation:(number|null)[]}};
/** Radiation is the preceding hourly mean. Assign each interval by its midpoint. */
export function solarMonth(weather:Weather,installations:{day:string;kwp:number;segment:string}[],month:string,sourceDate:string,retrievedAt:string,sourceUrl:string):SolarMonth{
 const days=new Map<string,{date:string;mw:number[];mwh:number}>();
 const local=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
 const seen=new Set<string>();
 const hourCounts=new Map<string,number>();
 const solar=installations.filter(r=>['gebaeude','freiflaeche','steckersolar','sonstige'].includes(r.segment));
 const stocks=new Map<string,number>();
 weather.hourly.time.forEach((time,i)=>{
  const parts=local.formatToParts(new Date(Date.parse(time+'Z')-1800000));
  const get=(key:string)=>parts.find(p=>p.type===key)!.value;
  const date=`${get('year')}-${get('month')}-${get('day')}`;
  if(!date.startsWith(month))return;
  const hour=Number(get('hour')),key=date+'-'+hour;
  if(seen.has(time))throw Error('Duplicate UTC hour');seen.add(time);
  hourCounts.set(key,(hourCounts.get(key)??0)+1);
  const radiation=weather.hourly.shortwave_radiation[i],temp=weather.hourly.temperature_2m[i];
  if(radiation==null||temp==null||!Number.isFinite(radiation)||!Number.isFinite(temp)||radiation<0)throw Error('Missing weather values');
  if(!stocks.has(date))stocks.set(date,solar.filter(r=>r.day<date).reduce((sum,r)=>sum+r.kwp,0));
  const mw=calcCurrentPower(stocks.get(date)!,radiation,temp)/1e6;
  const row=days.get(date)??{date,mw:Array(24).fill(null),mwh:0};row.mw[hour]=(row.mw[hour]??0)+mw;row.mwh+=mw;days.set(date,row);
 });
 const rows=[...days.values()].sort((a,b)=>a.date.localeCompare(b.date));
 const expected=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 const expectedHours=new Map<string,number>();
 const begin=Date.parse(month+'-01T00:00:00Z')-86400000,end=Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),1)+86400000;
 for(let t=begin;t<end;t+=3600000){const parts=local.formatToParts(new Date(t-1800000));const get=(k:string)=>parts.find(p=>p.type===k)!.value;const date=`${get('year')}-${get('month')}-${get('day')}`;if(date.startsWith(month)){const key=date+'-'+Number(get('hour'));expectedHours.set(key,(expectedHours.get(key)??0)+1);}}
 if(rows.length!==expected||[...expectedHours].some(([key,count])=>hourCounts.get(key)!==count))throw Error('Incomplete month');
 for(const row of rows)for(let hour=0;hour<24;hour++){const count=hourCounts.get(row.date+'-'+hour)??0;if(count)row.mw[hour]/=count;else row.mw[hour]=((row.mw[hour-1]??0)+(row.mw[hour+1]??0))/2;}
 // Display maps 23/25 real intervals to 24 clock positions; energy sums retain every interval.

 const winner=[...rows].sort((a,b)=>b.mwh-a.mwh)[0];
 return {month,days:rows,totalMwh:rows.reduce((sum,r)=>sum+r.mwh,0),peakDay:winner.date,peakMw:Math.max(...rows.flatMap(r=>r.mw)),sourceDate,retrievedAt,sourceUrl};
}
