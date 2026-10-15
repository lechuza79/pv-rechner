import {loadWidgetDashboard} from '../../../../lib/widget-dashboard-store.server';
import {decodeDashboardConfiguration} from '../../../../lib/widget-dashboard-codec.server';
import WidgetDashboard from '../../../../components/dashboard/WidgetDashboard';
import {prepareWidgetDashboard} from '../../../../components/dashboard/WidgetDashboard.server';
import {dashboardLeaves} from '../../../../lib/widget-dashboard';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
import {allWidgets} from '../../../../lib/widget-registry';
import {DataSourceNote} from '../../../../components/PoweredBy';
export const metadata={title:'Solar Check Dashboard',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}){
 const query=await searchParams;
 let config;
 try{config=query.dashboard?await loadWidgetDashboard(query.dashboard):decodeDashboardConfiguration(query.config??'');if(!config)throw new Error('Missing dashboard');}catch{return <p role="alert">Diese Dashboard-Konfiguration ist ungültig.</p>;}
 const leaves=config.sections.flatMap(section=>dashboardLeaves(section.root));
 const prepared=await prepareWidgetDashboard(leaves.map(leaf=>({id:leaf.id,widgetId:leaf.widgetId,src:config.sources[leaf.id]})));
 const ids=new Set(leaves.map(leaf=>leaf.widgetId));
 const sources=[...new Map(allWidgets().filter(widget=>ids.has(widget.id)).flatMap(widget=>widget.sources).map(source=>[source.url,source])).values()];
 return <div style={{padding:0}}><WidgetDashboard sections={config.sections} {...prepared} initialAppearance={{theme:'dark',...config.appearance,...Object.fromEntries(Object.entries(parseWidgetAppearance(query)).filter(([,value])=>value!==undefined))}} controls={false} variants={false} heightBudget={800}/><footer style={{padding:16}}>{sources.map(source=><div key={source.url}><DataSourceNote source={source}/></div>)}</footer></div>;
}
