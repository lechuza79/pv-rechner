import {describe,it,expect} from 'vitest';
import {strommixRadar} from '../strommix-radar';
import type {GenerationDataPoint} from '../energy';
describe('Strommix radar',()=>{
 it('preserves the complete denominator and stable axes across changing values',()=>{
  const rows=strommixRadar([{ts:'2026-10-12T09:45:00Z',solar:40,wind_onshore:10,wind_offshore:10,fossil_hard_coal:5,fossil_brown_coal_lignite:5,fossil_gas:10,hydro_pumped_storage:10,waste:5,others:5} as GenerationDataPoint]);
  expect(rows.some(r=>r.id==='storage')).toBe(false);
  expect(rows.reduce((s,r)=>s+r.value,0)).toBeCloseTo(100);
  expect(rows.find(r=>r.id==='wind')?.value).toBeCloseTo(20/90*100);
  expect(rows.find(r=>r.id==='coal')?.value).toBeCloseTo(10/90*100);
  expect(rows.find(r=>r.id==='other')?.value).toBeCloseTo(10/90*100);
  expect(strommixRadar([{ts:'2026-10-12T09:45:00Z',solar:1} as GenerationDataPoint]).map(r=>r.id)).toEqual(rows.map(r=>r.id));
 });
 it('does not present missing data as zero generation',()=>expect(strommixRadar([])).toEqual([]));
});
