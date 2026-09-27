import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ApprovedStoryVisual,compactStoryNumber} from '../../components/social/ApprovedStoryVisual';
import type {PostBild} from '../social-posts';

describe('Atlas story formats',()=>{
 it('abbreviates display values without decimals',()=>{
  expect(compactStoryNumber(98679.05)).toBe('99 k');
  expect(compactStoryNumber(1673.94)).toBe('2 k');
  expect(compactStoryNumber(2345678)).toBe('2 M');
 });
 it('keeps both periods and the correct signed delta in detail and preview',()=>{
  for(const current of [261,150]){
   const bild:PostBild={art:'saeule',stil:'hell',aussage:'Zubau',gemessen:'Januar bis Mai',quelle:'Register',serien:[{label:'2026',wert:current,einheit:'Anlagen'},{label:'2025',wert:203,einheit:'Anlagen'}]};
   const markup=renderToStaticMarkup(<ApprovedStoryVisual bild={bild}/>);
   expect(markup).toContain('2025');
   expect(markup).toContain('2026');
   expect(markup).toContain(current>203?'+29':'−26');
   expect(markup).not.toContain('>Anlagen<');
   const teaser=renderToStaticMarkup(<ApprovedStoryVisual bild={bild} compact/>);
   expect(teaser).not.toContain('<header');
   expect(teaser).toContain('2025');
   expect(teaser).toContain(String(current));
  }
 });
});
