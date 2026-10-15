import {describe,it,expect} from 'vitest';
import {widgetGridOptions,widgetPresentationContract} from '../widget-appearance';
import {curatedGalleryEntries} from '../widget-gallery';
import {WIDGET_GRID_SIZES,gridExtent} from '../widget-composition';
import {embedCode} from '../embed-code';
describe('Reference widget contracts',()=>{
 it('offers a compact annual-growth embed without changing existing full grid slots',()=>{
  const full=widgetPresentationContract('regional-annual-growth')!;
  const compact=widgetPresentationContract('regional-annual-growth','compact')!;
  expect(full.minAllocatedHeight).toBe(640);
  expect(full.gridSizes).toEqual(['list','stage']);
  expect(compact.minAllocatedHeight).toBe(400);
  expect(compact.params).toEqual({presentation:'compact'});
  expect(compact.gridSizes).toBeUndefined();
 });
 it('declares real variants with ordered width requirements and uncropped content height',()=>{
  for(const id of ['pv-kostenrennen','gemeinde-ranking','stromhandel','welt-zubaurennen','regional-current-power']){
   const full=widgetPresentationContract(id)!;
   expect(full.minWidth).toBeLessThanOrEqual(full.preferredWidth);
   expect(full.preferredWidth).toBeLessThanOrEqual(full.maxWidth);
   expect(full.height).toBe('content');
   expect(full.includes.length).toBeGreaterThan(0);
  }
  expect(widgetPresentationContract('pv-kostenrennen','compact')).toBeUndefined();
  expect(widgetPresentationContract('stromhandel','compact')?.omits).toContain('Controls');
 });
 it('does not change data selectors or offer a compact totals chart',()=>{
  const entry=curatedGalleryEntries({ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetterau',stateId:'06',stateName:'Hessen'}).find(e=>e.id==='stromhandel')!;
  for(const variant of entry.variants){
   const source=new URL(variant.src,'https://example.test');
   if(source.searchParams.get('variant')==='totals'){expect(variant.compactSrc).toBeUndefined();continue;}
   const compact=new URL(variant.compactSrc!,'https://example.test');
   for(const [key,value] of source.searchParams)expect(compact.searchParams.get(key)).toBe(value);
   expect(compact.searchParams.get('presentation')).toBe('compact');
  }
 });
 it('keeps grid slots distinct from independent hero/story previews',()=>{
  const full=widgetPresentationContract('stromhandel','full')!;
  const compact=widgetPresentationContract('stromhandel','compact')!;
  const hero=widgetPresentationContract('stromhandel','hero')!;
  expect(hero.gridSizes).toBeUndefined();
  expect(hero.supportsAllocation).not.toBe(true);
  expect(hero.params.presentation).toBe('hero');
  const sizes=[...(full.gridSizes??[]),...(compact.gridSizes??[])];
  expect(new Set(sizes)).toEqual(new Set(['small','medium']));
  for(const contract of [full,compact])for(const size of contract.gridSizes??[]){
   expect(gridExtent(WIDGET_GRID_SIZES[size].rows)).toBeGreaterThanOrEqual(contract.minAllocatedHeight!);
  }
 });
 it('provides a usable full-width landscape slot without changing existing stage formats',()=>{
  const options=widgetGridOptions('kommunen-landschaft');
  expect(options).toHaveLength(1);
  const slot=WIDGET_GRID_SIZES[options[0].size];
  expect(slot.columns).toBe(12);
  expect(gridExtent(slot.rows)).toBeGreaterThanOrEqual(options[0].contract.minAllocatedHeight!);
  expect(gridExtent(WIDGET_GRID_SIZES.stage.rows)).toBe(624);
 });
 it('offers auto height while retaining an explicit iframe-only alternative',()=>{
  const options={src:'/embed/test',width:720,height:500,titel:'Test',siteUrl:'https://example.test',attribution:{path:'/test',text:'Source'}};
  expect(embedCode(options)).toContain('data-solar-check-resize');
  expect(embedCode(options)).toContain('/widgets/resize.js');
  expect(embedCode({...options,resize:'fixed'})).not.toContain('<script');
  expect(embedCode({...options,resize:'fixed'})).toContain('height="500"');
 });
});
