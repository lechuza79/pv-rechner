import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {serialize,deserialize} from 'node:v8';
import {previewData,livePreviewJson,livePreviewResponse} from '../preview-data';
import {liveWidgetDataUrl} from '../widget-data-services';
let dir:string;
beforeEach(async()=>{
  dir=await mkdtemp(path.join(tmpdir(),'widget-data-test-'));
  vi.spyOn(process,'cwd').mockReturnValue(dir);
  vi.stubEnv('NODE_ENV','development');
  vi.stubEnv('WIDGET_PREVIEW_DATA','live');
});
afterEach(async()=>{vi.restoreAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals();await rm(dir,{recursive:true,force:true});});
async function ageSnapshot(age:number){
  const folder=path.join(dir,'.cache/widget-preview-data');
  const [name]=await readdir(folder);
  const file=path.join(folder,name);
  const data=deserialize(await readFile(file));
  data.fetchedAt=Date.now()-age;
  await writeFile(file,serialize(data));
}
describe('shared preview data',()=>{
  it('uses live once and reuses a successful disk snapshot',async()=>{
    const load=vi.fn().mockResolvedValue({place:'Nidda',value:12,stand:'2026-09'});
    await previewData('town',load);
    expect(await previewData('town',load)).toEqual({place:'Nidda',value:12,stand:'2026-09'});
    expect(load).toHaveBeenCalledTimes(1);
  });
  it('keeps query/place identities separate',async()=>{
    expect(await previewData('town:A',async()=>({value:1}))).toEqual({value:1});
    expect(await previewData('town:B',async()=>({value:2}))).toEqual({value:2});
  });
  it('returns last successful data immediately while an outage is retried',async()=>{
    await previewData('outage',async()=>({value:9}));
    await ageSnapshot(6*60_000);
    const result=await previewData('outage',async()=>{throw new Error('offline');});
    expect(result).toEqual({value:9});
  });
  it('does not serve snapshots older than 24 hours',async()=>{
    await previewData('expired',async()=>({value:9}));
    await ageSnapshot(25*60*60_000);
    await expect(previewData('expired',async()=>{throw new Error('offline');})).rejects.toThrow('offline');
  });
  it('deduplicates simultaneous requests',async()=>{
    const load=vi.fn(async()=>{await new Promise(resolve=>setTimeout(resolve,15));return {value:7};});
    const result=await Promise.all([previewData('parallel',load),previewData('parallel',load)]);
    expect(result).toEqual([{value:7},{value:7}]);expect(load).toHaveBeenCalledTimes(1);
  });
  it('does not cache a failed first load',async()=>{
    await expect(previewData('fail',async()=>{throw new Error('offline');})).rejects.toThrow();
    expect(await previewData('fail',async()=>({value:3}))).toEqual({value:3});
  });
  it('leaves production and explicit local mode untouched',async()=>{
    const load=vi.fn().mockResolvedValue({value:1});
    vi.stubEnv('NODE_ENV','production');
    await previewData('production',load);await previewData('production',load);
    vi.stubEnv('NODE_ENV','development');vi.stubEnv('WIDGET_PREVIEW_DATA','local');
    await previewData('production',load);expect(load).toHaveBeenCalledTimes(3);
  });
  it('rejects unrelated services and mutation endpoints before fetching',async()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    await expect(livePreviewJson('https://example.com/api/energy/generation')).rejects.toThrow();
    await expect(livePreviewJson('/api/energy/backfill')).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects empty or malformed data rather than caching it',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({data:[]})));
    await expect(livePreviewJson('/api/energy/generation')).rejects.toThrow('Invalid');
  });
  it('serves trade through the live origin without forwarding local credentials',async()=>{
    const data={days:[{date:'2026-10-09',importMwh:1,exportMwh:2}],asOf:'2026-10-10',totals:{importMwh:1,exportMwh:2}};
    const fetcher=vi.fn().mockResolvedValue(Response.json(data));vi.stubGlobal('fetch',fetcher);
    const request=new Request('http://localhost:4319/api/energy/trade?period=seven',{headers:{Cookie:'local-session=secret',Authorization:'Bearer secret'}});
    const response=await livePreviewResponse(request);
    expect(await response!.json()).toEqual(data);
    expect(response!.headers.get('X-Widget-Data-Origin')).toBe('https://solar-check.io');
    const [url,options]=fetcher.mock.calls[0];
    expect(url.href).toBe('https://solar-check.io/api/energy/trade?period=seven');
    expect(options).toMatchObject({credentials:'omit',redirect:'error',headers:{Accept:'application/json'}});
    expect(Object.keys(options.headers)).toEqual(['Accept']);
  });
  it.each(['gemeinde','landkreis','region'])('shares the live boundary for %s solar curves',async scope=>{
    const data={points:[{ts:'2026-10-10T12:00:00Z',kw:2}]};
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(data)));
    const response=await livePreviewResponse(new Request(`http://localhost/api/${scope}/solartag?ags=06440016`));
    expect(await response!.json()).toEqual(data);
  });
  it('does not intercept writes or production reads',async()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    expect(await livePreviewResponse(new Request('http://localhost/api/prices',{method:'POST'}))).toBeNull();
    vi.stubEnv('NODE_ENV','production');
    expect(await livePreviewResponse(new Request('http://localhost/api/prices'))).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(['/api/prices?resync=1','/api/energy/trade?period=seven&period=ytd','https://user:pass@solar-check.io/api/prices','/api/energy/setup'])('rejects unapproved request %s',endpoint=>{
    expect(()=>liveWidgetDataUrl(endpoint)).toThrow();
  });
  it('preserves upstream invalid-query status and does not cache it',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response('invalid',{status:400}));vi.stubGlobal('fetch',fetcher);
    const request=new Request('http://localhost/api/energy/trade?period=invalid');
    expect((await livePreviewResponse(request))!.status).toBe(400);
    expect((await livePreviewResponse(request))!.status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('keeps weather service error payloads out of the successful cache',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({source:'error',current:{},hourly:{}})));
    expect((await livePreviewResponse(new Request('http://localhost/api/weather?lat=50&lon=8')))!.status).toBe(503);
  });
});

it('marks an old response so browsers can collect its background refresh',async()=>{
 const data={days:[{date:'2026-10-09',importMwh:1,exportMwh:2}],asOf:'2026-10-10',totals:{importMwh:1,exportMwh:2}};
 const fetcher=vi.fn().mockResolvedValue(Response.json(data));vi.stubGlobal('fetch',fetcher);
 const request=new Request('http://localhost/api/energy/trade?period=seven');
 await livePreviewResponse(request);
 await ageSnapshot(6*60_000);
 fetcher.mockRejectedValue(new Error('offline'));
 const response=await livePreviewResponse(request);
 expect(response!.headers.get('X-Widget-Data-Stale')).toBe('1');
 expect(Number(response!.headers.get('X-Widget-Data-Fetched-At'))).toBeLessThan(Date.now()-300_000);
 expect(await response!.json()).toEqual(data);
});
