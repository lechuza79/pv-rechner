import {describe,it,expect} from 'vitest';
import {appendMonthlySolar,appendAnnualEnergy} from '../story-monthly-candidate';
import type {DiscoveryReport} from '../story-discovery';
import {conceptFromFinding} from '../story-finding-concept';
import {buildStoryPool} from '../story-pool';
const report=()=>({source:'fixture',scannedRows:1,merged:0,version:'test-v1',name:'Testort',regionId:'99999999',sourceDate:'2026-09-10',candidates:[],checks:[],warnings:[],prepared:{sourceDate:'2026-09-10',preparedAt:'2026-09-17',availability:[],values:{'2026-08':{euro:1234,feedInEuro:900,totalMwh:10,unitCount:10,approximateTariffCount:2,unknownModeCount:1,commercialSelfUseUnknownCount:3,privateSelfConsumption:.25,sourceDate:'2026-09-10',valuationDate:'2026-09-17',month:'2026-08',model:'individual-register-unit-v2',assumptionSourceDate:'2026-09-09'}}}} as DiscoveryReport);
describe('prepared municipal story data',()=>{
 it('does not resurrect bundled money when current preparation is missing it',()=>{const r=report();r.regionId='06440016';r.name='Nidda';r.prepared!.values=undefined;appendMonthlySolar(r);expect(r.candidates.filter(c=>c.family.includes('Stromwert')||c.family.includes('Einspeisevergütung'))).toHaveLength(0);});

 it('uses local individual valuation for both figures, without requiring a hard-coded municipality',()=>{const r=report();appendMonthlySolar(r);appendMonthlySolar(r);expect(r.candidates).toHaveLength(2);expect(r.candidates.map(c=>c.evidence[0].value)).toEqual([1234,900]);expect(r.candidates[0].limitations.join(' ')).toContain('25 %');expect(r.candidates[0].limitations.join(' ')).toContain('10 Einzelanlagen');});
 it('does not turn missing weather into zero generation',()=>{const r=report();appendMonthlySolar(r);appendAnnualEnergy(r);expect(r.candidates.some(c=>c.family==='Solar-Monatsrecap'||c.family==='Energie-Jahresprofil')).toBe(false);});
 it('does not describe small remuneration as zero million euros',()=>{const r=report();appendMonthlySolar(r);const pool=buildStoryPool(r);const topic=pool.topics.find(t=>t.observations[0].family==='Einspeisevergütung-Monatsrecap')!;expect(conceptFromFinding(r,topic).teaser).toContain('900 Euro');});
});
