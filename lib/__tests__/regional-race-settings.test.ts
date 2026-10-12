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

it.each([['commercial-roofs','gewerbe_dach'],['ground-mounted','freiflaeche'],['balcony','steckersolar']] as const)('filters %s in both chart and history',(segment,source)=>{
 const towns=[{region_id:'07335',name:'Kaiserslautern',slug:null}] as AtlasChild[];
 const regions=[{region_id:'07335',name:'Kaiserslautern',slug:null,population:100}];
 const cells=[{region_id:'07335',segment:'privat_dach',year:2025,count:2,kwp:20,kwh:0},{region_id:'07335',segment:source,year:2025,count:3,kwp:900,kwh:0}];
 const result=regionalRaceData(towns,{regions,cells},'2026-10-01','',{metric:'kwp',segment,cohort:'all',highlight:''});
 expect(result.rows[0].value).toBe(900);
 expect(result.history.at(-1)?.rows[0].value).toBe(900);
 expect(result.history.find(row=>row.year===2024)?.rows[0].value).toBe(0);
});
