import {describe,it,expect} from 'vitest';
import {strommixGroups,jetztAusReihe} from '../strommix-now';
import type {GenerationDataPoint} from '../energy';
describe('Strommix category drilldown',()=>{
 it('preserves all positive generation and keeps pumped storage out of renewables',()=>{
  const points=[{ts:'2026-10-11T12:00:00Z',solar:10,wind_onshore:20,wind_offshore:5,fossil_gas:15,hydro_pumped_storage:8,waste:2,nuclear:3}] as GenerationDataPoint[];
  const groups=strommixGroups(points);
  expect(groups.map(g=>[g.label,g.value])).toEqual([['Erneuerbare',35],['Fossile',15],['Sonstige',10],['Kernenergie',3]]);
  expect(groups.reduce((sum,g)=>sum+g.value,0)).toBe(jetztAusReihe(points)!.totalMw);
  for(const group of groups)expect(group.children.reduce((sum,c)=>sum+c.value,0)).toBe(group.value);
 });
 it('omits absent categories and never invents production',()=>{
  expect(strommixGroups([])).toEqual([]);
  expect(strommixGroups([{ts:'2026-10-11',solar:-5,fossil_gas:4}] as GenerationDataPoint[]).map(g=>g.label)).toEqual(['Fossile']);
 });
});
