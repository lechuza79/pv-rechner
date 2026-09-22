import {it,expect} from 'vitest';
import {addStorageStories,type StorageRow} from '../story-storage-discovery';
import {discoverStories} from '../story-discovery';
import {buildStoryPool} from '../story-pool';
const report=()=>discoverStories({name:'Test',regionId:'12345678',source:'export',sourceDate:'2026-09-10',completeExport:true,rows:[{region_id:'12345678',segment:'gebaeude',month:'2025-01',count:10,kwp:100}]});
const row=(month:string,count:number,kwh:number,capacityCount=count):StorageRow=>({region_id:'12345678',segment:'batterie',month,count,kwh,capacityCount});
it('keeps storage energy separate from solar power and excludes pumped storage',()=>{
 const r=report();addStorageStories(r,[row('2024-01',10,100),row('2025-01',25,400),{...row('2025-01',1,9000000),segment:'pumpspeicher'}]);
 const claims=r.candidates.filter(c=>c.eventKey.startsWith('batterie'));
 expect(claims.flatMap(c=>c.evidence).some(e=>e.unit==='kWp')).toBe(false);
 expect(claims.flatMap(c=>c.evidence).find(e=>e.label==='Nutzbare Speicherkapazität')?.value).toBe(500);
 expect(buildStoryPool(r).topics.some(t=>t.evergreen&&t.timeAspects.includes('snapshot'))).toBe(true);
});
it('suppresses incomplete capacity sums but preserves count stories',()=>{
 const r=report();addStorageStories(r,[row('2024-01',10,100),row('2025-01',25,400,20)]);
 expect(r.candidates.filter(c=>c.eventKey.startsWith('batterie')).flatMap(c=>c.evidence).some(e=>e.unit==='kWh')).toBe(false);
 expect(r.candidates.some(c=>c.family==='Speicherzubau')).toBe(true);
});
it('does not manufacture news from historic events and allows content/time overlap',()=>{
 const r=report();r.candidates=[{id:'peak',family:'Lokale Monatsspitze',eventKey:'steckersolar-2024-05',title:'Peak',period:'2024-05',status:'ready',evidence:[],priority:50,comparison:'',reason:'',limitations:[],related:[],visual:''}];
 const topic=buildStoryPool(r).topics[0];
 expect(topic.categories).toEqual(expect.arrayContaining(['g10','g13']));
 expect(topic.timeAspects).toEqual(['retrospective']);
 expect(topic.isNew).toBe(false);
});
