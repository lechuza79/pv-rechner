import {afterEach,describe,expect,it,vi} from 'vitest';
const resource=vi.hoisted(()=>vi.fn((..._args:unknown[])=>({data:{data:[]},fetchedAt:0,loading:false,error:null,isStale:false,refetch:vi.fn()})));
vi.mock('../../components/dashboard/WidgetData',()=>({useWidgetResource:resource}));
import {useGenerationMix} from '../energy';
afterEach(()=>vi.clearAllMocks());
describe('energy observations use the shared refresh store',()=>{
 it('seeds the actual server observation age, retaining it before the first browser request',()=>{
  const initial={country:'de',source:'Energy-Charts',license:'CC BY 4.0',retrievedAt:'2026-10-13T15:00:00Z',data:[{ts:'2026-10-13T14:45:00Z',solar:1000}]};
  const result=useGenerationMix('de',24,undefined,initial);
  expect(resource).toHaveBeenCalledWith('/api/energy/generation?country=de&hours=24',initial,300000,{data:initial,fetchedAt:Date.parse(initial.retrievedAt)});
  expect(result.retrievedAt).toBe(initial.retrievedAt);
 });
 it('keeps completed periods on the existing long-lived cache',()=>{
  useGenerationMix('de',8760,{start:'2020-01-01',end:'2020-12-31'});
  expect(resource.mock.calls[0][2]).toBe(86400000);
 });
});
