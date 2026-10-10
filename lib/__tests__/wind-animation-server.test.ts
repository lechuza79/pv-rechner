import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';

const mocks=vi.hoisted(()=>({readFile:vi.fn(),load:vi.fn(),model:vi.fn()}));
vi.mock('node:fs/promises',()=>({readFile:mocks.readFile}));
vi.mock('../icon-d2-store',()=>({loadIconD2Shard:mocks.load}));
vi.mock('../icon-d2',()=>({modelWeatherAt:mocks.model,shardKey:()=> 'test'}));
vi.mock('../wind-map',()=>({isWindWeatherTown:()=>true}));
import {loadWindConditions} from '../wind-animation-server';

describe('preview wind availability',()=>{
 const now=new Date('2026-10-02T11:10:00Z');
 const model={windSpeed:5,windDirection:270,validAt:now.toISOString(),runInit:'2026-10-02T03:00:00Z'};
 let fetchMock:ReturnType<typeof vi.fn>;
 beforeEach(()=>{
  vi.useFakeTimers();vi.setSystemTime(now);
  mocks.readFile.mockResolvedValue(JSON.stringify({features:[{properties:{id:'03458009'},geometry:{type:'Polygon',coordinates:[[[8.3,53],[8.4,53],[8.4,53.1],[8.3,53]]]}}]}));
  mocks.load.mockResolvedValue({});mocks.model.mockReturnValue(model);
  fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({current_units:{wind_speed_10m:'m/s'},current:{wind_speed_10m:4,wind_direction_10m:250,time:'2026-10-02T11:00'}})});
  vi.stubGlobal('fetch',fetchMock);
 });
 afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.clearAllMocks();});
 it('uses fresh primary data, including real calm wind, without a second weather request',async()=>{
  mocks.model.mockReturnValue({...model,windSpeed:0});
  expect((await loadWindConditions('03458009'))?.speedMs).toBe(0);
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it('returns unavailable without external weather requests when the stored model is stale',async()=>{
  mocks.model.mockReturnValue({...model,runInit:'2026-10-01T18:00:00Z'});
  expect(await loadWindConditions('03458009')).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it('returns unavailable without external requests after a store failure',async()=>{
  mocks.load.mockRejectedValue(new Error('Weather store unavailable'));
  expect(await loadWindConditions('03458009')).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it('returns unavailable rather than inventing wind when the stored model has no wind',async()=>{
  mocks.model.mockReturnValue(null);fetchMock.mockResolvedValue({ok:false});
  expect(await loadWindConditions('03458009')).toBeNull();
 });
});
