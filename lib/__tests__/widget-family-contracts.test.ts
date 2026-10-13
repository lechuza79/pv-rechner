import {describe,it,expect} from 'vitest';
import {curatedGalleryEntries,GALLERY_HIDDEN} from '../widget-gallery';
import {allWidgets} from '../widget-registry';
import {widgetCompositionItem,widgetPresentationContract,widgetVariantFromQuery} from '../widget-appearance';
import {resolveComposition} from '../widget-composition';
const entries=curatedGalleryEntries({ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'});

describe('Shared dashboard contracts for the complete retained catalog',()=>{
 it('makes every active widget composable with explicit geometry and a real embed',()=>{
  expect(entries.length).toBeGreaterThan(0);
  expect(new Set(entries.map(entry=>entry.id)).size).toBe(entries.length);
  for(const entry of entries){
   const contract=widgetPresentationContract(entry.id)!;
   expect(contract,entry.id).toBeDefined();
   expect(contract.family,entry.id).toBeTruthy();
   expect(contract.minWidth,entry.id).toBeLessThanOrEqual(320);
   expect(entry.variants.length,entry.id).toBeGreaterThan(0);
   const allocation=resolveComposition(widgetCompositionItem(entry.id),320,800);
   if(contract.supportsAllocation)expect(allocation.height,entry.id).toBeGreaterThanOrEqual(contract.minAllocatedHeight!);
   else expect(allocation.height,entry.id).toBeUndefined();
  }
 });
 it('accounts for every registered entry without silently reviving retired widgets',()=>{
  for(const widget of allWidgets())expect(entries.some(e=>e.id===widget.id)||!!GALLERY_HIDDEN[widget.id]||widget.id==='rechner',widget.id).toBe(true);
 });
 it('keeps actual hero variants separate and ignores unregistered variants',()=>{
  for(const id of ['strommix-anteil','atomstrom-tage']){
   expect(widgetVariantFromQuery(id,new URLSearchParams('variant=teaser'))).toBe('hero');
   expect(widgetPresentationContract(id,'hero')?.supportsAllocation).not.toBe(true);
  }
  expect(widgetVariantFromQuery('regional-basic-stats',new URLSearchParams('presentation=compact'))).toBe('full');
 });
 it('applies narrow height requirements through the same helper used by all hosts',()=>{
  const item=widgetCompositionItem('pv-kostenrennen');
  expect(resolveComposition(item,320,500).height).toBe(640);
  expect(resolveComposition(item,800,500).height).toBe(560);
 });
 it('mixes a newly connected flexible chart with a complete content-sized group',()=>{
  const result=resolveComposition({id:'new-combination',kind:'group',direction:'row',children:[widgetCompositionItem('strommix'),widgetCompositionItem('regional-basic-stats')]},800,800);
  expect(result.direction).toBe('row');
  expect(result.height).toBeUndefined();
  expect(result.children?.[0].height).toBeGreaterThanOrEqual(640);
  expect(result.children?.[1].height).toBeUndefined();
 });
});
