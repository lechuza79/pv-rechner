import 'server-only';
import {cache} from 'react';
import {CO2_REGIONS,parseRegionalHourly} from './co2map';
/** Short shared cache; fetch only a two-day window from the public provider. */
export const loadRegionalHourly=cache(async()=>{
 const now=new Date();const start=new Date(now.getTime()-86400000).toISOString().slice(0,10),end=new Date(now.getTime()+86400000).toISOString().slice(0,10);
 const rows=await Promise.all(CO2_REGIONS.map(async([id])=>{
  const query=new URLSearchParams({state:id,country:'DE',start,end});
  const response=await fetch(`https://api.co2map.de/RegionalizedGenerationPerTypePreliminary/?${query}`,{next:{revalidate:900},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Regional hourly provider unavailable');return [id,await response.json()] as const;
 }));
 return parseRegionalHourly(Object.fromEntries(rows),now);
});
