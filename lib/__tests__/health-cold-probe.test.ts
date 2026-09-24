import { it, expect, vi } from 'vitest';
import { collectColdProbes } from '../health-cold-probe';
it('counter-check excludes original URL and warmed district, never accepts HIT/STALE as fresh evidence', async () => {
  const base = 'https://example.test';
  const paths = ['/solar-atlas/state/first/town','/solar-atlas/state/warm/other','/solar-atlas/state/hit/town','/solar-atlas/state/stale/town','/solar-atlas/state/fresh/town'];
  const measure = vi.fn(async (label:string,path:string) => ({label,url:base+path,status:200,seconds:0.01,region:'fra1',cache:path.includes('/fresh/')?'MISS':path.includes('/stale/')?'STALE':'HIT'}));
  const result = await collectColdProbes({label:'test',paths,target:3,base,visited:new Set([base+paths[0]]),excludedRegions:new Set(['/solar-atlas/state/warm']),measure});
  expect(measure.mock.calls.map(c=>c[1])).toEqual(paths.slice(2));
  expect(result.map(r=>r.url)).toEqual([base+paths[4]]);
});
it('an HTTP error without a MISS header still escalates; a fast cache response alone proves nothing', async () => {
  const collect = (status:number,cache:string) => collectColdProbes({label:'test',paths:['/a'],target:1,base:'https://example.test',visited:new Set(),excludedRegions:new Set(),measure:async()=>({label:'test',url:'https://example.test/a',status,cache,seconds:0.01,region:''})});
  expect(await collect(200,'HIT')).toEqual([]);
  expect(await collect(200,'STALE')).toEqual([]);
  expect(await collect(500,'')).toHaveLength(1);
  expect(await collect(0,'TimeoutError')).toHaveLength(1);
});
