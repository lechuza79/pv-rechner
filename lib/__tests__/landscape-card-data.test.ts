import {describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('../preview-data',()=>({previewData:(_key:string,load:()=>unknown)=>load()}));
import {loadLandscapeAsset,loadLandscapeStops} from '../landscape-data.server';
import solarRegister from '../../public/geo/nidda-preview/solar-register.json';

describe('standalone landscape cards',()=>{
 it('keeps the same destinations and plant capacity without shipping geometry',async()=>{
  const data=await loadLandscapeStops('06440016');
  expect(data.stops.map(stop=>stop.id)).toEqual(['nidda-market','nidda-windpark','nidda-sewage']);
  expect(data.stops.find(stop=>stop.kind==='solar')?.capacityKw).toBe(solarRegister.capacityKw);
  expect(data.stops.find(stop=>stop.kind==='wind')?.capacityKw).toBeGreaterThan(0);
  expect(data).not.toHaveProperty('buildings');
  expect(data).not.toHaveProperty('terrain');
  expect(JSON.stringify(data).length).toBeLessThan(3000);
 });
 it('retains the prepared wind park identity used for the weather request',async()=>{
  const data=await loadLandscapeStops('03458009');
  expect(data.municipality).toBe('03458009');
  expect(data.stops.find(stop=>stop.id==='wind-1')?.kind).toBe('wind');
 });
 it('rejects paths outside the prepared public landscape resources',async()=>{
  await expect(loadLandscapeAsset('/../../.env.local')).rejects.toThrow('Unknown landscape asset');
 });
});
