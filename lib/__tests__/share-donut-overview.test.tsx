import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ShareDonut} from '../../components/charts/ShareDonut';
const values=[{label:'Solar',value:30},{label:'Wind',value:40},{label:'Wasser',value:20},{label:'Andere',value:10}];
const formatValue=(value:number)=>({value:String(value),unit:'%'});
describe('ShareDonut overview',()=>{
 it('shows an explicit total rather than summed percentages and ignores a preset selection',()=>{
  const html=renderToStaticMarkup(<ShareDonut values={values} formatValue={formatValue} defaultIndex={1} overview palette="accent-monochrome" totalCenter={{value:'412,5',unit:'TWh',label:'Stromerzeugung'}} legendColumns={4}/>);
  expect(html).toContain('412,5');expect(html).toContain('TWh');expect(html).toContain('Stromerzeugung');
  expect(html).not.toContain('aria-pressed="true"');expect(html).not.toContain('stroke-width="36"');
  expect(html).toContain('var(--widget-accent) 100%');expect(html).toContain('var(--widget-accent) 35%');
  expect(html).toContain('data-columns="4"');
 });
 it('preserves the existing preset and legend defaults',()=>{
  const html=renderToStaticMarkup(<ShareDonut values={values} formatValue={formatValue} defaultIndex={1}/>);
  expect(html).toContain('aria-pressed="true"');expect(html).toContain('stroke-width="36"');
  expect(html).not.toContain('data-columns');expect(html).not.toContain('data-overview');
 });
});
