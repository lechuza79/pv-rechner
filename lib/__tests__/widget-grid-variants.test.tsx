import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import WidgetPreviewCard from '../../components/dashboard/WidgetPreviewCard';
import {widgetGridOptions,selectWidgetGridOption} from '../widget-appearance';
import {gridExtent,WIDGET_GRID_SIZES} from '../widget-composition';
import {curatedGalleryEntries} from '../widget-gallery';
const place={ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetterau',stateId:'06',stateName:'Hessen'};
describe('Grid and teaser controls',()=>{
 it('validates every registered gallery slot and keeps unsupported charts content-sized',()=>{
  const entries=curatedGalleryEntries(place);
  for(const entry of entries){
   const options=widgetGridOptions(entry.id,!!entry.variants[0]?.compactSrc);
   for(const option of options){
    expect(option.contract.supportsAllocation,entry.id).toBe(true);
    expect(gridExtent(WIDGET_GRID_SIZES[option.size].rows),entry.id).toBeGreaterThanOrEqual(option.contract.minAllocatedHeight!);
   }
   expect(new Set(options.map(option=>option.size)).size,entry.id).toBe(options.length);
  }
  expect(widgetGridOptions('regional-basic-stats')).toEqual([]);
  expect(widgetGridOptions('stromhandel').map(option=>option.size).sort()).toEqual(['medium','small']);
  expect(selectWidgetGridOption('gemeinde-ranking','medium')?.size).toBe('portrait');
 });
 it('keeps both existing atom previews independent of grid allocation',()=>{
  const entries=curatedGalleryEntries(place);
  for(const id of ['strommix-anteil','atomstrom-tage']){
   const variant=entries.find(entry=>entry.id===id)!.variants[0];
   expect(new URL(variant.heroSrc!,'https://test.local').searchParams.get('variant')).toBe('teaser');
   expect(variant.compactSrc).toBeUndefined();
  }
  const totals=entries.find(entry=>entry.id==='stromhandel')!.variants.find(variant=>variant.label==='Gesamtsummen')!;
  expect(totals.supportsGrid).toBe(false);
  expect(totals.heroSrc).toBeUndefined();
 });
 it('offers independent hero and grid size controls only for migrated charts',()=>{
  const entries=curatedGalleryEntries(place);
  const trade=renderToStaticMarkup(<WidgetPreviewCard entry={entries.find(e=>e.id==='stromhandel')!}/>);
  expect(trade).toContain('Hero-/Story-Vorschau');
  expect(trade).toContain('Gridgröße');
  expect(trade).toContain('Mittel');
  const ranking=renderToStaticMarkup(<WidgetPreviewCard entry={entries.find(e=>e.id==='gemeinde-ranking')!}/>);
  expect(ranking).toContain('Gridgröße');
  expect(ranking).toContain('>Hoch</option>');
  expect(ranking).not.toContain('Hero-/Story-Vorschau');
  const atom=renderToStaticMarkup(<WidgetPreviewCard entry={entries.find(e=>e.id==='atomstrom-tage')!}/>);
  expect(atom).toContain('Hero-/Story-Vorschau');
  expect(atom).not.toContain('Gridgröße');
 });
});
