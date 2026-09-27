import {describe,it,expect} from 'vitest';
import {relatedStoryTopics,readableComparison} from '../story-related';
import {buildStoryPool} from '../story-pool';
import reports from '../story-discovery-reports.json';
import type {DiscoveryReport} from '../story-discovery';
describe('related municipal stories',()=>{
 it('finds complementary balcony stories outside the gallery selection',()=>{
  const report=reports.find(r=>r.regionId==='07211000') as DiscoveryReport;
  const claim=report.candidates.find(c=>c.family==='Vorjahreszeitraum'&&c.eventKey.startsWith('steckersolar'))!;
  const result=relatedStoryTopics(buildStoryPool(report).topics,claim);
  expect(result.length).toBeGreaterThan(0);
  expect(result.every(t=>t.observations[0].eventKey.includes('steckersolar'))).toBe(true);
  expect(result.every(t=>t.observations[0].family!==claim.family)).toBe(true);
  expect(new Set(result.map(t=>t.observations[0].family)).size).toBe(result.length);
  expect(relatedStoryTopics([],claim)).toEqual([]);
 });
 it('names the comparison months',()=>{
  expect(readableComparison('Identische Kalendermonate 1–5 in 2025 und 2026')).toBe('Januar bis Mai 2026 im Vergleich zu Januar bis Mai 2025');
 });
});
