import {it,expect} from 'vitest';
import {buildStoryPool,candidateFingerprint,STORY_FACETS} from '../story-pool';
import {discoverStories,type SolarRow} from '../story-discovery';
const rows:SolarRow[]=Array.from({length:72},(_,i)=>({region_id:'12345678',segment:'gebaeude',month:`${2020+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`,count:10,kwp:100}));
const run=(r:SolarRow[])=>discoverStories({name:'Test',regionId:'12345678',sourceDate:'2026-09-10',source:'export',completeExport:true,rows:r});
it('does not turn sustained exponential growth into monthly exceptional events',()=>{
 const r=run(rows.map((r,i)=>({...r,count:10*2**Math.floor(i/12),kwp:100*2**Math.floor(i/12)})));
 expect(r.candidates.filter(c=>c.family==='Lokale Monatsspitze')).toHaveLength(0);
});
it('finds two distinct local events and keeps both months separate',()=>{
 const r=run(rows.map(r=>['2024-03','2024-08'].includes(r.month)?{...r,count:150,kwp:1500}:r));
 const pool=buildStoryPool(r);
 expect(pool.topics.filter(t=>t.timeAspects.includes('retrospective')).map(t=>t.period)).toEqual(expect.arrayContaining(['2024-03','2024-08']));
 expect(pool.topics.flatMap(t=>t.observations).length).toBe(pool.observationCount);
 expect(new Set(pool.topics.flatMap(t=>t.observations.map(c=>c.id))).size).toBe(pool.observationCount);
});
it('never calls an initial backfill new news',()=>{
 const report=run(rows.map(r=>r.month==='2024-03'?{...r,count:150}:r));
 expect(buildStoryPool(report).topics.some(t=>t.isNew)).toBe(false);
 expect(buildStoryPool(report,report).topics.some(t=>t.isNew)).toBe(false);
});
it('marks new observations only across compatible earlier exports',()=>{
 const previous={...run(rows),sourceDate:'2026-08-10'};
 const current=run(rows.map(r=>r.month==='2024-03'?{...r,count:150}:r));
 expect(buildStoryPool(current,previous).topics.some(t=>t.isNew)).toBe(true);
 expect(buildStoryPool(current,{...previous,version:'older-rules'}).topics.some(t=>t.isNew)).toBe(false);
 expect(buildStoryPool(current,{...previous,sourceDate:current.sourceDate}).topics.some(t=>t.isNew)).toBe(false);
});

const claim=(family:string,period='2026-09-10',extra:Record<string,unknown>={})=>({id:`test-${family}-${period}`,family,title:family,status:'ready' as const,priority:50,period,comparison:'Same basis',evidence:[{label:'Value',value:10,unit:'Anlagen'}],reason:'Test',limitations:[],related:[],visual:'Chart',eventKey:`test-${period}`,...extra});
it('separates observed changes, retrospective maxima and reusable snapshots',()=>{
 const report={...run(rows),candidates:[claim('Rangänderung'),claim('Förderänderung','2020-05-02'),claim('Monatsspitze','2025-05'),claim('Bestandsprofil'),claim('Wohnstruktur','2022-05-15')]};
 const pool=buildStoryPool(report);
 const topic=(family:string)=>pool.topics.find(t=>t.observations.some(c=>c.family===family))!;
 expect(topic('Rangänderung').timeAspects).toEqual(['event']);
 expect(topic('Förderänderung').timeAspects).toEqual(['event']);
 expect(topic('Monatsspitze').timeAspects).toEqual(['retrospective']);
 expect(topic('Bestandsprofil').timeAspects).toEqual(['snapshot']);
 expect(topic('Bestandsprofil').evergreen).toBe(true);
 expect(topic('Wohnstruktur').categories).toContain('housing');
 expect(topic('Wohnstruktur').categories).not.toContain('g15');
});
it('does not confuse another export or refreshed values with a newly discovered standing fact',()=>{
 const a=claim('Bestandsprofil','2026-08-10');
 const b=claim('Bestandsprofil','2026-09-10',{evidence:[{label:'Value',value:12,unit:'Anlagen'}]});
 const previous={...run(rows),sourceDate:'2026-08-10',candidates:[a]};
 const current={...run(rows),candidates:[b]};
 expect(buildStoryPool(current,previous).topics[0].isNew).toBe(false);
 expect(buildStoryPool({...current,previousSourceDate:previous.sourceDate,previousCandidateIds:[a.id]}).topics[0].isNew).toBe(false);
 expect(candidateFingerprint(a)).toBe(candidateFingerprint(b));
 expect(candidateFingerprint(claim('Wohnstruktur','2022-05-15'))).not.toBe(candidateFingerprint(claim('Wohnstruktur','2032-05-15')));
});
it('rejects a prior report from a different municipality as a novelty baseline',()=>{
 expect(buildStoryPool(run(rows),{...run(rows),regionId:'87654321',sourceDate:'2026-08-10'}).hasPreviousRun).toBe(false);
});
it('keeps an unmapped family visible without inventing a category or time meaning',()=>{
 const pool=buildStoryPool({...run(rows),candidates:[claim('Neue Datenfamilie')]});
 expect(pool.observationCount).toBe(1);
 expect(pool.topics[0].observations).toHaveLength(1);
 expect(pool.topics[0].categories).toEqual(['unassigned']);
 expect(pool.topics[0].timeAspects).toEqual([]);
 expect(pool.unmappedFamilies).toEqual(['Neue Datenfamilie']);
});
it('keeps two independent metrics for the same period in one inspectable topic',()=>{
 const pool=buildStoryPool({...run(rows),candidates:[claim('Jahresveränderung','2024'),claim('Jahreshöchstwert','2024',{id:'other',evidence:[{label:'Value',value:100,unit:'kWp'}]})]});
 expect(pool.topics).toHaveLength(1);
 expect(pool.topics[0].observations).toHaveLength(2);
 expect(pool.topics[0].categories).toEqual(expect.arrayContaining(['g2','g10']));
});
it('only declares explicitly mapped categories',()=>{
 expect(Object.values(STORY_FACETS).every(f=>f.categories.length>0)).toBe(true);
});
