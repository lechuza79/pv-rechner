import {describe,it,expect} from 'vitest';
import {regionalMixGroups,annualMixCategory,hourlyMixCategory} from '../regional-mix-groups';
describe('regional mix drilldown',()=>{
 it('preserves annual amounts including offshore and mixed other generation',()=>{
  const values=[['solar',30],['wind',10],['offshore',5],['gas',20],['other',8]] as const;
  const groups=regionalMixGroups(values.map(([id,value])=>({label:id,value,category:annualMixCategory(id)})));
  expect(groups.map(g=>[g.label,g.value])).toEqual([['Erneuerbare',45],['Fossile',20],['Sonstige',8]]);
  expect(groups.flatMap(g=>g.children).reduce((s,c)=>s+c.value,0)).toBe(73);
 });
 it('keeps storage separate from fossil, renewable and nuclear hourly generation',()=>{
  expect(hourlyMixCategory({id:'Storage',renewable:false})).toBe('other');
  expect(hourlyMixCategory({id:'Other renewable',renewable:true})).toBe('renewable');
  expect(hourlyMixCategory({id:'Other fossil',renewable:false})).toBe('fossil');
  expect(hourlyMixCategory({id:'Nuclear',renewable:false})).toBe('nuclear');
 });
});
