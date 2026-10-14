import {cache} from 'react';
import {headers} from 'next/headers';
import {NextRequest} from 'next/server';
import {GET as generationHandler} from '../../api/energy/generation/route';
import {ladeLetztenStandMitAbruf} from '../../../lib/energy-letzter-stand';
import type {GenerationData} from '../../../lib/energy';
import {recordPageContent} from '../../../lib/page-content-state';
import {strommixLiveSeo,STROMMIX_LIVE_PATH} from '../../../lib/strommix-live-seo';
/** A visitor waits this long for Energy-Charts; then the stored copy (minutes old) is served. */
const LIVE_BUDGET_MS=4000;
/** Share crawls and HTML use one observation and the existing protected reader. */
export const loadStrommixPage=cache(async(review=false)=>{
 let initialData:GenerationData|undefined;
 try {
  const live=generationHandler(new NextRequest('https://solar-check.io/api/energy/generation?country=de&hours=24',{headers:await headers()}));
  live.catch(()=>{});
  const response=await Promise.race([live,new Promise<null>(r=>setTimeout(()=>r(null),LIVE_BUDGET_MS))]);
  if(response?.ok){
   const fresh=await response.json() as GenerationData;
   if(Array.isArray(fresh.data)&&fresh.data.length)initialData=fresh;
  }
 } catch { /* The durable observation remains available during an outage. */ }
 if(!initialData){
  const stored=await ladeLetztenStandMitAbruf<GenerationData>('generation','de-24');
  if(stored?.payload.data.length)initialData={...stored.payload,retrievedAt:stored.retrievedAt,stale:true};
 }
 const renderedAt=new Date().toISOString();
 const preliminary=strommixLiveSeo(initialData);
 const modifiedAt=!review&&preliminary.content&&!initialData?.stale?await recordPageContent(STROMMIX_LIVE_PATH,preliminary.content,renderedAt):undefined;
 return {initialData,renderedAt,...strommixLiveSeo(initialData,modifiedAt)};
});
