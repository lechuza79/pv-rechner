import {describe,it,expect,vi,afterEach} from 'vitest';
import {createWidgetResourceStore,widgetResourceKey} from '../widget-resource';
afterEach(()=>vi.unstubAllGlobals());
describe('shared dashboard observations',()=>{
 it('adds newly configured widgets to the same store without replacing fresher data',()=>{
  const store=createWidgetResourceStore({'/api/one':{data:2,fetchedAt:20}});
  const listener=vi.fn();store.subscribe('/api/two',listener);
  store.seed({'/api/one':{data:1,fetchedAt:10},'/api/two':{data:3,fetchedAt:30}});
  expect(store.read('/api/one').data).toBe(2);expect(store.read('/api/two').data).toBe(3);expect(listener).toHaveBeenCalledOnce();
 });
 it('renders server observations without repeating a fresh request',async()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  const store=createWidgetResourceStore({'/api/energy/trade?year=2026&period=year':{data:{value:12},fetchedAt:Date.now()}});
  expect(store.read('/api/energy/trade?period=year&year=2026').data).toEqual({value:12});
  await store.load('/api/energy/trade?period=year&year=2026');
  expect(fetch).not.toHaveBeenCalled();
 });
 it('deduplicates concurrent consumers and keeps observations during refresh/failure',async()=>{
  let complete!:(response:Response)=>void;
  const fetch=vi.fn(()=>new Promise<Response>(resolve=>{complete=resolve;}));vi.stubGlobal('fetch',fetch);
  const store=createWidgetResourceStore({'/api/prices':{data:{price:42},fetchedAt:1}});
  const a=store.load('/api/prices'),b=store.load('/api/prices');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(store.read('/api/prices')).toMatchObject({data:{price:42},loading:false});
  complete(new Response('unavailable',{status:503}));await Promise.all([a,b]);
  expect(store.read('/api/prices')).toMatchObject({data:{price:42},loading:false,error:expect.any(String)});
  fetch.mockResolvedValueOnce(Response.json({price:43}));await store.load('/api/prices',300_000,true);
  expect(store.read('/api/prices')).toMatchObject({data:{price:43},error:null});
 });
 it('isolates different data selections while sharing presentation-independent identity',()=>{
  expect(widgetResourceKey('/api/energy/trade?year=2026&period=month')).not.toBe(widgetResourceKey('/api/energy/trade?year=2026&period=year'));
 });
});

it('keeps server observation age and retries a refreshing snapshot before the normal TTL',async()=>{
 const observedAt=Date.now()-6*60_000;
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json({value:1},{headers:{'X-Widget-Data-Fetched-At':String(observedAt),'X-Widget-Data-Stale':'1'}})).mockResolvedValueOnce(Response.json({value:2}));
 vi.stubGlobal('fetch',fetcher);
 const store=createWidgetResourceStore();
 await store.load('/api/prices');
 expect(store.read('/api/prices')).toMatchObject({data:{value:1},fetchedAt:observedAt,refreshPending:true});
 await store.load('/api/prices');
 expect(fetcher).toHaveBeenCalledTimes(2);
 expect(store.read('/api/prices')).toMatchObject({data:{value:2},refreshPending:false});
});
