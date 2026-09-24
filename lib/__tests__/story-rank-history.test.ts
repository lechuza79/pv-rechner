import {it,expect} from 'vitest';
import {appendRankChange,appendCurrentRank} from '../story-rank-history';
import {discoverStories} from '../story-discovery';
function report(sourceDate:string,rank:number){return {...discoverStories({name:'Test',regionId:'12345678',source:'export',sourceDate,completeExport:true,rows:[]}),ranking:{sourceDate,rank,cohort:'same',metric:'wp',period:'2025',size:30,value:100,populationBasis:'2026-06-30'}};}
it('accepts rises and falls only across comparable recorded editions',()=>{
 for(const rank of [1,8]){const r=report('2026-09-10',rank);appendRankChange(r,report('2026-08-10',4));expect(r.candidates).toHaveLength(1);}
});
it('rejects initial runs, changed groups, changed periods and same-edition reruns',()=>{
 for(const kind of ['initial','group','period','same']){const r=report('2026-09-10',1),p=report('2026-08-10',4);if(kind==='group')p.ranking.cohort='different';if(kind==='period')p.ranking.period='2024';if(kind==='same')p.ranking.sourceDate=r.sourceDate;appendRankChange(r,kind==='initial'?undefined:p);expect(r.candidates).toHaveLength(0);}
});

it('distinguishes rises, falls and retained ranks',()=>{
 for(const [rank,family] of [[1,'Aufsteiger'],[8,'Absteiger'],[4,'Rang gehalten']] as const){const r=report('2026-09-10',rank);appendRankChange(r,report('2026-08-10',4));expect(r.candidates[0].family).toBe(family);appendRankChange(r,report('2026-08-10',4));expect(r.candidates).toHaveLength(1);}
});
it('does not call a first observation a retained rank and keeps current rank idempotent',()=>{
 const r=report('2026-09-10',4);r.ranking.metric='active-solar-commissioning-wp-per-resident-v1';appendCurrentRank(r);appendCurrentRank(r);expect(r.candidates).toHaveLength(1);expect(r.candidates[0].family).toBe('Aktueller Rang');
});
it('rejects changed population basis and invalid ranks',()=>{
 const r=report('2026-09-10',4),p=report('2026-08-10',4);p.ranking.populationBasis='2025-01-01';appendRankChange(r,p);expect(r.candidates).toHaveLength(0);p.ranking.populationBasis=r.ranking.populationBasis;r.ranking.rank=0;appendRankChange(r,p);expect(r.candidates).toHaveLength(0);
});
it('replaces the current position with a comparable dated rank story',()=>{
 const r=report('2026-09-10',2),p=report('2026-08-10',4);r.ranking.metric=p.ranking.metric='active-solar-commissioning-wp-per-resident-v1';appendCurrentRank(r);appendRankChange(r,p);appendCurrentRank(r);expect(r.candidates).toHaveLength(1);expect(r.candidates[0].family).toBe('Aufsteiger');
});

