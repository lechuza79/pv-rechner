import {afterEach, describe, expect, it, vi} from 'vitest';
import {regionalSolarWeatherSource} from '../dashboard/regional-solar-weather';
afterEach(()=>vi.unstubAllGlobals());
describe('regional live weather adapter',()=>{
  it.each([['15','region'],['01','region'],['de','region'],['09679','landkreis'],['06440016','gemeinde']])('routes %s to its prepared source',async(id,scope)=>{
    const data={points:[{time:'2026-09-26T10:00:00Z',powerPct:37}],installedKwp:1000};
    const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>data});
    vi.stubGlobal('fetch',fetcher);
    expect(await regionalSolarWeatherSource(id).load()).toEqual(data);
    expect(fetcher).toHaveBeenCalledWith(`/api/${scope}/solartag?ags=${id}`);
  });
  it('rejects unavailable data instead of turning it into a zero curve',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503}));
    await expect(regionalSolarWeatherSource('de').load()).rejects.toThrow('unavailable');
  });
});
