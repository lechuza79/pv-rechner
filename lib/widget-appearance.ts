import {WIDGET_GRID_SIZES,gridExtent,type WidgetGridSize} from './widget-composition';
import {allWidgets} from './widget-registry';
/** Shared presentation options; data and permissions remain separate. */
export type WidgetTheme = 'light' | 'dark' | 'hero';
export type WidgetSharing = 'on' | 'off' | 'secondary' | 'primary';
export type WidgetAppearance = {theme?: WidgetTheme; background?: boolean; sharing?: WidgetSharing; layout?: 'group' | 'allocated'; autoplay?: boolean};
export function parseWidgetAppearance(query: {theme?: string; background?: string; sharing?: string; layout?: string; autoplay?: string}): WidgetAppearance {
  return {theme: ['light','dark','hero'].includes(query.theme ?? '') ? query.theme as WidgetTheme : undefined,
    ...(query.layout === 'group' || query.layout === 'allocated' ? {layout: query.layout} : {}),
    ...(query.autoplay==='on'||query.autoplay==='off'?{autoplay:query.autoplay==='on'}:{}),
    sharing: ['on','off','secondary','primary'].includes(query.sharing ?? '') ? query.sharing as WidgetSharing : undefined,
    background: query.background === 'off' ? false : query.background === 'on' ? true : undefined};
}
/** Sanitize live appearance messages through the same URL-value parser. */
export function parseWidgetAppearanceObject(value:unknown):WidgetAppearance|undefined {
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const input=value as Record<string,unknown>;
 const text=(key:string)=>typeof input[key]==='string'?input[key] as string:undefined;
 const toggle=(key:string)=>input[key]===true?'on':input[key]===false?'off':undefined;
 return parseWidgetAppearance({theme:text('theme'),sharing:text('sharing'),layout:text('layout'),background:toggle('background'),autoplay:toggle('autoplay')});
}
export function widgetConfiguration(id:string) {return allWidgets().find(widget=>widget.id===id)?.configuration;}
export const configurableWidgets = allWidgets().filter(widget=>widget.configuration).map(widget=>widget.id);

/** Resolve host sharing settings once for every exportable widget. */
export function widgetActionPresentation(sharing: WidgetSharing | undefined, fallback: 'menu' | 'bar' | 'primary' = 'menu'): 'menu' | 'primary' | 'none' {
  if (sharing === 'off') return 'none';
  if (sharing === 'primary') return 'primary';
  if (sharing === 'on' || sharing === 'secondary') return 'menu';
  return fallback === 'bar' ? 'primary' : fallback;
}

/** Data identity remains stable when only presentation changes. */
export function widgetPreviewSource(src: string): string {
  const [path,query]=src.split('?');
  const params=new URLSearchParams(query);
  for(const key of ['theme','background','sharing','layout','autoplay'])params.delete(key);
  const remaining=params.toString();
  return path+(remaining?'?'+remaining:'');
}

export function widgetPresentationContract(id:string,variant:'full'|'compact'|'hero'='full') {
 const presentations=widgetConfiguration(id)?.presentations;
 return presentations?.[variant];
}

/** Onsite previews always use the onsite source policy, regardless of their host. */
export function onsiteWidgetPreviewSource(src:string,appearance?:WidgetAppearance):string {
 const url=new URL(src,'https://preview.local');
 url.searchParams.set('onsite','1');
 if(appearance?.theme)url.searchParams.set('theme',appearance.theme);
 if(appearance?.sharing)url.searchParams.set('sharing',appearance.sharing);
 if(appearance?.layout)url.searchParams.set('layout',appearance.layout);
 if(appearance?.background!==undefined)url.searchParams.set('background',appearance.background?'on':'off');
 if(appearance?.autoplay!==undefined)url.searchParams.set('autoplay',appearance.autoplay?'on':'off');
 return url.pathname+url.search;
}

/** Only expose slot/renderer combinations that satisfy the declared height contract. */
export function widgetGridOptions(id:string,compactAvailable=true) {
 const variants:readonly ('full'|'compact')[]=compactAvailable?['full','compact']:['full'];
 return variants.flatMap(presentation=>{
  const contract=widgetPresentationContract(id,presentation);
  if(!contract?.supportsAllocation||!contract.minAllocatedHeight)return [];
  return (contract.gridSizes??[]).filter(size=>gridExtent(WIDGET_GRID_SIZES[size].rows)>=contract.minAllocatedHeight!).map(size=>({size,presentation,contract}));
 });
}
export function selectWidgetGridOption(id:string,requested:WidgetGridSize,compactAvailable=true){
 const options=widgetGridOptions(id,compactAvailable);
 return options.find(option=>option.size===requested)??options.find(option=>option.presentation==='full')??options[0];
}
