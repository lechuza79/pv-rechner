import {describe,it,expect} from 'vitest';
import {galleryEntries,curatedGalleryEntries,GALLERY_HIDDEN,GALLERY_CATEGORIES,type GalleryPlace} from '../widget-gallery';
const place:GalleryPlace={ags:'09679147',name:'Höchberg',districtId:'09679',districtName:'Würzburg',stateId:'09',stateName:'Bayern'};
describe('shared gallery place',()=>{
  it('uses one selected municipality and its actual ancestors across old and new widgets',()=>{
    const entries=galleryEntries(place);
    const get=(id:string)=>entries.find(w=>w.id===id)!;
    expect(get('gemeinde-solar-monat').variants[0].src).toContain('ags=09679147');
    expect(get('gemeinde-solar').variants[0].src).toContain('ags=09679147');
    expect(get('regional-race').variants[0].src).toBe('/embed/regional-race/09679');
    expect(get('regional-race').placeLabel).toBe('Würzburg');
    expect(get('region-anlagentyp').variants[0].src).toContain('bl=09');
    expect(get('region-anlagentyp').placeLabel).toBe('Bayern');
  });
  it('keeps national widgets and their variants independent of the selected place',()=>{
    const other={...place,ags:'06440016',name:'Nidda',districtId:'06440',stateId:'06'};
    const national=(p:GalleryPlace)=>galleryEntries(p).filter(w=>w.group==='energy'||w.group==='cost');
    expect(national(place)).toEqual(national(other));
    expect(galleryEntries(place).find(w=>w.id==='gruengas-heizkosten')?.variants).toHaveLength(3);
    expect(galleryEntries(place).every(w=>w.variants.length>0)).toBe(true);
  });
});

describe('gallery curation',()=>{
  it('hides legacy candidates only from the gallery, preserving their renderers',()=>{
    const full=galleryEntries(place);
    const visible=curatedGalleryEntries(place);
    for(const id of Object.keys(GALLERY_HIDDEN)) {
      expect(full.some(entry=>entry.id===id)).toBe(true);
      expect(visible.some(entry=>entry.id===id)).toBe(false);
    }
    expect(visible.filter(entry=>entry.group!=='microcharts').every(entry=>GALLERY_CATEGORIES.some(category=>category.id===entry.group))).toBe(true);
    expect(visible.filter(entry=>entry.group==='comparison').map(entry=>entry.id)).toEqual(['regional-map','gemeinde-ranking','regional-race']);
  });
});


describe('compact parent chart variants',()=>{
  it('offers compact renderers on parents without a duplicate hero entry',()=>{
    const entries=curatedGalleryEntries(place);
    expect(entries.some(entry=>entry.id==='atomstrom-anteil-hero')).toBe(false);
    for(const id of ['strommix-anteil','atomstrom-tage','stromhandel']){
      const variant=entries.find(entry=>entry.id===id)!.variants[0];
      expect(variant.heroSrc).toBeTruthy();
      const full=new URL(variant.src,'https://example.test');
      const compact=new URL(variant.heroSrc!,'https://example.test');
      expect(compact.pathname).toBe(full.pathname);
      expect(compact.searchParams.get('metric')).toBe(full.searchParams.get('metric'));
    }
    expect(entries.find(entry=>entry.id==='regional-map')!.variants[0].compactSrc).toBeUndefined();
  });
});
