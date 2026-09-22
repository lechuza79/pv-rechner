import {it,expect} from 'vitest';
import {appendRankingMonth,rankingMonthRows,rankingDistinction,rankingHighlight,rankingHighlights,type RankMonthSnapshot} from '../story-ranking-month';
import {discoverStories} from '../story-discovery';
import {buildStoryPool} from '../story-pool';
import {conceptFromFinding} from '../story-finding-concept';
import {storyVisualTemplate} from '../story-approved-visual';
const snapshot=(month:string,ranks:number[]):RankMonthSnapshot=>({month,observedAt:`${month}-16T12:00:00Z`,ranks:ranks.map((rank,index)=>({key:String(index),label:`Metric ${index}`,scope:'Deutschland',rank,size:30,value:100,cohort:'same-members',rules:'same-method'}))});
const report=()=>discoverStories({name:'Test',regionId:'12345678',source:'export',sourceDate:'2026-09-10',completeExport:true,rows:[]});
it('combines rises, falls, retained ranks and first place into one monthly story',()=>{
 const r=report();appendRankingMonth(r,snapshot('2026-09',[1,8,4]),snapshot('2026-08',[3,6,4]));expect(r.candidates).toHaveLength(1);expect(r.candidates[0].rankSummary?.map(row=>row.state)).toEqual(['up','down','held']);expect(r.candidates[0].title).toContain('Platz 1');expect(storyVisualTemplate(conceptFromFinding(r,buildStoryPool(r).topics[0]))).toBe('rank-month');
});
it('initial and same-month observations never imply retained places',()=>{
 for(const previous of [undefined,snapshot('2026-09',[4]),snapshot('2026-07',[4])])expect(rankingMonthRows(snapshot('2026-09',[4]),previous)[0].state).toBe('initial');
});
it('keeps one story per month on reruns and preserves prior monthly stories',()=>{
 const r=report();appendRankingMonth(r,snapshot('2026-08',[2]));appendRankingMonth(r,snapshot('2026-09',[2]),snapshot('2026-08',[2]));appendRankingMonth(r,snapshot('2026-09',[3]),snapshot('2026-08',[2]));expect(r.candidates).toHaveLength(2);expect(r.candidates[1].rankSummary?.[0].delta).toBe(-1);
});
it('does not invent movement when comparison membership or rules change',()=>{
 const current=snapshot('2026-09',[1,2]),before=snapshot('2026-08',[4,2]);current.ranks[0].cohort='new-members';current.ranks[1].rules='new-method';expect(rankingMonthRows(current,before).map(row=>row.state)).toEqual(['changed-basis','changed-basis']);
});
it('compares December to January and accepts retained first place',()=>{
 expect(rankingMonthRows(snapshot('2027-01',[1]),snapshot('2026-12',[1]))[0]).toMatchObject({state:'held',rank:1,delta:0});
});

it('evaluates distinction relative to the full comparison group',()=>{
 expect(rankingDistinction(3,5)).toBeNull();
 expect(rankingDistinction(1,5)).toBe('Platz 1');
 expect(rankingDistinction(94,10000)).toBe('Top 100');
 expect(rankingDistinction(94,100)).toBeNull();
 expect(rankingDistinction(10,99)).toBeNull();
 expect(rankingDistinction(10,100)).toBe('Top 10');
 expect(rankingDistinction(1,2)).toBeNull();
});
it('retains exits from distinction and detects entries without inventing first entries',()=>{
 const c=snapshot('2026-09',[2,1,1,20]);const p=snapshot('2026-08',[1,2,1,21]);
 const rows=rankingMonthRows(c,p);
 expect(rankingHighlight(rows[0])).toContain('zuvor Platz 1');
 expect(rankingHighlight(rows[1])).toBe('Neu: Platz 1');
 expect(rankingHighlight(rows[2])).toBe('Platz 1 gehalten');
 expect(rankingHighlight(rows[3])).toBeNull();
 const small=rankingMonthRows({...c,ranks:c.ranks.map(r=>({...r,size:5})).slice(0,1)},{...p,ranks:p.ranks.map(r=>({...r,size:5})).slice(0,1)});
 expect(rankingHighlight(small[0])).toBe('Platz 1 verlassen');
 expect(rankingHighlight(rankingMonthRows(snapshot('2026-09',[1]))[0])).toBe('Platz 1');
});
it('keeps all ranks for navigation but does not manufacture a story without a distinction',()=>{
 const r=report();appendRankingMonth(r,snapshot('2026-09',[20,25]));expect(r.candidates).toHaveLength(0);expect(r.rankMonth?.ranks).toHaveLength(2);
 expect(rankingHighlights(rankingMonthRows(snapshot('2026-09',[1,2,20])))).toHaveLength(2);
});
