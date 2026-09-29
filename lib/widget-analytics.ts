import {WIDGETS} from './widget-registry';

export const WIDGET_ACTIONS=['visible','restart','interact','settings','options','copy_link','forward','image','image_end','video','embed','embed_contact','design_contact','video_contact','video_complete','video_error'] as const;
export type WidgetAction=typeof WIDGET_ACTIONS[number];
export const WIDGET_SCOPES=['municipality','district','state','country','embed','other'] as const;
export type WidgetScope=typeof WIDGET_SCOPES[number];
const ids=new Set(Object.values(WIDGETS).map(widget=>widget.id));

/** Page categories only: no identifiers, selected values or visitor attributes. */
export function widgetScope(path:string):WidgetScope {
  const parts=path.split('/').filter(Boolean);
  if(parts[0]==='embed')return 'embed';
  if(parts[0]!=='solar-atlas')return 'other';
  return parts.length>=4?'municipality':parts.length===3?'district':parts.length===2?'state':'country';
}
export function widgetEventName(id:string,scope:WidgetScope,action:WidgetAction):string|null {
  if(!ids.has(id)||!WIDGET_SCOPES.includes(scope)||!WIDGET_ACTIONS.includes(action))return null;
  return `widget_${id.replace(/-/g,'_')}_${scope}_${action}`;
}
