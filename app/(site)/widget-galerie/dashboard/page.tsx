import {notFound} from 'next/navigation';
import WidgetDashboard from '../../../../components/dashboard/WidgetDashboard';
import {prepareWidgetDashboard} from '../../../../components/dashboard/WidgetDashboard.server';
import {loadWidgetDashboard} from '../../../../lib/widget-dashboard-store.server';
import {dashboardLeaves} from '../../../../lib/widget-dashboard';
import {curatedGalleryEntries} from '../../../../lib/widget-gallery';
import {isAdminSession} from '../../../../lib/admin-guard';
export const dynamic='force-dynamic';
export const metadata={title:'Gespeichertes Dashboard',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{dashboard?:string}>}){
 const {dashboard=''}=await searchParams;
 const config=await loadWidgetDashboard(dashboard);
 if(!config)notFound();
 const admin=await isAdminSession();
 const prepared=await prepareWidgetDashboard(config.sections.flatMap(section=>dashboardLeaves(section.root)).map(leaf=>({id:leaf.id,widgetId:leaf.widgetId,src:config.sources[leaf.id]})));
 const entries=curatedGalleryEntries({ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'});
 return <main style={{padding:24}}><WidgetDashboard {...prepared} sections={config.sections} initialAppearance={config.appearance} entries={entries} controls={admin} variants={admin} canSave={admin}/></main>;
}
