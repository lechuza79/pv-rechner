import type {GemeindePaket, MonthValue} from './gemeinde-paket';
import type {SolarMonth} from './story-monthly-solar';
import type {EnergyYear} from './story-energy-year';
export type DistrictEnergy = Omit<NonNullable<GemeindePaket['monitorPeriods']>, 'weatherPoint'>;
type Packet = Pick<GemeindePaket,'ags'|'registerStand'|'monitorPeriods'> & {
 /** An already aggregated part (district or Bundesland, lib/region-package.ts).
  *  It carries no single self-consumption share; its months only have a value
  *  when ITS members shared one valuation basis, which the date then states. */
 aggregate?:true;
};
/** One member of an aggregation: a town package or an aggregate one level down. */
export type EnergyPacket = Packet & Pick<GemeindePaket,'monitorHistory'>;
const valid = (n:number) => Number.isFinite(n) && n >= 0;
const sum = (numbers:number[]) => numbers.reduce((a,b)=>a+b,0);
function calendar(start:string,count:number) {
 return Array.from({length:count},(_,i)=>new Date(Date.parse(start+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
}
/** Sum only complete, aligned periods from every member and the same register edition. */
export function aggregateDistrictEnergy(ids:string[],packets:(Packet|null)[],town:string):DistrictEnergy|null {
 if(!ids.length || new Set(ids).size!==ids.length || packets.length!==ids.length || packets.some(p=>!p||!ids.includes(p.ags)) || new Set(packets.map(p=>p?.ags)).size!==ids.length)return null;
 const rows=packets as Packet[];
 if(rows.some(p=>p.registerStand!==rows[0].registerStand||!p.monitorPeriods))return null;
 const periods=rows.map(p=>p.monitorPeriods!);
 const first=periods[0];
 const sameValueBasis=!!first.valuationAssumptionDate && periods.every((p,i)=>p.valuationAssumptionDate===first.valuationAssumptionDate && (rows[i].aggregate || (p.privateSelfConsumption!==null && valid(p.privateSelfConsumption) && p.privateSelfConsumption<=1)));
 const monthly:DistrictEnergy['monthly']=[];
 for(const candidate of first.monthly){
  const month=candidate.month;
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))continue;
  const matches=periods.map(p=>p.monthly.filter(m=>m.month===month));
  if(matches.some(m=>m.length!==1))continue;
  const sources=matches.map(m=>m[0]);
  const [year,m]=month.split('-').map(Number);
  const dates=calendar(month+'-01',new Date(Date.UTC(year,m,0)).getUTCDate());
  if(sources.some(s=>s.solar.sourceDate!==rows[0].registerStand||s.solar.month!==month||s.solar.days.length!==dates.length||s.solar.days.some((d,i)=>d.date!==dates[i]||!valid(d.mwh)||d.mw.length!==24||d.mw.some(v=>v!==null&&!valid(v)))))continue;
  // Missing DST hours must match in every location, never turn missing observations into zero.
  if(dates.some((_,i)=>Array.from({length:24},(_,h)=>h).some(h=>sources.some(s=>(s.solar.days[i].mw[h]===null)!==(sources[0].solar.days[i].mw[h]===null)))))continue;
  const days=dates.map((date,i)=>({date,mwh:sum(sources.map(s=>s.solar.days[i].mwh)),mw:Array.from({length:24},(_,h)=>sources[0].solar.days[i].mw[h]===null?null:sum(sources.map(s=>s.solar.days[i].mw[h]))) as number[]}));
  const peak=days.reduce((a,b)=>b.mwh>a.mwh?b:a);
  const solar:SolarMonth={...sources[0].solar,town,days,totalMwh:sum(days.map(d=>d.mwh)),peakDay:peak.date,peakMw:Math.max(...days.flatMap(d=>d.mw)),retrievedAt:sources.map(s=>s.solar.retrievedAt).sort()[0]};
  let value:MonthValue|null=null;
  const keys=['euro','feedInEuro','totalMwh','unitCount','approximateTariffCount','unknownModeCount','commercialSelfUseUnknownCount'] as const;
  if(sameValueBasis && sources.every(s=>s.value&&keys.every(k=>valid(s.value![k]))))value=Object.fromEntries(keys.map(k=>[k,sum(sources.map(s=>s.value![k]))])) as MonthValue;
  monthly.push({month,solar,value});
 }
 const annual:EnergyYear[]=[];
 for(const candidate of first.annual){
  const matches=periods.map(p=>p.annual.filter(y=>y.year===candidate.year));
  if(matches.some(y=>y.length!==1))continue;
  const sources=matches.map(y=>y[0]);
  const year=candidate.year;
  const dates=calendar(`${year}-01-01`,(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000);
  if(sources.some(s=>s.sourceDate!==rows[0].registerStand||!valid(s.solarKwp)||!valid(s.windKw)||s.days.length!==dates.length||s.days.some((d,i)=>d.date!==dates[i]||!valid(d.solarMwh)||!valid(d.windMwh))))continue;
  annual.push({...candidate,town,solarKwp:sum(sources.map(s=>s.solarKwp)),windKw:sum(sources.map(s=>s.windKw)),days:dates.map((date,i)=>({date,solarMwh:sum(sources.map(s=>s.days[i].solarMwh)),windMwh:sum(sources.map(s=>s.days[i].windMwh))})),retrievedAt:sources.map(s=>s.retrievedAt).sort()[0]});
 }
 return {valuationAssumptionDate:sameValueBasis?first.valuationAssumptionDate:null,privateSelfConsumption:null,monthly:monthly.sort((a,b)=>b.month.localeCompare(a.month)),annual:annual.sort((a,b)=>b.year-a.year)};
}
