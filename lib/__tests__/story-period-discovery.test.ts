import {it,expect} from 'vitest';
import {addPeriodStories} from '../story-period-discovery';
import {discoverStories} from '../story-discovery';
const report=()=>discoverStories({name:'Test',regionId:'12345678',source:'export',sourceDate:'2026-09-10',completeExport:true,rows:[]});
it('excludes a partly mature ISO week and accepts the last wholly mature week',()=>{
 const r=report();addPeriodStories(r,{daily:[],weekly:[{segment:'gebaeude',week:'2020-W01',count:2,kwp:20},{segment:'gebaeude',week:'2026-W22',count:20,kwp:200},{segment:'gebaeude',week:'2026-W23',count:500,kwp:5000}]});
 expect(r.candidates.map(c=>c.period)).toEqual(['2026-W22','2026-W22']);
});
it('does not treat a day peak as a project or measured generation',()=>{
 const r=report();addPeriodStories(r,{weekly:[],daily:[{segment:'gebaeude',day:'2020-01-01',count:1,kwp:10},{segment:'gebaeude',day:'2025-05-01',count:30,kwp:300}]});
 expect(r.candidates).toHaveLength(2);expect(r.candidates.every(c=>c.family==='Tageshöchstwert'&&c.limitations.length>0)).toBe(true);
});

it('keeps a later local episode despite an old larger global record',()=>{
 const r=report();addPeriodStories(r,{weekly:[],daily:[{segment:'gebaeude',day:'1995-01-01',count:1,kwp:10},{segment:'gebaeude',day:'1998-05-01',count:200,kwp:2000},{segment:'gebaeude',day:'2023-06-01',count:2,kwp:20},{segment:'gebaeude',day:'2025-05-01',count:30,kwp:300}]});
 expect(r.candidates.some(c=>c.period==='1998-05-01')).toBe(true);expect(r.candidates.some(c=>c.period==='2025-05-01')).toBe(true);
 expect(new Set(r.candidates.map(c=>c.id)).size).toBe(r.candidates.length);
});
it('rejects invalid ISO weeks and duplicate buckets',()=>{
 for(const weekly of [[{segment:'gebaeude',week:'2021-W53',count:100,kwp:1000}],[{segment:'gebaeude',week:'2020-W01',count:100,kwp:1000},{segment:'gebaeude',week:'2020-W01',count:100,kwp:1000}]]){
 const r=report();addPeriodStories(r,{daily:[],weekly});expect(r.candidates).toEqual([]);expect(r.checks.some(c=>c.family==='Wochenwerte'&&c.status==='missing')).toBe(true);
 }
});
