import 'server-only';
import {radarDataEndpoint} from './strommix-radar-source';
import {cache} from 'react';
import {livePreviewJson,usesLivePreviewData,livePreviewSnapshotState} from './preview-data';
import {liveWidgetDataUrl,validateLiveWidgetData} from './widget-data-services';
import {widgetResourceKey,type WidgetSnapshots} from './widget-resource';
/** Public data only. No local cookies or credentials reach the live server. */
const snapshot=cache(async(endpoint:string)=>{
 const url=liveWidgetDataUrl(endpoint);
 const data=usesLivePreviewData()?await livePreviewJson(endpoint):await (async()=>{
  const response=await fetch(url,{next:{revalidate:300},credentials:'omit',redirect:'error',signal:AbortSignal.timeout(20_000)});
  if(!response.ok)throw new Error(`Widget data unavailable (${response.status})`);
  return validateLiveWidgetData(url,await response.json());
 })();
 const state=usesLivePreviewData()?livePreviewSnapshotState(endpoint):undefined;
 return {data,fetchedAt:state?.fetchedAt??Date.now(),refreshPending:state?.stale??false};
});
const reference=new Set(['welt-zubaurennen','welt-stromrennen','laender-strommixrennen','laender-strommix-pro-kopf','zubau-erneuerbare-atom','einspeiseverguetung-verlauf']);
/** Dependencies of existing data families; presentation changes never change data identity. */
export function widgetDataDependencies(widgetId:string,query:Record<string,string>){
 if(widgetId==='kommunen-landschaft')return [`/api/windraeder-vorschau/microcharts?gemeinde=${query.ags??'03458009'}`];
 if(widgetId==='kennzahl')return [`/api/mastr/summary?region=de&type=${query.traeger??'gesamt'}&segment=alle`];
 if(widgetId==='gemeinde-solarleistung')return [`/api/gemeinde/solartag?ags=${query.ags??'06440016'}`];
 if(widgetId==='region-solarleistung')return [`/api/region/solartag?ags=${query.bl??'06'}`];
 if(reference.has(widgetId))return ['/api/widgets/reference-data'];
 if(['pv-kostenrennen','heizkostenrennen','gruengas-heizkosten'].includes(widgetId))return ['/api/prices'];
 if(widgetId==='strommix-radar'||(widgetId==='strommix'&&query.darstellung==='radar'))return [radarDataEndpoint(query)];
 if(widgetId==='strommix')return ['/api/energy/generation?country=de&hours=168','/api/energy/nuclear-import?hours=168'];
 if(widgetId==='pumpspeicher')return ['/api/energy/generation?country=de&hours=24'];
 if(widgetId==='physischer-stromhandel')return ['/api/energy/physical-flows','/api/energy/import-mix'];
 if(widgetId==='ee-ampel')return ['/api/energy/generation?country=de&hours=24'];
 if(widgetId==='erzeugung')return ['/api/energy/generation?hours=26&trim=0','/api/mastr/summary?region=de&type=solar&segment=alle'];
 if(widgetId==='karte')return ['/api/mastr/summary?region=de&type=solar&segment=alle','/api/mastr/choropleth?parent=de&type=solar&segment=alle'];
 if(widgetId==='stromhandel'){
  const period=query.period??'year',year=query.year??String(new Date().getFullYear()),month=query.month??String(new Date().getMonth()+1).padStart(2,'0');
  return [`/api/energy/trade?period=${period}${period!=='seven'?`&year=${year}`:''}${period==='month'?`&month=${month}`:''}`];
 }
 if(widgetId==='regional-current-power')return [`/api/gemeinde/solartag?ags=${query.ags??'06440016'}`];
 return [];
}
export async function loadWidgetSnapshots(items:readonly {widgetId:string;query:Record<string,string>}[]):Promise<WidgetSnapshots>{
 const endpoints=[...new Set(items.flatMap(item=>widgetDataDependencies(item.widgetId,item.query)).map(widgetResourceKey))];
 const results=await Promise.allSettled(endpoints.map(snapshot));
 // A failed initial request remains retryable in the same client data boundary.
 return Object.fromEntries(results.flatMap((result,i)=>result.status==='fulfilled'?[[endpoints[i],result.value]]:[]));
}
