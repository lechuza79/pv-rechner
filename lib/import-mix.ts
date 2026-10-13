import {attributeImport,generationContributions} from './import-attribution';
export const BORDER_COUNTRIES:Record<string,string>={austria:'at',belgium:'be',czech_republic:'cz',denmark:'dk',france:'fr',luxembourg:'lu',netherlands:'nl',norway:'no',poland:'pl',sweden:'se',switzerland:'ch'};
export type ImportMixSnapshot={ts:string;importGw:number;unassignedGw:number;segments:{id:string;value:number}[]};
export function calculateImportMix(ts:string,flows:Record<string,number|string|null>,mixes:Record<string,Record<string,number|string|null>|undefined>):ImportMixSnapshot{
 const totals:Record<string,number>={};let importGw=0,unassignedGw=0;
 for(const name of Object.keys(BORDER_COUNTRIES)){
  const flow=flows[name];if(typeof flow!=='number'||!Number.isFinite(flow)||flow<=0)continue;
  importGw+=flow;
  const attributed=mixes[name]?attributeImport(flow,mixes[name]!):null;
  if(!attributed){unassignedGw+=flow;continue;}
  for(const [key,value] of Object.entries(attributed))totals[key]=(totals[key]??0)+value;
 }
 return {ts,importGw,unassignedGw,segments:Object.entries(totals).map(([id,value])=>({id,value})).sort((a,b)=>b.value-a.value)};
}

export const TRADE_GROUPS=[['renewable','Erneuerbare'],['fossil','Fossile'],['nuclear','Kernenergie'],['other','Sonstige'],['storage','Speicherabgabe']] as const;
function tradeGroup(key:string){
 if(key==='hydro_pumped_storage'||key==='battery'||key.includes('storage'))return 'storage';
 if(key==='nuclear')return 'nuclear';
 if(key.startsWith('fossil_'))return 'fossil';
 if(key==='solar'||key.startsWith('wind_')||key.startsWith('hydro_')||key==='biomass'||key==='geothermal')return 'renewable';
 return 'other';
}
export function calculateTradeMix(imports:ImportMixSnapshot,exportGw:number,generation?:Record<string,number|string|null>){
 const rows=TRADE_GROUPS.map(([id,label])=>({id,label,left:0,right:0}));
 for(const segment of imports.segments)rows.find(row=>row.id===tradeGroup(segment.id))!.left+=segment.value;
 const domestic=generation?generationContributions(generation):[];
 const pool=Object.fromEntries(rows.map(row=>[row.id,row.left]));
 for(const [key,mw] of domestic)pool[tradeGroup(key)]+=mw/1000;
 const total=Object.values(pool).reduce((sum,value)=>sum+value,0)+imports.unassignedGw;
 // Without a domestic observation, no export composition can be inferred safely.
 const usable=domestic.length>0&&total>0;
 let unassignedExportGw=exportGw;
 if(usable){for(const row of rows)row.right=exportGw*pool[row.id]/total;unassignedExportGw=exportGw*imports.unassignedGw/total;}
 return {...imports,exportGw,tradeRows:[...rows,...(imports.unassignedGw>0||unassignedExportGw>0?[{id:'unassigned',label:'Nicht zuordenbar',left:imports.unassignedGw,right:unassignedExportGw}]:[])]};
}
export type TradeMixSnapshot=ReturnType<typeof calculateTradeMix>;
