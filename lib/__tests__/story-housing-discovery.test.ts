import {it,expect} from 'vitest';
import {addHousingStory} from '../story-housing-discovery';
import {discoverStories} from '../story-discovery';
const report=()=>discoverStories({name:'Test',regionId:'12345678',source:'register',sourceDate:'2026-09-10',completeExport:true,rows:[]});
it('keeps the census date and counts dwellings without claiming unused roofs',()=>{const r=report();addHousingStory(r,{region_id:r.regionId,stichtag:'2022-05-15',wohnungen:1000,w_1:200,w_2:200,w_3_6:200,w_7_12:200,w_13plus:200});expect(r.candidates[0].period).toBe('2022-05-15');expect(r.candidates[0].title).toContain('40 %');expect(r.candidates[0].evidence.every(e=>e.unit==='Wohnungen')).toBe(true);});
it('does not reinterpret missing census coverage as zero dwellings',()=>{const r=report();addHousingStory(r);expect(r.candidates).toHaveLength(0);expect(r.checks.at(-1)?.status).toBe('missing');});
