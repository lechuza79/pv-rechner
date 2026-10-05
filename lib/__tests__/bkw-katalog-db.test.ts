import { it, expect, vi, beforeEach } from 'vitest';
const {single}=vi.hoisted(()=>({single:vi.fn()}));
vi.mock('../supabase-server',()=>({supabase:{from:()=>({select:()=>({eq:()=>({single})})})}}));
vi.mock('../db-timeout',()=>({DB_SOFT_READ_TIMEOUT_MS:3000,withDbTimeout:(p:unknown)=>p}));
import { readBkwCatalog } from '../bkw-katalog-db';
beforeEach(()=>vi.clearAllMocks());
it('returns stored prices and their actual fetch date',async()=>{
 const fetched_at=new Date().toISOString();single.mockResolvedValue({data:{payload:[{id:'a',preis:100}],fetched_at,item_count:1}});
 expect(await readBkwCatalog()).toEqual({angebote:[{id:'a',preis:100}],abgerufenIso:fetched_at});
});
it('does not serve stale, empty or failed reads as fresh prices',async()=>{
 for(const data of [{payload:[],item_count:0,fetched_at:new Date().toISOString()},{payload:[{}],item_count:1,fetched_at:'2020-01-01T00:00:00Z'},null]){
  single.mockResolvedValue({data});await expect(readBkwCatalog()).rejects.toThrow();
 }
});
