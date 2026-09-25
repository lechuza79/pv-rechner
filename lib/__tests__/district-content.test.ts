import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {GemeindePaket} from '../gemeinde-paket';
const read=vi.hoisted(()=>vi.fn());
vi.mock('next/cache',()=>({unstable_cache:(fn:unknown)=>fn}));
vi.mock('../gemeinde-paket-server',()=>({ladeGemeindePaket:read}));
import {loadDistrictContent} from '../district-monitor-server';

const packet=(ags:string)=>({ags,name:ags,registerStand:'2026-09-09',district:{peers:[],districtPeers:[]},stories:[],register:{own:{sums:{alle:{kwp:100}}}},monitorHistory:null,monitorPeriods:null}) as unknown as GemeindePaket;
describe('shared district content',()=>{
 beforeEach(()=>{read.mockReset();});
 it('reads every town once, bounds concurrency and preserves complete capacity coverage',async()=>{
  let active=0,peak=0;
  read.mockImplementation(async(id:string)=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,1));active--;return packet(id)});
  const ids=Array.from({length:19},(_,i)=>String(i));
  const result=await loadDistrictContent(ids,'Test district');
  expect(read.mock.calls.map(([id])=>id).sort()).toEqual([...ids].sort());
  expect(peak).toBeLessThanOrEqual(8);
  expect(result.monitor.sites).toHaveLength(ids.length);
  expect(result.monitor.status).toBe('unavailable'); // No invented month history.
 });
 it('never turns missing or mixed-edition towns into complete totals',async()=>{
  read.mockImplementation(async(id:string)=>id==='missing'?null:packet(id));
  expect((await loadDistrictContent(['a','missing'],'Test')).monitor.sites).toBeNull();
  read.mockImplementation(async(id:string)=>({...packet(id),registerStand:id==='a'?'2026-09-09':'2026-08-09'}));
  expect((await loadDistrictContent(['a','b'],'Test')).monitor.sites).toBeNull();
 });
 it('propagates storage failures rather than caching partial data',async()=>{
  read.mockRejectedValue(new Error('storage unavailable'));
  await expect(loadDistrictContent(['a'],'Test')).rejects.toThrow('storage unavailable');
 });
});
