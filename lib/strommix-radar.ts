import type {GenerationDataPoint} from './energy';
import {GENERATION_STACK_KEYS} from './chart-utils';
/** Fixed positions: all source values contribute exactly once, including small carriers. */
export function strommixRadar(data:GenerationDataPoint[]){
 const point=data.at(-1);
 const groups=[['solar','Solar'],['wind','Wind'],['biomass','Biomasse'],['hydro','Wasserkraft'],['coal','Kohle'],['gas','Erdgas'],['other','Sonstige']].map(([id,label])=>({id,label,value:0}));
 for(const key of GENERATION_STACK_KEYS){if(key==='hydro_pumped_storage')continue;const value=point?.[key];if(typeof value!=='number'||!Number.isFinite(value)||value<=0)continue;
 const id=key==='solar'?'solar':key.startsWith('wind_')?'wind':key==='biomass'?'biomass':key.startsWith('hydro_')?'hydro':['fossil_brown_coal_lignite','fossil_hard_coal'].includes(key)?'coal':key==='fossil_gas'?'gas':'other';
 groups.find(row=>row.id===id)!.value+=value;}
 const total=groups.reduce((sum,row)=>sum+row.value,0);
 return total?groups.map(row=>({...row,value:row.value/total*100})):[];
}

/** Preserve timestamps and all non-storage series for the matching headline. */
export function generationWithoutStorage(data:GenerationDataPoint[]){return data.map(point=>({...point,hydro_pumped_storage:0}));}
