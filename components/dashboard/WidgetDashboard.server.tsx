import 'server-only';
import {renderWidgetSource} from './WidgetRenderer.server';
import {loadWidgetSnapshots} from '../../lib/widget-data.server';
import {widgetPresentationContract, widgetVariantFromQuery} from '../../lib/widget-appearance';
export type DashboardWidget = {id:string; widgetId:string; src:string};
/** Prepare any registered composition once. Hosts supply arrangement, never charts. */
export async function prepareWidgetDashboard(items:readonly DashboardWidget[]) {
 if(new Set(items.map(item=>item.id)).size!==items.length)throw new Error('Duplicate dashboard instance');
 const instances=items.map(item=>{
  const url=new URL(item.src,'https://solar-check.io');
  const variant=widgetVariantFromQuery(item.widgetId,url.searchParams);
  const contract=widgetPresentationContract(item.widgetId,variant);
  if(!contract)throw new Error(`Missing dashboard contract: ${item.widgetId}`);
  url.searchParams.set('onsite','1');
  url.searchParams.set('sharing','on');
  if(contract.supportsAllocation)url.searchParams.set('layout','allocated');
  return {...item,src:url.pathname+url.search,query:Object.fromEntries(url.searchParams)};
 });
 const [snapshots,views]=await Promise.all([
  loadWidgetSnapshots(instances),
  Promise.all(instances.map(async item=>{
   try{return [item.id,await renderWidgetSource(item.src)] as const;}
   catch(error){console.error('Widget preparation failed',item.widgetId,error);return [item.id,<p role="alert">Dieses Widget konnte gerade nicht geladen werden. Bitte die Seite erneut laden.</p>] as const;}
  })),
 ]);
 return {snapshots,views:Object.fromEntries(views),queries:Object.fromEntries(instances.map(item=>[item.id,item.query])),sources:Object.fromEntries(instances.map(item=>[item.id,item.src]))};
}
