import {expect,it} from 'vitest';
import {widgetShareUrl} from '../widget-share-url';
it('reconstructs the selected place and destination independently of a dashboard preset',()=>{
 const url=widgetShareUrl('https://solar-check.io/widget-galerie/layout-referenz','stage',{ags:'06440016',stop:'nidda-sewage'},'/embed/kommunen-landschaft',{ags:'03458009',theme:'light'});
 expect(url.pathname).toBe('/embed/kommunen-landschaft');
 expect(url.searchParams.get('ags')).toBe('06440016');
 expect(url.searchParams.get('stop')).toBe('nidda-sewage');
 expect(url.searchParams.get('theme')).toBe('light');
 expect(url.searchParams.has('chart')).toBe(false);
});
it('preserves existing page detail links without a portable selection',()=>{
 const url=widgetShareUrl('https://solar-check.io/solar-atlas#sources','existing-chart');
 expect(url.pathname).toBe('/solar-atlas');
 expect(url.searchParams.get('chart')).toBe('existing-chart');
 expect(url.hash).toBe('');
});
it('keeps the exact story snapshot when sharing a dashboard story widget',()=>{
 const url=widgetShareUrl('https://solar-check.io/widget-galerie/storyview','story-value',{
  ags:'06440016',view:'single',template:'electricity-value',story:'06440016-electricity-value-2026-09',
 },'/embed/gemeinde-meldung',{ags:'06440016',view:'single',template:'electricity-value'});
 expect(url.pathname).toBe('/embed/gemeinde-meldung');
 expect(url.searchParams.get('story')).toBe('06440016-electricity-value-2026-09');
 expect(url.searchParams.get('template')).toBe('electricity-value');
 expect(url.searchParams.has('chart')).toBe(false);
});
