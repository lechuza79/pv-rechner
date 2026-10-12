import type {NuclearDataPoint} from './nuclear-import';

export type NuclearDay = {date:string;gw:number|null;partial:boolean;coverage:number};
const dayFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'});
const day=(ts:number)=>dayFormat.format(ts);
const hour=3600000;
/** Berlin calendar boundaries include the 23/25-hour clock-change days. */
function bounds(date:string):[number,number] {
 const noon=Date.parse(`${date}T12:00:00Z`);
 let start=noon-36*hour;
 while(day(start)!==date)start+=hour;
 let end=start+hour;
 while(day(end)===date)end+=hour;
 return [start,end];
}
/** Seven calendar days ending with the newest observed sample; never fill gaps with zero. */
export function nuclearDaily(points:NuclearDataPoint[]):NuclearDay[] {
 const samples=[...new Map(points.filter(p=>Number.isFinite(Date.parse(p.ts))&&Number.isFinite(p.nuclear_gw)&&p.nuclear_gw>=0).map(p=>[Date.parse(p.ts),p.nuclear_gw])).entries()].sort((a,b)=>a[0]-b[0]);
 if(!samples.length)return [];
 const steps=samples.slice(1).map((p,i)=>p[0]-samples[i][0]).filter(n=>n>0&&n<=hour);
 // Cadence describes each observation's support; gaps are never bridged.
 const cadence=steps.length?Math.min(...steps):null;
 const latest=day(samples[samples.length-1][0]);
 return Array.from({length:7},(_,i)=>{
  const date=new Date(Date.parse(`${latest}T12:00:00Z`)-(6-i)*24*hour).toISOString().slice(0,10);
  const [start,end]=bounds(date);
  const observed=samples.filter(([ts])=>ts>=start&&ts<end);
  if(!observed.length)return {date,gw:null,partial:true,coverage:0};
  if(cadence===null)return {date,gw:observed[0][1],partial:true,coverage:0};
  let duration=0,weighted=0;
  observed.forEach(([ts,value],i)=>{const width=Math.min(cadence,end-ts,(observed[i+1]?.[0]??Infinity)-ts);duration+=width;weighted+=value*width;});
  const coverage=duration/(end-start);
  return {date,gw:weighted/duration,partial:coverage<.999,coverage};
 });
}

export type NuclearEnergyDay = {date:string;gwh:number|null;partial:boolean;coverage:number};
/** Integrate interval-start observations over the last seven completed Berlin days.
 * Interval length is a source contract, never inferred from potentially gapped data.
 */
export function nuclearDailyEnergy(points:NuclearDataPoint[],asOf:string,intervalMinutes=15):{days:NuclearEnergyDay[];totalGwh:number|null} {
 const timestamp=Date.parse(asOf);
 if(!Number.isFinite(timestamp)||!Number.isFinite(intervalMinutes)||intervalMinutes<=0||intervalMinutes>60)return {days:[],totalGwh:null};
 const today=day(timestamp);
 const samples=[...new Map(points.filter(p=>Number.isFinite(Date.parse(p.ts))&&Number.isFinite(p.nuclear_gw)&&p.nuclear_gw>=0).map(p=>[Date.parse(p.ts),p.nuclear_gw])).entries()].sort((a,b)=>a[0]-b[0]);
 const interval=intervalMinutes*60000;
 const days=Array.from({length:7},(_,i):NuclearEnergyDay=>{
  const date=new Date(Date.parse(`${today}T12:00:00Z`)-(7-i)*24*hour).toISOString().slice(0,10);
  const [start,end]=bounds(date);
  let duration=0,energy=0;
  samples.forEach(([ts,value],index)=>{
   const left=Math.max(start,ts);
   const right=Math.min(end,ts+interval,samples[index+1]?.[0]??Infinity,timestamp);
   const width=Math.max(0,right-left);
   duration+=width;
   energy+=value*width/hour;
  });
  return {date,gwh:duration>0?energy:null,partial:duration<end-start-1,coverage:duration/(end-start)};
 });
 return {days,totalGwh:days.every(d=>!d.partial&&d.gwh!==null)?days.reduce((sum,d)=>sum+d.gwh!,0):null};
}
