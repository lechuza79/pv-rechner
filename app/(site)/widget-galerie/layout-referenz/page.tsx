import {isAdminSession} from '../../../../lib/admin-guard';
import {curatedGalleryEntries} from '../../../../lib/widget-gallery';
import {prepareWidgetDashboard} from '../../../../components/dashboard/WidgetDashboard.server';
import {layoutExamples,type ExampleNode} from './examples';
import LayoutReference from './reference';
export const metadata={title:'Widget-Layoutreferenz',robots:{index:false,follow:false}};
export default async function Page(){
 const place={ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'};
 const entries=curatedGalleryEntries(place);
 const leaves=(nodes:ExampleNode[]):ExampleNode[]=>nodes.flatMap(node=>node.children?leaves(node.children):[node]);
 const items=layoutExamples.flatMap(example=>leaves([...example.nodes,...(example.contentNodes??[])]).map(node=>{
  const variant=entries.find(entry=>entry.id===node.widgetId)!.variants[0];
  const url=new URL(node.compact?variant.compactSrc!:variant.src,'https://solar-check.io');
  for(const [key,value] of Object.entries(node.params??{}))url.searchParams.set(key,value);
  if(node.period)url.searchParams.set('period',node.period);
  return {id:node.area,widgetId:node.widgetId!,src:url.pathname+url.search};
 }));
 const prepared=await prepareWidgetDashboard(items);
 return <LayoutReference canSave={await isAdminSession()} entries={entries} {...prepared}/>;
}
