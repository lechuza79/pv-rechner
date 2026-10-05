import {describe,it,expect} from 'vitest';
import {districtCapacity} from '../microchart-capacity';
import {solarPowerProfile,windPowerProfile} from '../microchart-power';
describe('district microchart capacity',()=>{
 const rows=[{region_id:'09679170',solar_kwp:23811.75,wind_kwp:13350},{region_id:'09679171',solar_kwp:'100',wind_kwp:0}];
 it('sums exact municipal members, preserving real zero',()=>{
  expect(districtCapacity(rows,'09679','solar_kwp',2)).toBe(23911.75);
  expect(districtCapacity(rows,'09679','wind_kwp',2)).toBe(13350);
 });
 it('keeps missing, truncated and foreign stock unavailable',()=>{
  expect(districtCapacity(rows,'09679','solar_kwp',3)).toBeNull();
  expect(districtCapacity([],'09679','solar_kwp',0)).toBeNull();
  expect(districtCapacity([...rows,{...rows[0],region_id:'09663000'}],'09679','solar_kwp',3)).toBeNull();
  expect(districtCapacity([{...rows[0],solar_kwp:null}],'09679','solar_kwp',1)).toBeNull();
 });
 it('distinguishes calm wind from nonzero solar and missing capacity',()=>{
  const points=[{time:'2026-10-03T10:33:57.937Z',value:40.26437444444444}];
  expect(solarPowerProfile(points,23811.75)?.[0].value).toBeCloseTo(9587.65218);
  expect(windPowerProfile([{time:points[0].time,value:.867125}],13350,100)?.[0].value).toBe(0);
  expect(solarPowerProfile(points,null)).toBeNull();
 });
});
