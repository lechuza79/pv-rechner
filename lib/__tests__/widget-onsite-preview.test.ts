import {describe,it,expect} from 'vitest';
import {onsiteWidgetPreviewSource} from '../widget-appearance';
describe('Shared onsite previews',()=>{
 it.each(['/embed/pv-kostenrennen','/embed/galerie/gemeinde-ranking?ags=06440016','/embed/stromhandel?period=year'])('keeps the onsite source policy for %s',src=>{
  const url=new URL(onsiteWidgetPreviewSource(src,{theme:'dark',layout:'group',autoplay:false}),'https://example.test');
  expect(url.searchParams.get('onsite')).toBe('1');
  expect(url.searchParams.get('layout')).toBe('group');
  expect(url.searchParams.get('theme')).toBe('dark');
  const original=new URL(src,'https://example.test');
  for(const [key,value] of original.searchParams)expect(url.searchParams.get(key)).toBe(value);
 });
});
