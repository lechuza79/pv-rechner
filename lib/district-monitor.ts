import type {GemeindePaket, MonitorObservation} from './gemeinde-paket';

export type DistrictMonitorPacket = Pick<GemeindePaket,'ags'|'registerStand'|'monitorHistory'>;
export type DistrictMonitorResult =
  | {status:'ready';registerStand:string;history:NonNullable<GemeindePaket['monitorHistory']>}
  | {status:'unavailable';reason:'missing-town'|'edition'|'history'|'not-prepared'};

/** Only complete, same-edition month-end snapshots may become district totals. */
export function aggregateDistrictMonitor(ids:string[],packets:(DistrictMonitorPacket|null)[],stand:string):DistrictMonitorResult {
  const expected=new Set(ids);
  if(!expected.size||expected.size!==ids.length||packets.length!==ids.length||
    packets.some(p=>!p||!expected.has(p.ags))||new Set(packets.map(p=>p?.ags)).size!==ids.length)
    return {status:'unavailable',reason:'missing-town'};
  const present=packets as DistrictMonitorPacket[];
  if(present.some(p=>p.registerStand!==stand))return {status:'unavailable',reason:'edition'};
  const histories=present.map(p=>p.monitorHistory);
  const method='active-register-by-commissioning-date';
  if(histories.some(h=>!h||h.method!==method||!h.observations.length))return {status:'unavailable',reason:'history'};
  const fields=['solarCount','solarKwp','solarAdditions','batteryCount','batteryKwh'] as const;
  const maps=histories.map(h=>new Map(h!.observations.map(o=>[o.end,o])));
  if(histories.some((h,i)=>maps[i].size!==h!.observations.length))return {status:'unavailable',reason:'history'};
  const [year,month]=stand.split('-').map(Number);
  if(!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12)return {status:"unavailable",reason:"edition"};
  // Twenty-five complete months cover twelve-month changes and the prior YTD.
  const ends=Array.from({length:25},(_,i)=>new Date(Date.UTC(year,month-1-i,0)).toISOString().slice(0,10));
  const observations:MonitorObservation[]=[];
  for(const end of ends){
    const rows=maps.map(m=>m.get(end));
    if(rows.some(row=>!row||fields.some(k=>!Number.isFinite(row[k])||row[k]<0)))return {status:'unavailable',reason:'history'};
    const total:MonitorObservation={end,solarCount:0,solarKwp:0,solarAdditions:0,batteryCount:0,batteryKwh:0,solarCounts:{},solarMix:[]};
    for(const row of rows){
      for(const key of fields)total[key]+=row![key];
      for(const [segment,count] of Object.entries(row!.solarCounts))total.solarCounts[segment]=(total.solarCounts[segment]??0)+count;
      for(const part of row!.solarMix){
        const existing=total.solarMix.find(p=>p.label===part.label);
        if(existing)existing.value+=part.value;else total.solarMix.push({...part});
      }
    }
    observations.push(total);
  }
  return {status:'ready',registerStand:stand,history:{method,observations}};
}

type YearCell = {region_id:string;segment:string;year:number;count:number;kwp:number;kwh:number};
/**
 * The district monitor only needs totals per year and segment. Sending every
 * municipality's cells to the client doubled the ranking table's data in the
 * page payload (0.23 MB for the Eifelkreis). Same rows, summed server-side;
 * lib/__tests__/district-content.test.ts checks every derived total is unchanged.
 */
export function districtSolarCells<T extends YearCell>(cells:T[]):YearCell[] {
  const sum=new Map<string,YearCell>();
  for(const c of cells){
    const key=`${c.year}|${c.segment}`;
    const row=sum.get(key)??{region_id:'',segment:c.segment,year:c.year,count:0,kwp:0,kwh:0};
    row.count+=c.count;row.kwp+=c.kwp;row.kwh+=c.kwh;
    sum.set(key,row);
  }
  return [...sum.values()];
}
