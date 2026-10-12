import {afterEach,describe,expect,it,vi} from 'vitest';
import {regionalSolarWeatherSource} from '../dashboard/regional-solar-weather';

afterEach(()=>vi.unstubAllGlobals());
describe('regional solar weather recovery',()=>{
 it('releases a failed request so the next attempt can recover',async()=>{
  const points=[{time:'2026-10-11T10:00:00Z',powerPct:30}];
  const fetcher=vi.fn().mockRejectedValueOnce(new TypeError('Network unavailable')).mockResolvedValueOnce({ok:true,json:async()=>({points})});
  vi.stubGlobal('fetch',fetcher);
  const source=regionalSolarWeatherSource('06440016');
  const failed=source.load();
  expect(source.load()).toBe(failed);
  await expect(failed).rejects.toThrow('Network unavailable');
  await expect(source.load()).resolves.toEqual({points});
  expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('does not accept an unavailable live service as valid solar data',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503}));
  await expect(regionalSolarWeatherSource('06440').load()).rejects.toThrow('Regional daily solar curve unavailable');
 });
});
