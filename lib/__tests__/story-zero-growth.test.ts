import {it,expect} from 'vitest';
import {discoverStories} from '../story-discovery';
import {approvedStoryVisual} from '../story-approved-visual';
import {conceptFromFinding} from '../story-finding-concept';
import {buildStoryPool} from '../story-pool';
import {appendMonthlySolar,appendAnnualEnergy} from '../story-monthly-candidate';
const report=(years:number[])=>discoverStories({name:'Kiel',regionId:'01002000',sourceDate:'2026-09-10',source:'Test',completeExport:true,rows:years.map(year=>({region_id:'01002000',segment:'freiflaeche',month:year+'-06',count:10,kwp:150}))});
it('does not promote an isolated project followed by zero into an annual decline story',()=>{
 expect(report([2024]).candidates.some(c=>c.family==='Jahresveränderung'&&c.period==='2025')).toBe(false);
 expect(report([2021,2022,2024]).candidates.some(c=>c.family==='Jahresveränderung'&&c.period==='2025')).toBe(false);
});
it('retains a pause after three consecutive active years, without a pair chart',()=>{
 const r=report([2022,2023,2024]);
 const candidate=r.candidates.find(c=>c.family==='Jahresveränderung'&&c.period==='2025');
 expect(candidate?.title).toContain('kein Zubau');
 const topic=buildStoryPool(r).topics.find(t=>t.observations.some(c=>c.id===candidate?.id))!;
 expect(approvedStoryVisual(conceptFromFinding(r,topic,topic.observations.findIndex(c=>c.id===candidate?.id)))).toBeNull();
});
it('binds both Kiel radial stories to Kiel weather and stock, not to the example cities',()=>{
 const r=report([2022,2023,2024]);appendMonthlySolar(r);appendAnnualEnergy(r);
 const concepts=buildStoryPool(r).topics.flatMap(t=>t.observations.map((_,i)=>conceptFromFinding(r,t,i)));
 const monthly=concepts.find(c=>c.solarMonth)!;const annual=concepts.find(c=>c.energyYear)!;
 expect(monthly.solarMonth?.town).toBe('Kiel');expect(monthly.solarMonth?.days).toHaveLength(31);
 expect(monthly.teaser).toContain('Kiel');expect(monthly.teaser).not.toContain('Trier');
 expect(annual.energyYear?.town).toBe('Kiel');expect(annual.energyYear?.days).toHaveLength(365);
 expect(annual.energyYear?.windKw).toBe(75);
 const other={...r,regionId:'00000000',candidates:[]};appendMonthlySolar(other);appendAnnualEnergy(other);expect(other.candidates).toHaveLength(0);
});
