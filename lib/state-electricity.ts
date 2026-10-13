import {BUNDESLAENDER_DATEN} from '../public/shared-nav/bundeslaender.js';
import {jahrInBerlin} from './zeit';

export const STATE_MIX_GROUPS = [
 {id:'solar',label:'Solar',sources:['solar'],color:'var(--color-brand)'},
 {id:'wind',label:'Wind an Land',sources:['wind_onshore'],color:'var(--color-text-secondary)'},
 {id:'bio',label:'Biomasse',sources:['biomass','waste_renewable'],color:'var(--color-text-primary)'},
 {id:'water',label:'Wasser & Geothermie',sources:['hydro_run-of-river','hydro_water_reservoir','geothermal'],color:'var(--color-border)'},
 {id:'coal',label:'Kohle',sources:['fossil_brown_coal_lignite','fossil_hard_coal'],color:'var(--color-text-faint)'},
 {id:'gas',label:'Erdgas',sources:['fossil_gas'],color:'var(--color-text-muted)'},
 {id:'nuclear',label:'Kernenergie',sources:['nuclear'],color:'var(--color-text-secondary)'},
 {id:'other',label:'Übrige & Speicher',sources:['fossil_oil','waste_non_renewable','hydro_pumped_storage','others','other_renewable','other_conventional'],color:'var(--color-bg-muted)'},
] as const;
export type StateElectricity = {year:number;updatedAt:string;dataUntil:string;partial:boolean;states:{id:string;name:string;totalTwh:number;segments:{id:string;label:string;value:number;color:string}[]}[];offshoreTwh:number;offshore:{id:string;name:string;value:number}[]};
type Row={id:string;linkedTo?:string;data:unknown[];xAxisValues?:number[];date?:number;lastData?:number;y0AxisLabel?:{en?:string}[]};
/** Parse the provider's published annual totals, never sum Germany into its states. */
export function parseStateElectricity(input:unknown,year:number,now=new Date()):StateElectricity {
 if(!Array.isArray(input)||!input.length)throw new Error('Empty regional generation data');
 const rows=input as Row[],meta=rows[0];
 if(meta.xAxisValues?.length!==1||meta.xAxisValues[0]!==year||meta.y0AxisLabel?.[0]?.en!=='Energy (TWh)'||!Number.isFinite(meta.date))throw new Error('Unexpected regional generation units or year');
 const seen=new Set<string>();
 const stateRows=rows.filter(row=>row.linkedTo&&BUNDESLAENDER_DATEN.some(state=>row.id===`${row.linkedTo}_${state.short.toLowerCase()}`));
 for(const row of stateRows){
  if(seen.has(row.id)||row.data.length!==1||typeof row.data[0]!=='number'||!Number.isFinite(row.data[0])||row.data[0]<0)throw new Error('Invalid regional generation value');
  if(!STATE_MIX_GROUPS.some(group=>(group.sources as readonly string[]).includes(row.linkedTo!)))throw new Error(`Unknown production type: ${row.linkedTo}`);
  seen.add(row.id);
 }
 const partial=year===jahrInBerlin(now);
 if(partial&&(!Number.isFinite(meta.lastData)||new Date(meta.lastData!).getTime()>now.getTime()||jahrInBerlin(new Date(meta.lastData!))!==year))throw new Error('Missing or invalid regional data cutoff');
 const states=BUNDESLAENDER_DATEN.map(state=>{
  const values=stateRows.filter(row=>row.id.endsWith(`_${state.short.toLowerCase()}`));
  if(values.length<3||!values.some(row=>row.linkedTo==='solar'))throw new Error(`Incomplete state: ${state.name}`);
  const segments=STATE_MIX_GROUPS.map(group=>({id:group.id,label:group.label,color:group.color,value:values.filter(row=>(group.sources as readonly string[]).includes(row.linkedTo!)).reduce((sum,row)=>sum+(row.data[0] as number),0)}));
  return {id:state.ags,name:state.name,totalTwh:segments.reduce((sum,s)=>sum+s.value,0),segments};
 });
 const offshore=rows.filter(row=>['wind_offshore_ns','wind_offshore_os'].includes(row.id));
 if(new Set(offshore.map(row=>row.id)).size!==2||offshore.length!==2||offshore.some(row=>typeof row.data[0]!=='number'||!Number.isFinite(row.data[0])||row.data[0]<0))throw new Error('Missing offshore totals');
 return {year,updatedAt:new Date(meta.date!).toISOString(),dataUntil:partial?new Date(meta.lastData!).toISOString():`${year}-12-31T23:00:00+01:00`,partial,states,offshore:offshore.map(row=>({id:row.id==='wind_offshore_ns'?'offshore-nordsee':'offshore-ostsee',name:row.id==='wind_offshore_ns'?'Nordsee':'Ostsee',value:row.data[0] as number})),offshoreTwh:offshore.reduce((sum,row)=>sum+(row.data[0] as number),0)};
}
