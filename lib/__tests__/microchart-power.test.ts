import {describe,it,expect} from 'vitest';
import {solarPowerProfile,windPowerProfile,powerDisplay} from '../microchart-power';
const points=[{time:'2026-10-02T10:00:00Z',value:50}];
describe('microchart power',()=>{
 it('scales solar output by the selected installed capacity',()=>{
  expect(solarPowerProfile(points,2000)?.[0].value).toBe(1000);
  expect(powerDisplay(1000)).toEqual({value:1,unit:'MW'});
 });
 it('keeps missing data separate from a real zero',()=>{
  expect(solarPowerProfile(points,null)).toBeNull();
  expect(solarPowerProfile(points,0)?.[0].value).toBe(0);
  expect(powerDisplay(null).value).toBeNull();
 });
 it('rejects surface wind and uses the existing reference curve at its intended height',()=>{
  const wind=[{time:points[0].time,value:12}];
  expect(windPowerProfile(wind,2000,10)).toBeNull();
  expect(windPowerProfile(wind,2000,100)?.[0].value).toBe(2000);
 });
});
