import {afterEach,describe,expect,it,vi} from 'vitest';
import {regionalSolarWeatherSource} from '../dashboard/regional-solar-weather';

afterEach(()=>vi.unstubAllGlobals());
describe('regional live weather adapter',()=>{
  it.each([['15','region'],['01','region'],['de','region'],['09679','landkreis'],['06440016','gemeinde']])('routes %s to its prepared source',async(id,scope)=>{
    const data={points:[{time:'2026-09-26T10:00:00Z',powerPct:37}],installedKwp:1000};
    const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>data});
    vi.stubGlobal('fetch',fetcher);
    expect(await regionalSolarWeatherSource(id).load()).toEqual(data);
    expect(fetcher).toHaveBeenCalledWith(`/api/${scope}/solartag?ags=${id}`,expect.objectContaining({signal:expect.any(AbortSignal)}));
  });
  it('uses the association source without routing its nine-digit key to a county',async()=>{
    const data={points:[],installedKwp:8800};
    const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>data});
    vi.stubGlobal('fetch',fetcher);
    expect(await regionalSolarWeatherSource('071315003','/api/verband/solartag').load()).toEqual(data);
    expect(fetcher).toHaveBeenCalledWith('/api/verband/solartag',expect.objectContaining({signal:expect.any(AbortSignal)}));
  });
  it('rejects unavailable data instead of turning it into a zero curve',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503}));
    await expect(regionalSolarWeatherSource('de').load()).rejects.toThrow('unavailable');
  });
});
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
