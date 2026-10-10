import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
beforeEach(()=>{
 vi.resetModules();
 const storage:Record<string,string>={};
 vi.stubGlobal('localStorage',{getItem:(key:string)=>storage[key]??null,setItem:(key:string,value:string)=>{storage[key]=value},removeItem:(key:string)=>{delete storage[key]}});
 let tail=Promise.resolve();
 vi.stubGlobal('navigator',{locks:{request:vi.fn((_key:string,run:()=>Promise<unknown>)=>{const request=tail.then(run);tail=request.then(()=>undefined,()=>undefined);return request})}});
});
afterEach(()=>vi.unstubAllGlobals());
describe('trade data reuse',()=>{
 it('reuses a successful period without another request',async()=>{
  const data={days:[],asOf:'2026-10-08T12:00:00Z'};
  const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>data});vi.stubGlobal('fetch',fetch);
  const {loadTrade}=await import('../electricity-trade-client');
  expect(await loadTrade('/api/energy/trade?period=year&year=2026')).toEqual(data);
  expect(await loadTrade('/api/energy/trade?period=year&year=2026')).toEqual(data);
  expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('coalesces concurrent iframe requests through shared storage and a lock',async()=>{
  const data={days:[],asOf:'2026-10-08T12:00:00Z'};
  const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>data});vi.stubGlobal('fetch',fetch);
  const first=await import('../electricity-trade-client');vi.resetModules();
  const second=await import('../electricity-trade-client');
  await Promise.all([first.loadTrade('/api/energy/trade?period=year'),second.loadTrade('/api/energy/trade?period=year')]);
  expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('does not cache errors and permits a later retry',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce({ok:false,json:async()=>({error:'unavailable'})}).mockResolvedValueOnce({ok:true,json:async()=>({days:[],asOf:'2026-10-08T12:00:00Z'})});vi.stubGlobal('fetch',fetch);
  const {loadTrade}=await import('../electricity-trade-client');
  await expect(loadTrade('/api/energy/trade?period=year')).rejects.toThrow('unavailable');
  await loadTrade('/api/energy/trade?period=year');expect(fetch).toHaveBeenCalledTimes(2);
 });
});
