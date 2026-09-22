import {describe,it,expect} from 'vitest';
import {prepareOriginalPatterns} from '../../scripts/story-original-patterns';
import {discoverStories,type SolarRow} from '../story-discovery';
const regions=Array.from({length:30},(_,i)=>({region_id:String(10000000+i),name:`Ort ${i}`,population:10000+i*10,population_as_of:'2026-06-30'}));
const sourceDate='2026-09-10';
const rows:SolarRow[]=regions.flatMap((t,i)=>[{region_id:t.region_id,segment:'steckersolar',month:'2020-01',count:i===0?1000:100,kwp:i===0?1000:100},{region_id:t.region_id,segment:'steckersolar',month:'2025-01',count:i===0?5:20,kwp:i===0?5:20}]);
const report=(id=regions[0].region_id)=>discoverStories({name:regions.find(r=>r.region_id===id)!.name,regionId:id,sourceDate,source:'test',completeExport:true,rows:rows.filter(r=>r.region_id===id)});
describe('Original pattern source replay',()=>{
 it('accounts for all thirteen families without calling missing energy/funding data zero',()=>{const r=report();const coverage=prepareOriginalPatterns({regions,rows,sourceDate})(r);expect(coverage).toHaveLength(13);for(const key of ['saison','foerderluecke','heizungsfoerderung'])expect(coverage.find(c=>c.pattern===key)?.status).toBe('missing');expect(r.candidates.some(c=>c.family==='Originalmuster: ausreisser')).toBe(true);});
 it('uses identical cohort members for rank reversal and preserves the low-tempo direction',()=>{const r=report();prepareOriginalPatterns({regions,rows,sourceDate})(r);const c=r.candidates.find(c=>c.family==='Originalmuster: aufholer');expect(c?.title).toContain('stärker beim Balkonbestand');expect(c?.comparison).toContain('Identische 30');});
 it('does not assign national defaults to an absent population edition',()=>{const r=report();const coverage=prepareOriginalPatterns({regions:regions.map(r=>({...r,population_as_of:undefined})),rows,sourceDate})(r);expect(coverage.find(c=>c.pattern==='ausreisser')?.status).toBe('missing');expect(r.candidates.filter(c=>c.family.startsWith('Originalmuster:'))).toEqual([]);});
 it('replays deterministically without duplicate candidates',()=>{const r=report();const add=prepareOriginalPatterns({regions,rows,sourceDate});add(r);const ids=r.candidates.map(c=>c.id);add(r);expect(r.candidates.map(c=>c.id)).toEqual(ids);});
});

it('rejects source rows that would bypass the primary validation',()=>{
 const r=report();const bad=rows.map((v,i)=>i===0?{...v,kwp:-1}:v);const coverage=prepareOriginalPatterns({regions,rows:bad,sourceDate})(r);
 expect(r.candidates.some(c=>c.family.startsWith('Originalmuster:'))).toBe(false);expect(coverage.every(c=>c.status==='missing')).toBe(true);
});
