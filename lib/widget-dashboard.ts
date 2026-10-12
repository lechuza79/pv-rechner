import {parseWidgetAppearanceObject,widgetGridOptions,type WidgetAppearance,widgetCompositionItem,widgetVariantFromQuery} from './widget-appearance';
import {WIDGET_GRID_SIZES,gridExtent,type WidgetGridSize,type CompositionItem} from './widget-composition';
export type DashboardNode = {id:string;label:string;grow?:number} & (
 {widgetId:string;presentation?:'full'|'compact'|'hero';period?:string;appearance?:WidgetAppearance;gridSize?:WidgetGridSize} |
 {direction:'row'|'column'|'grid';columns?:number;children:DashboardNode[]}
);
export type DashboardSection = {id:string;title:string;description?:string;root:DashboardNode};
export function dashboardConstraint(node:DashboardNode):CompositionItem {
 return 'children' in node?{id:node.id,kind:'group',direction:node.direction,columns:node.columns,grow:node.grow,children:node.children.map(dashboardConstraint)}
 :widgetCompositionItem(node.widgetId,{id:node.id,presentation:node.presentation,grow:node.grow,...(node.gridSize?{preferredHeight:{fraction:1,max:gridExtent(WIDGET_GRID_SIZES[node.gridSize].rows)}}:{})});
}
export function dashboardLeaves(node:DashboardNode):Extract<DashboardNode,{widgetId:string}>[]{
 return 'children' in node?node.children.flatMap(dashboardLeaves):[node];
}

export type DashboardConfiguration = {version:1;sections:DashboardSection[];sources:Record<string,string>;appearance?:WidgetAppearance};
/** Validate structure before allocating or loading anything supplied by an embed URL. */
export function parseDashboardConfiguration(raw:string):DashboardConfiguration {
 if(raw.length>24000)throw new Error('Dashboard configuration too large');
 const input=JSON.parse(raw) as DashboardConfiguration;
 if(input?.version!==1||!Array.isArray(input.sections)||!input.sections.length||input.sections.length>12||!input.sources||typeof input.sources!=='object')throw new Error('Invalid dashboard');
 if(input.appearance)input.appearance=parseWidgetAppearanceObject(input.appearance);
 const ids=new Set<string>();let count=0;
 const visit=(node:DashboardNode,depth:number)=>{
  if(!node||depth>6||++count>80||typeof node.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(node.id)||ids.has(node.id)||typeof node.label!=='string'||node.label.length>180)throw new Error('Invalid dashboard item');
  ids.add(node.id);
  if(node.grow!==undefined&&(!Number.isFinite(node.grow)||node.grow<0||node.grow>12))throw new Error('Invalid growth weight');
  if('children' in node){
   if(!['row','column','grid'].includes(node.direction)||!Array.isArray(node.children)||!node.children.length||node.children.length>79)throw new Error('Invalid group');
   if(node.columns!==undefined&&(!Number.isInteger(node.columns)||node.columns<1||node.columns>12))throw new Error('Invalid columns');
   node.children.forEach(child=>visit(child,depth+1));
  }else{
   if(node.presentation!==undefined&&!['full','compact','hero'].includes(node.presentation))throw new Error('Invalid presentation');
   if(node.appearance)node.appearance=parseWidgetAppearanceObject(node.appearance);
   if(node.gridSize&&!widgetGridOptions(node.widgetId).some(option=>option.size===node.gridSize&&option.presentation===(node.presentation??'full')))throw new Error('Invalid grid format');
   dashboardConstraint(node);
   const source=input.sources[node.id];
   if(typeof source!=='string'||source.length>1500||!source.startsWith('/embed/'))throw new Error('Invalid widget source');
   const url=new URL(source,'https://solar-check.io');
   const expected=url.pathname===`/embed/${node.widgetId}`||url.pathname===`/embed/galerie/${node.widgetId}`||(node.widgetId==='regional-race'&&/^\/embed\/regional-race\/(\d{2}|\d{5})$/.test(url.pathname))||(node.widgetId==='erzeugung'&&url.pathname==='/embed/erzeugung-mini');
   if(widgetVariantFromQuery(node.widgetId,url.searchParams)!==(node.presentation??'full'))throw new Error('Mismatched widget presentation');
   if(url.origin!=='https://solar-check.io'||url.hash||!expected)throw new Error('Mismatched widget source');
  }
 };
 for(const section of input.sections){
  if(!section||typeof section.title!=='string'||section.title.length>180||typeof section.id!=='string'||(section.description!==undefined&&(typeof section.description!=='string'||section.description.length>1000)))throw new Error('Invalid section');
  visit(section.root,0);
 }
 return input;
}

export type DashboardWidgetSelection = {src:string;presentation:'full'|'compact'|'hero';appearance?:WidgetAppearance;gridSize?:WidgetGridSize};
/** Change exactly one instance; siblings and other uses of the same widget remain intact. */
export function applyDashboardSelection(config:DashboardConfiguration,id:string,selection:DashboardWidgetSelection):DashboardConfiguration {
 let found=false;
 const visit=(node:DashboardNode):DashboardNode=>{
  if('children' in node)return {...node,children:node.children.map(visit)};
  if(node.id!==id)return node;
  found=true;
  return {...node,presentation:selection.presentation,appearance:selection.appearance,gridSize:selection.gridSize};
 };
 const sections=config.sections.map(section=>({...section,root:visit(section.root)}));
 if(!found)throw new Error('Unknown dashboard instance');
 return parseDashboardConfiguration(JSON.stringify({...config,sections,sources:{...config.sources,[id]:selection.src}}));
}
