import type {ProjectedRegion} from './region-perspektive';

/** Provider regions: city states are included once, never split by population. */
export const CO2_REGIONS = [
 ['SH','Schleswig-Holstein & Hamburg',['01','02']],['NI','Niedersachsen & Bremen',['03','04']],
 ['NW','Nordrhein-Westfalen',['05']],['HE','Hessen',['06']],['RP','Rheinland-Pfalz',['07']],
 ['BW','Baden-Württemberg',['08']],['BY','Bayern',['09']],['SL','Saarland',['10']],
 ['BB','Brandenburg & Berlin',['12','11']],['MV','Mecklenburg-Vorpommern',['13']],
 ['SN','Sachsen',['14']],['ST','Sachsen-Anhalt',['15']],['TH','Thüringen',['16']],
] as const;
const CARRIERS:Record<string,{label:string;renewable:boolean}>={
 Solar:{label:'Solar',renewable:true},'Wind Onshore':{label:'Wind an Land',renewable:true},
 'Wind Offshore':{label:'Wind auf See',renewable:true},Biomass:{label:'Biomasse',renewable:true},
 Hydro:{label:'Wasserkraft',renewable:true},'Other renewable':{label:'Übrige Erneuerbare',renewable:true},
 Lignite:{label:'Braunkohle',renewable:false},'Hard coal':{label:'Steinkohle',renewable:false},
 Gas:{label:'Erdgas',renewable:false},Nuclear:{label:'Kernenergie',renewable:false},
 'Other fossil':{label:'Übrige fossile',renewable:false},Storage:{label:'Speicher',renewable:false},
};
export const CO2_CARRIER_IDS=Object.keys(CARRIERS);
export type HourlyCarrier={id:string;label:string;renewable:boolean;mw:number|null};
export type HourlyRegion={id:string;name:string;carriers:HourlyCarrier[]};
export type RegionalHourlyData={retrievedAt:string;hours:{ts:string;regions:HourlyRegion[]}[]};
/** Null remains unknown. Consumption rows must never be counted as generation. */
export function parseRegionalHourly(inputs:Record<string,unknown>,now=new Date()):RegionalHourlyData {
 const parsed=CO2_REGIONS.map(([id,name])=>{
  const input=inputs[id];if(!Array.isArray(input))throw new Error(`Missing region ${id}`);
  const seen=new Set<string>();
  const series=input.flatMap((row:Record<string,unknown>)=>Object.entries(row).flatMap(([key,values])=>{
   const match=/^Generation (.+) \(preliminary\)$/.exec(key);if(!match)return [];
   if(values===null)return [];
   const carrier=match[1];if(!CARRIERS[carrier]||seen.has(carrier)||row.state!==id||row.unit!=='MW'||!Array.isArray(values))throw new Error('Unexpected regional generation schema');
   seen.add(carrier);const points=new Map<string,number|null>();
   for(const point of values){if(!Array.isArray(point)||point.length!==2)throw new Error('Invalid point');
    const [ts,value]=point;if(typeof ts!=='string'||!Number.isFinite(Date.parse(ts))||points.has(ts)||!(value===null||(typeof value==='number'&&Number.isFinite(value)&&value>=0)))throw new Error('Invalid generation value');points.set(ts,value);}
   return [{id:carrier,...CARRIERS[carrier],points}];
  }));
  if(!seen.has('Solar')||!seen.has('Wind Onshore')||!seen.has('Gas'))throw new Error('Incomplete region');
  return {id,name,series};
 });
 const candidates=[...parsed[0].series[0].points.keys()].filter(ts=>Date.parse(ts)+3600000<=now.getTime());
 const hours=candidates.sort().filter(ts=>parsed.every(region=>region.series.every(s=>s.id==='Storage'||typeof s.points.get(ts)==='number'))).slice(-24).map(ts=>({ts,regions:parsed.map(region=>({id:region.id,name:region.name,carriers:region.series.map(s=>({id:s.id,label:s.label,renewable:s.renewable,mw:s.points.get(ts)??null}))}))}));
 if(!hours.length)throw new Error('No common regional generation hour');
 return {retrievedAt:now.toISOString(),hours};
}
export function co2RegionShapes(shapes:ProjectedRegion[]):ProjectedRegion[]{
 return CO2_REGIONS.map(([id,name,members])=>{
  const parts=members.map(member=>shapes.find(s=>s.id===member));if(parts.some(p=>!p))throw new Error('Missing state geometry');
  const complete=parts as ProjectedRegion[];return {...complete[0],id,name,ground:complete.flatMap(p=>p.ground),path:complete.map(p=>p.path).join(' '),bounds:[Math.min(...complete.map(p=>p.bounds[0])),Math.min(...complete.map(p=>p.bounds[1])),Math.max(...complete.map(p=>p.bounds[2])),Math.max(...complete.map(p=>p.bounds[3]))] as [number,number,number,number]};
 });
}
