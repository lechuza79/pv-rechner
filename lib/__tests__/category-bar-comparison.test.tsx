import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {CategoryBarChart} from '../../components/charts/CategoryBarChart';

describe('paired cost comparison',()=>{
 const render=(base:number,current:number)=>renderToStaticMarkup(<CategoryBarChart orientation="horizontal" paired unit="€" label="Kostenvergleich" rows={[{id:'base',label:'Bisher',value:base},{id:'current',label:'Neu',value:current}]}/>);
 it('shows the difference relative to the reference cost',()=>{
  const html=render(1000,600);
  expect(html.replace(/<[^>]*>/g,'')).toContain('400€Ersparnis · 40 %');
  expect(html).toContain('left:60%;width:40%');
 });
 it('labels higher costs without describing them as savings',()=>{
  const html=render(1000,1200);
  expect(html.replace(/<[^>]*>/g,'')).toContain('200€Mehrkosten · 20 %');
  expect(html).toContain('Mehrkosten');
  expect(html).toContain('sc-category-pair-saving is-negative');
 });
 it('omits undefined percentage for a zero-cost reference',()=>{
  const html=render(0,100);
  expect(html).not.toContain('NaN');
  expect(html).not.toContain('Infinity');
  expect(html.replace(/<[^>]*>/g,'')).toContain('100€');
 });
});
