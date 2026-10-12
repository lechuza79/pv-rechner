import {describe, expect, it} from 'vitest';
import {widgetInventory} from '../widget-inventory';
import {curatedGalleryEntries} from '../widget-gallery';
import {widgetPresentationContract} from '../widget-appearance';
const place = {ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'};
describe('derived completion inventory', () => {
  it('covers every existing gallery source and declares its actual presentation', () => {
    const entries = curatedGalleryEntries(place), items = widgetInventory(entries);
    expect(new Set(items.map(item => item.widgetId)).size).toBe(entries.length);
    expect(new Set(items.map(item => item.id)).size).toBe(items.length);
    for (const entry of entries) for (const variant of entry.variants) {
      for (const src of [variant.src, variant.compactSrc, variant.heroSrc].filter(Boolean))
        expect(items.some(item => item.widgetId === entry.id && item.src === src), String(src)).toBe(true);
    }
    for (const item of items) expect(widgetPresentationContract(item.widgetId, item.presentation), item.src).toBeDefined();
    const storyPreviews=items.filter(item=>item.widgetId==='gemeinde-meldung'&&item.presentation==='hero');
    expect(storyPreviews.length).toBeGreaterThan(0);
    expect(storyPreviews.every(item=>item.detail==='reduced'&&!item.controls)).toBe(true);
  });
  it('deduplicates equivalent query orders within one widget, retaining data selections', () => {
    const base = curatedGalleryEntries(place)[0];
    expect(widgetInventory([{...base, variants: [
      {label:'A',src:'/embed/regional-map?ags=06&source=page',height:500},
      {label:'Same',src:'/embed/regional-map?source=page&ags=06',height:500},
      {label:'B',src:'/embed/regional-map?ags=07&source=page',height:500},
    ]}])).toHaveLength(2);
  });
});
