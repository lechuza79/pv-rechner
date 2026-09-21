import test from 'node:test';
import assert from 'node:assert/strict';
import {compareRanks, comparisonText, comparisonMonth} from './rank-comparison.mjs';
const row={key:'storage',rank:13,size:500,value:42,cohort:'same towns',rules:'same calculation'};
const current={month:'2026-09',ranks:[row]};
const edition=(month,change={})=>({month,ranks:[{...row,...change}]});
test('month and year comparisons retain their own reference ranks',()=>{
 const [result]=compareRanks(current,[edition('2026-08',{rank:18}),edition('2025-09',{rank:9})]);
 assert.equal(result.comparisons.month.delta,5);
 assert.equal(result.comparisons.year.delta,-4);
 assert.match(comparisonText(result,'month'),/Vormonat aufgestiegen/);
 assert.match(comparisonText(result,'year'),/Vorjahres zurückgefallen/);
});
test('missing editions do not become zero change or use a nearby month',()=>{
 const [result]=compareRanks(current,[edition('2026-07')]);
 assert.equal(comparisonText(result,'month'),null);
 assert.equal(result.comparisons.year.status,'missing');
});
test('changed population group or calculation cannot produce an ascent',()=>{
 for(const change of [{cohort:'other towns'},{rules:'new calculation'},{size:501}]){
  const [result]=compareRanks(current,[edition('2026-08',change)]);
  assert.equal(result.comparisons.month.status,'changed-basis');
  assert.equal(comparisonText(result,'month'),null);
 }
});
test('year rollover and held positions are explicit',()=>{
 assert.equal(comparisonMonth('2026-01',0,1),'2025-12');
 const [result]=compareRanks(current,[edition('2026-08')]);
 assert.match(comparisonText(result,'month'),/gehalten/);
});
