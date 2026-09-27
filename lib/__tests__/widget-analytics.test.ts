import {expect,it} from 'vitest';
import {WIDGETS} from '../widget-registry';
import {widgetEventName,widgetScope,type WidgetScope,type WidgetAction} from '../widget-analytics';
it('separates all geographic levels and external embeds',()=>{
 expect(['/solar-atlas','/solar-atlas/bayern','/solar-atlas/bayern/kreis','/solar-atlas/bayern/kreis/ort','/embed/gemeinde/123/monitor'].map(widgetScope)).toEqual(['country','state','district','municipality','embed']);
});
it('accepts catalog actions but rejects visitor values and unknown categories',()=>{
 const id=Object.values(WIDGETS)[0].id;
 expect(widgetEventName(id,'district','video')).toBe(`widget_${id.replace(/-/g,'_')}_district_video`);
 expect(widgetEventName('someone@example.com','district','video')).toBeNull();
 expect(widgetEventName(id,'visitor-name' as WidgetScope,'video')).toBeNull();
 expect(widgetEventName(id,'district','123kw' as WidgetAction)).toBeNull();
});
