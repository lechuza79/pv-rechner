import {describe,it,expect} from 'vitest';
import {parseRegionalHourly,CO2_REGIONS} from '../co2map';
import fixture from './fixtures/co2map-regions.json';
const now=new Date('2026-10-11T18:00:00Z');
describe('CO2Map regional generation',()=>{
 it('keeps 13 provider regions, with city states counted once',()=>{
  const result=parseRegionalHourly(fixture,now);expect(result.hours.at(-1)?.regions).toHaveLength(13);
  expect(CO2_REGIONS.flatMap(r=>[...r[2]]).sort()).toEqual(Array.from({length:16},(_,i)=>String(i+1).padStart(2,'0')));
  const bw=result.hours.at(-1)!.regions.find(r=>r.id==='BW')!;
  expect(bw.carriers.find(c=>c.id==='Solar')?.mw).toBe(1752);
  expect(bw.carriers.some(c=>c.id.startsWith('Consumption'))).toBe(false);
  expect(bw.carriers.find(c=>c.id==='Storage')?.mw).toBeNull();
  expect(result.hours.at(-1)!.regions.find(r=>r.id==='NI')!.carriers.find(c=>c.id==='Wind Offshore')?.mw).toBe(848);
 });
 it('uses a common completed hour, rather than mixing regional timestamps',()=>{
  const data=structuredClone(fixture);const row=data.BW.find(r=>'Generation Solar (preliminary)' in r)!;
  (row as any)['Generation Solar (preliminary)'][1][1]=null;
  expect(parseRegionalHourly(data,now).hours.at(-1)?.ts).toBe('2026-10-11T13:00:00Z');
  expect(parseRegionalHourly(fixture,new Date('2026-10-11T14:30:00Z')).hours.at(-1)?.ts).toBe('2026-10-11T13:00:00Z');
 });
 it('rejects missing regions and wrong units',()=>{
  const data:any=structuredClone(fixture);delete data.SH;expect(()=>parseRegionalHourly(data,now)).toThrow();
  const wrong:any=structuredClone(fixture);wrong.BW[0].unit='GW';expect(()=>parseRegionalHourly(wrong,now)).toThrow();
 });
 it('rejects negative generation instead of treating imports as generation',()=>{
  const data:any=structuredClone(fixture);data.BW[0]['Generation Solar (preliminary)'][0][1]=-10;
  expect(()=>parseRegionalHourly(data,now)).toThrow();
 });
});
