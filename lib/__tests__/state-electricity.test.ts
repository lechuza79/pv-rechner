import {describe,it,expect} from 'vitest';
import {parseStateElectricity} from '../state-electricity';
import fixture from './fixtures/state-electricity-2026.json';
const now=new Date('2026-10-11T12:00:00Z');
describe('Regional generation annual source',()=>{
 it('keeps all sixteen states, TWh, the real cutoff and excludes national duplicate rows',()=>{
  const data=parseStateElectricity(fixture,2026,now);
  expect(data.states).toHaveLength(16);expect(data.partial).toBe(true);
  expect(data.dataUntil).toBe('2026-10-05T21:00:00.000Z');
  const berlin=data.states.find(state=>state.id==='11')!;
  expect(berlin.totalTwh).toBeCloseTo(.168+1.002+.007+3.237+.018+.441,9);
  expect(berlin.segments.find(s=>s.id==='solar')!.value).toBe(.441);
  expect(data.offshore).toEqual([{id:'offshore-nordsee',name:'Nordsee',value:16.593},{id:'offshore-ostsee',name:'Ostsee',value:4.181}]);
  expect(data.offshoreTwh).toBeCloseTo(data.offshore.reduce((sum,sea)=>sum+sea.value,0),10);
  expect(data.states.some(state=>state.segments.some(segment=>segment.id==='offshore'))).toBe(false);
  for(const state of data.states)expect(state.segments.reduce((sum,s)=>sum+s.value,0)).toBeCloseTo(state.totalTwh,10);
 });
 it('rejects missing states, null values and changed source units',()=>{
  expect(()=>parseStateElectricity(fixture.filter(row=>!row.id.endsWith('_be')),2026,now)).toThrow('Incomplete state');
  const missing=structuredClone(fixture) as any[];missing.find(row=>row.id==='solar_by').data=[null];
  expect(()=>parseStateElectricity(missing,2026,now)).toThrow('Invalid');
  const units=structuredClone(fixture);units[0].y0AxisLabel![0].en='Energy (GWh)';
  expect(()=>parseStateElectricity(units,2026,now)).toThrow('units or year');
 });
 it('requires a cutoff for an unfinished year and rejects unknown fuels',()=>{
  const missing=structuredClone(fixture);delete missing[0].lastData;
  expect(()=>parseStateElectricity(missing,2026,now)).toThrow('cutoff');
  const added=[...fixture,{id:'new_type_by',linkedTo:'new_type',data:[1]}];
  expect(()=>parseStateElectricity(added,2026,now)).toThrow('Unknown production type');
 });
 it('does not label a historical year as current',()=>{
  const historical=structuredClone(fixture);historical[0].xAxisValues=[2025];delete historical[0].lastData;
  const data=parseStateElectricity(historical,2025,now);
  expect(data.partial).toBe(false);expect(data.dataUntil).toContain('2025-12-31');
 });
});
