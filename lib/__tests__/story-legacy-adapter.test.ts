import { describe, expect, it } from 'vitest';
import type { Fund } from '../social-funde';
import { adaptLegacyFund, addLegacyFindings, type LegacyFindingProvenance } from '../story-legacy-adapter';
import { buildStoryPool } from '../story-pool';
import type { DiscoveryReport } from '../story-discovery';
const fund: Fund = { kennung:'g10-anomalie-trier-2025-05',muster:'anomalie',kategorie:'g10',satz:'Im Mai wurden 29 Einheiten in Betrieb genommen.',staerke:2,werte:[{name:'Mai 2025',wert:29,einheit:'anzahl'},{name:'Vergleichsmedian',wert:10,einheit:'anzahl'}],grundlage:'Mai 2025 gegenüber anderen nicht überlappenden Monaten der benannten Reihe.',orte:['Trier'] };
const provenance: LegacyFindingProvenance = { kind:'recomputed',sourceDate:'2026-09-10',source:'Amtlicher Registerexport',inputVersion:'2026-09-10-parser-2',regionIds:['07211000'],period:{start:'2025-05-01',end:'2025-05-31',label:'Mai 2025'},units:{anzahl:'Anlagen'} };
const context={regionId:'07211000',sourceDate:'2026-09-10',provenance};
const report=():DiscoveryReport=>({version:'v4',name:'Trier',regionId:'07211000',sourceDate:'2026-09-10',source:'Register',candidates:[],checks:[],warnings:[],scannedRows:0,merged:0});
describe('original finder bridge',()=>{
 it('does not treat an old inventory write time as a source date',()=>{
  const result=adaptLegacyFund({...fund,...{zuletzt_gesehen:'2026-09-10'}},{regionId:'07211000',sourceDate:'2026-09-10'});
  expect(result.status).toBe('unavailable');
 });
 it('retains original facts, period and units only after a source-backed rerun',()=>{
  const result=adaptLegacyFund(fund,context);
  expect(result.status).toBe('ready');
  if(result.status!=='ready')throw new Error('Expected ready');
  expect(result.candidate.title).toBe(fund.satz);
  expect(result.candidate.comparison).toBe(fund.grundlage);
  expect(result.candidate.period).toBe('Mai 2025');
  expect(result.candidate.evidence[0]).toEqual({label:'Mai 2025',value:29,unit:'Anlagen'});
 });
 it('rejects stale inputs, unresolved homonyms, unknown units and impossible dates',()=>{
  for(const broken of [{sourceDate:'2026-08-10'},{regionIds:['12345678']},{units:{}},{period:{...provenance.period,start:'2025-02-30'}}]) {
   expect(adaptLegacyFund(fund,{...context,provenance:{...provenance,...broken}}).status).toBe('unavailable');
  }
 });
 it('does not upgrade rank contrasts without evidence or misclassified roof cohorts',()=>{
  expect(adaptLegacyFund({...fund,muster:'umkehrung',werte:[]},context).status).toBe('unavailable');
  expect(adaptLegacyFund({...fund,muster:'kohorte'},context).status).toBe('unavailable');
 });
 it('adds no editorial review tickets and remains idempotent',()=>{
  const r=report();
  const result=addLegacyFindings(r,[{fund,provenance},{fund,provenance},{fund:{...fund,kennung:'stale'}}]);
  expect(result.accepted).toBe(1);
  expect(result.unavailable).toHaveLength(1);
  expect(r.candidates).toHaveLength(1);
  expect(r.candidates.some(c=>c.status==='review')).toBe(false);
  const pool=buildStoryPool(r);
  expect(pool.observationCount).toBe(1);
  expect(pool.unmappedFamilies).toEqual([]);
  expect(pool.topics[0].timeAspects).toEqual(['retrospective']);
 });
});
