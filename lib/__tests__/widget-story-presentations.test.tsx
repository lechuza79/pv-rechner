import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {galleryEntries} from '../widget-gallery';
import {widgetPresentationSource,widgetVariantFromQuery} from '../widget-appearance';
import {parseDashboardConfiguration} from '../widget-dashboard';
import {MunicipalWidgetVisual} from '../../components/dashboard/MunicipalWidgetVisual';
import {MunicipalChart} from '../../components/social/MunicipalChart';
import {STORY_CONCEPTS} from '../story-konzepte';
const place={ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'};
const query=(src:string)=>new URL(src,'https://solar-check.io').searchParams;
describe('shared story representations',()=>{
 it('offers reduced previews for individual templates, not the complete reader',()=>{
  const entry=galleryEntries(place).find(entry=>entry.id==='gemeinde-meldung')!;
  expect(entry.variants[0].heroSrc).toBeUndefined();
  for(const variant of entry.variants.slice(1)){
   expect(variant.heroSrc).toBeTruthy();
   const hero=query(variant.heroSrc!);
   expect(hero.get('template')).toBe(query(variant.src).get('template'));
   expect(hero.get('ags')).toBe(place.ags);
   expect(hero.get('detail')).toBe('reduced');
   expect(hero.get('switchable')).toBe('0');
   expect(widgetVariantFromQuery(entry.id,hero)).toBe('hero');
  }
 });
 it('keeps the exact story, place and period through preview and full round-trips',()=>{
  const original='/embed/gemeinde-meldung?ags=06440016&view=single&template=zubau&story=original-snapshot&period=2026-09&theme=dark';
  const preview=widgetPresentationSource('gemeinde-meldung',original,'hero');
  const restored=widgetPresentationSource('gemeinde-meldung',preview,'full');
  expect(query(restored)).toEqual(query(original));
  expect(query(preview).get('story')).toBe('original-snapshot');
  expect(()=>parseDashboardConfiguration(JSON.stringify({version:1,sources:{story:preview},sections:[{id:'stories',title:'Stories',root:{id:'story',label:'Story',widgetId:'gemeinde-meldung',presentation:'hero'}}]}))).not.toThrow();
  expect(()=>widgetPresentationSource('gemeinde-meldung','/embed/gemeinde-meldung?ags=06440016','hero')).toThrow();
 });
 it('leaves existing sources unchanged when their presentation is unchanged',()=>{
  const source='/embed/stromhandel?presentation=compact&period=seven&theme=dark';
  expect(widgetPresentationSource('stromhandel',source,'compact')).toBe(source);
  const hero=widgetPresentationSource('stromhandel',source,'hero');
  expect(query(hero).get('period')).toBe('seven');
  expect(Object.fromEntries(query(widgetPresentationSource('stromhandel',hero,'compact')))).toEqual(Object.fromEntries(query(source)));
 });
 it('preserves every catalog source through registered hero switches',()=>{
  for(const entry of galleryEntries(place)){
   for(const variant of entry.variants){
    if(!variant.heroSrc)continue;
    const hero=widgetPresentationSource(entry.id,variant.src,'hero');
    expect(Object.fromEntries(query(hero))).toEqual(Object.fromEntries(query(variant.heroSrc)));
    const originalPresentation=widgetVariantFromQuery(entry.id,query(variant.src));
    const restored=widgetPresentationSource(entry.id,hero,originalPresentation);
    expect(new URL(restored,'https://solar-check.io').pathname).toBe(new URL(variant.src,'https://solar-check.io').pathname);
   }
  }
 });
 it('keeps legacy full and reduced visuals identical to the shared body',()=>{
  for(const story of STORY_CONCEPTS){
   for(const compact of [false,true]){
    expect(renderToStaticMarkup(<MunicipalChart story={story} compact={compact} ohneBedienung/>)).toBe(renderToStaticMarkup(<MunicipalWidgetVisual story={story} view={{detail:compact?'reduced':'full',controls:false,autoplay:false}}/>));
   }
  }
 });
});
