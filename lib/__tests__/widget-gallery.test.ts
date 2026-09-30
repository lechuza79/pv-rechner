import {describe,it,expect} from 'vitest';
import {galleryEntries,type GalleryPlace} from '../widget-gallery';
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
    const national=(p:GalleryPlace)=>galleryEntries(p).filter(w=>w.group!=='regional');
    expect(national(place)).toEqual(national(other));
    expect(galleryEntries(place).find(w=>w.id==='gruengas-heizkosten')?.variants).toHaveLength(3);
    expect(galleryEntries(place).every(w=>w.variants.length>0)).toBe(true);
  });
});
