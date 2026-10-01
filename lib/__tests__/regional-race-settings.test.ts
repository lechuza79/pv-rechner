import {describe,it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {regionalRaceData} from '../regional-race';
import type {AtlasChild} from '../atlas';
describe('private-roof racing data',()=>{
 it('excludes balcony and commercial power and uses the same selection for history',()=>{
  const towns=[{region_id:'07335',name:'Kaiserslautern',slug:null}] as AtlasChild[];
  const regions=[{region_id:'07335',name:'Kaiserslautern',slug:null,population:100}];
  const cells=[
   {region_id:'07335',segment:'privat_dach',year:2025,count:2,kwp:20,kwh:0},
   {region_id:'07335',segment:'steckersolar',year:2025,count:100,kwp:80,kwh:0},
   {region_id:'07335',segment:'gewerbe_dach',year:2025,count:1,kwp:1000,kwh:0},
  ];
  const result=regionalRaceData(towns,{regions,cells},'2026-10-01','',{metric:'per-capita',segment:'private-roofs',cohort:'districts',highlight:'07335'});
  expect(result.rows[0].value).toBe(200);
  expect(result.history.at(-1)?.rows[0].value).toBe(200);
 });
});
