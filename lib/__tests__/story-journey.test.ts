import {describe,it,expect} from 'vitest';
import {roofStory,CITY_STORY_SETS} from '../story-city-sets';
describe('Reusable annual building story',()=>{
 it('keeps every prepared Trier story in the gallery with all formats',()=>{const stories=CITY_STORY_SETS.Trier;expect(stories.length).toBeGreaterThan(3);expect(new Set(stories.map(s=>s.id)).size).toBe(stories.length);for(const s of stories){expect(s.social.length).toBeGreaterThan(100);expect(s.copy.length).toBeGreaterThan(0);expect(s.values.every(v=>Number.isFinite(v.value))).toBe(true);expect(s.comparisonLabel).toBeTruthy();}});
 it('uses the preceding year, not the peak, for its headline comparison',()=>{const s=CITY_STORY_SETS.Trier.find(s=>s.id==='Trier-gebaeude')!;expect(s.title).toContain('37 % weniger');expect(s.teaser).toContain('282');expect(s.teaser).toContain('446');expect(s.values.find(v=>v.label==='2023')?.value).toBe(508);});
 it('changes direction and peak text with a different municipality',()=>{const s=roofStory('Testort',[{label:'2023',value:100},{label:'2024',value:50},{label:'2025',value:150}]);expect(s.title).toContain('200 % mehr');expect(s.copy[0].text).toContain('2025 mit 150');expect(s.social).not.toContain('schrumpft');expect(s.copy[1].text).toContain('stärkeren');});
});
