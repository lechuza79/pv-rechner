import {it,expect} from 'vitest';
import {addEnergyStory} from '../story-energy-discovery';
import {erzeugungKwh} from '../atlas-impact';
import {discoverStories} from '../story-discovery';
it('uses the existing Atlas model and labels its value as a model year',()=>{const rows=[{region_id:'07211000',segment:'gebaeude',month:'2020-01',count:10,kwp:100}];const r=discoverStories({name:'Trier',regionId:'07211000',source:'export',sourceDate:'2026-09-10',completeExport:true,rows});addEnergyStory(r,rows);const c=r.candidates.find(c=>c.family==='Jahresertrag als Modell')!;expect(c.evidence[1].value).toBe(erzeugungKwh(100,'07211000')/1000);expect(c.evidence[1].unit).toBe('MWh/Jahr');expect(c.limitations[0]).toContain('keine gemessene');});
