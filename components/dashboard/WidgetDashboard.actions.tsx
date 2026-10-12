'use server';
import {parseDashboardConfiguration,dashboardLeaves} from '../../lib/widget-dashboard';
import {prepareWidgetDashboard} from './WidgetDashboard.server';
/** Read-only preview preparation; writes have a separate admin-protected endpoint. */
export async function prepareDashboardSelection(raw:string,id:string){
 const config=parseDashboardConfiguration(raw);
 const leaf=config.sections.flatMap(section=>dashboardLeaves(section.root)).find(leaf=>leaf.id===id);
 if(!leaf)throw new Error('Unknown dashboard instance');
 return prepareWidgetDashboard([{id,widgetId:leaf.widgetId,src:config.sources[id]}]);
}
