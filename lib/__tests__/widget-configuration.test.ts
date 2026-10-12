import {describe,it,expect} from 'vitest';
import {allWidgets} from '../widget-registry';
import {parseWidgetAppearance,widgetConfiguration,widgetActionPresentation,widgetPreviewSource} from '../widget-appearance';
import {curatedGalleryEntries,GALLERY_HIDDEN} from '../widget-gallery';
const place={ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'};
describe('Widget configuration contracts',()=>{
 it('keeps new widgets discoverable and leaves older widgets available',()=>{
  const entries=curatedGalleryEntries(place);
  for(const widget of allWidgets().filter(w=>w.configuration&&!GALLERY_HIDDEN[w.id]))expect(entries.some(e=>e.id===widget.id&&e.variants.length>0),widget.id).toBe(true);
  expect(entries.some(e=>e.id==='strommix')).toBe(true);
  expect(entries.filter(e=>e.group==='microcharts').map(e=>e.id).sort()).toEqual(['micro-solar','micro-wind']);
 });
 it('shows district municipalities without selecting a representative municipality',()=>{
  const district={...place,ags:'06440',name:'Wetteraukreis'};
  const map=curatedGalleryEntries(district).find(entry=>entry.id==='regional-map')!;
  const query=new URL(map.variants[0].src,'https://example.test').searchParams;
  expect(query.get('ags')).toBe('06440');
  expect(query.has('selected')).toBe(false);
  const townMap=curatedGalleryEntries(place).find(entry=>entry.id==='regional-map')!;
  expect(new URL(townMap.variants[0].src,'https://example.test').searchParams.get('selected')).toBe('06440016');
 });
 it('does not expose image toggles or sharing for unsupported charts',()=>{
  expect(widgetConfiguration('regional-map')).toMatchObject({background:false,sharing:true});
  expect(widgetConfiguration('micro-wind')).toMatchObject({background:false,sharing:false});
  expect(widgetConfiguration('gemeinde-solar-monat')).toMatchObject({background:true,sharing:true});
  for(const id of ['strommix','strommix-anteil','zubau-erneuerbare-atom'])expect(widgetConfiguration(id)).toMatchObject({background:false,sharing:true});
 });
 it('uses one action presentation for host settings and legacy callers',()=>{
  expect(widgetActionPresentation('primary')).toBe('primary');
  expect(widgetActionPresentation('secondary','bar')).toBe('menu');
  expect(widgetActionPresentation('on','primary')).toBe('menu');
  expect(widgetActionPresentation('off','primary')).toBe('none');
  expect(widgetActionPresentation(undefined,'bar')).toBe('primary');
  expect(widgetActionPresentation(undefined,'menu')).toBe('menu');
 });
 it('keeps preview identity stable for appearance while preserving data selectors',()=>{
  expect(widgetPreviewSource('/embed/regional-map?ags=06440&selected=06440016&theme=dark&background=on&sharing=primary&layout=group')).toBe('/embed/regional-map?ags=06440&selected=06440016');
  expect(widgetPreviewSource('/embed/regional-map?ags=06440&selected=06440016&theme=light&sharing=off')).toBe('/embed/regional-map?ags=06440&selected=06440016');
  expect(widgetPreviewSource('/embed/micro-solar')).toBe('/embed/micro-solar');
 });
 it('accepts supported appearance choices without allowing arbitrary presentation values',()=>{
  expect(parseWidgetAppearance({theme:'hero',sharing:'primary',background:'off',layout:'group'})).toEqual({theme:'hero',sharing:'primary',background:false,layout:'group'});
  expect(parseWidgetAppearance({theme:'invalid',sharing:'invalid',background:'invalid',layout:'invalid'})).toEqual({theme:undefined,sharing:undefined,background:undefined});
 });
});
