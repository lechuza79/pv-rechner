import type {WidgetBrand, WidgetHeaderMode, PartnerWidgetHeight} from './widget-brand';
import {allWidgets} from './widget-registry';
/** Shared presentation options; data and permissions remain separate. */
export type WidgetTheme = 'light' | 'dark' | 'hero';
export type WidgetSharing = 'on' | 'off' | 'secondary' | 'primary';
export type WidgetAppearance = {partner?: {brand: WidgetBrand; header: WidgetHeaderMode; widgetHeight?: PartnerWidgetHeight}; theme?: WidgetTheme; background?: boolean; sharing?: WidgetSharing; layout?: 'group'; autoplay?: boolean};
export function parseWidgetAppearance(query: {theme?: string; background?: string; sharing?: string; layout?: string; autoplay?: string}): WidgetAppearance {
  return {theme: ['light','dark','hero'].includes(query.theme ?? '') ? query.theme as WidgetTheme : undefined,
    ...(query.layout === 'group' ? {layout: 'group' as const} : {}),
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
