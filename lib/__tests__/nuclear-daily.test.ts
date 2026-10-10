import {describe,it,expect} from 'vitest';
import {nuclearDaily,nuclearDailyEnergy} from '../nuclear-daily';
const series=(start:string,hours:number,value:number)=>Array.from({length:hours},(_,i)=>({ts:new Date(Date.parse(start)+i*3600000).toISOString(),nuclear_gw:value}));
describe('nuclear calendar-day means',()=>{
 it('uses each day rather than the overall period average',()=>{
  const days=nuclearDaily([...series('2026-10-01T22:00Z',24,1),...series('2026-10-02T22:00Z',24,3)]);
  expect(days.at(-1)?.gw).toBe(3);expect(days.at(-2)?.gw).toBe(1);expect(days.at(-1)?.partial).toBe(false);
 });
 it('retains missing days as null and marks incomplete days',()=>{
  const days=nuclearDaily([...series('2026-10-01T22:00Z',2,2),...series('2026-10-03T22:00Z',2,4)]);
  expect(days.at(-2)?.gw).toBeNull();expect(days.at(-1)?.partial).toBe(true);expect(days.at(-1)?.gw).toBe(4);
 });
 it('recognizes 23 and 25 hour Berlin days',()=>{
  expect(nuclearDaily(series('2026-03-28T23:00Z',23,2)).at(-1)?.partial).toBe(false);
  expect(nuclearDaily(series('2026-10-24T22:00Z',25,2)).at(-1)?.partial).toBe(false);
 });
 it('keeps legitimate zero and rejects invalid samples',()=>{
  expect(nuclearDaily(series('2026-10-01T22:00Z',24,0)).at(-1)?.gw).toBe(0);
  expect(nuclearDaily([{ts:'invalid',nuclear_gw:1}])).toEqual([]);
 });
 it('does not let duplicate timestamps inflate coverage',()=>{
  const data=series('2026-10-01T22:00Z',12,2);
  expect(nuclearDaily([...data,...data]).at(-1)?.coverage).toBe(.5);
 });
});

describe('nuclear calendar-day energy',()=>{
 const quarters=(start:string,hours:number,value:number)=>Array.from({length:hours*4},(_,i)=>({ts:new Date(Date.parse(start)+i*900000).toISOString(),nuclear_gw:value}));
 it('integrates seven completed days and excludes the current day',()=>{
  const result=nuclearDailyEnergy(quarters('2026-09-26T22:00Z',192,2),'2026-10-04T12:00Z');
  expect(result.days.map(d=>d.date)).toEqual(['2026-09-27','2026-09-28','2026-09-29','2026-09-30','2026-10-01','2026-10-02','2026-10-03']);
  expect(result.days.every(d=>d.gwh===48&&!d.partial)).toBe(true);
  expect(result.totalGwh).toBe(336);
 });
 it('never totals or extrapolates a missing interval',()=>{
  const data=quarters('2026-09-26T22:00Z',168,2);data.splice(4,1);
  const result=nuclearDailyEnergy(data,'2026-10-04T12:00Z');
  expect(result.totalGwh).toBeNull();expect(result.days[0].gwh).toBe(47.5);expect(result.days[0].partial).toBe(true);
 });
 it('does not infer completeness from consistently missing alternate intervals',()=>{
  const result=nuclearDailyEnergy(quarters('2026-09-26T22:00Z',168,2).filter((_,i)=>i%2===0),'2026-10-04T12:00Z');
  expect(result.totalGwh).toBeNull();expect(result.days[0].coverage).toBe(.5);
 });
 it('integrates the actual 23 and 25 hours at clock changes',()=>{
  const spring=nuclearDailyEnergy(quarters('2026-03-22T23:00Z',167,2),'2026-03-30T12:00Z');
  expect(spring.days.at(-1)?.gwh).toBe(46);expect(spring.totalGwh).toBe(334);
  const autumn=nuclearDailyEnergy(quarters('2026-10-18T22:00Z',169,2),'2026-10-26T12:00Z');
  expect(autumn.days.at(-1)?.gwh).toBe(50);expect(autumn.totalGwh).toBe(338);
 });
 it('keeps zero, deduplicates observations and preserves missing calendar days',()=>{
  const data=quarters('2026-09-26T22:00Z',168,0);
  expect(nuclearDailyEnergy([...data,...data],'2026-10-04T12:00Z').totalGwh).toBe(0);
  const missing=nuclearDailyEnergy(data.slice(96),'2026-10-04T12:00Z');
  expect(missing.days[0].gwh).toBeNull();expect(missing.totalGwh).toBeNull();
  expect(nuclearDailyEnergy(data,'invalid')).toEqual({days:[],totalGwh:null});
 });
 it('keeps the window anchored to asOf when observations are stale',()=>{
  const result=nuclearDailyEnergy(quarters('2026-09-26T22:00Z',168,2),'2026-10-06T12:00Z');
  expect(result.days.at(-1)?.date).toBe('2026-10-05');expect(result.days.at(-1)?.gwh).toBeNull();expect(result.totalGwh).toBeNull();
 });
});
