import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {CategoryBarChart} from '../../components/charts/CategoryBarChart';
const rows=[{id:'fr',label:'Frankreich',value:42,flagSrc:'/flags/fr.svg',partial:true,partialLabel:'5 Stunden fehlen'}];
describe('CategoryBarChart opt-in presentation',()=>{
 it('uses supplied country assets without fabricating a silhouette',()=>{
  const html=renderToStaticMarkup(<CategoryBarChart rows={rows} unit="GWh" label="Länder" orientation="horizontal" country/>);
  expect(html).toContain('data-country="true"');expect(html).toContain('/flags/fr.svg');
  expect(html).not.toContain('sc-category-country-silhouette');expect(html).toContain('5 Stunden fehlen');
 });
 it('retains partial metadata when the fill is solid',()=>{
  const html=renderToStaticMarkup(<CategoryBarChart rows={rows} unit="GWh" label="Monate" partialStyle="solid"/>);
  expect(html).toContain('data-partial-style="solid"');expect(html).toContain('data-partial="true"');expect(html).toContain('5 Stunden fehlen');
 });
 it('keeps existing consumers on the default presentation',()=>{
  const html=renderToStaticMarkup(<CategoryBarChart rows={rows} unit="GWh" label="Monate"/>);
  expect(html).toContain('data-partial-style="hatched"');expect(html).not.toContain('/flags/fr.svg');
 });
});
