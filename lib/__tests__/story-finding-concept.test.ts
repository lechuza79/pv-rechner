import {readableComparison} from '../story-related';
import {formatStoryDate} from '../story-format';
import {it,expect} from 'vitest';
import {conceptFromFinding} from '../story-finding-concept';
import {buildStoryPool} from '../story-pool';
import reports from '../story-discovery-reports.json';
import type {DiscoveryReport} from '../story-discovery';
it('opens every grouped observation with its own evidence and source period',()=>{
 for(const report of reports as DiscoveryReport[])for(const topic of buildStoryPool(report).topics)topic.observations.forEach((claim,index)=>{
  const preview=conceptFromFinding(report,topic,index);
  expect(preview.id).toBe(claim.id);
  if(claim.family==='Anzahl und Leistung'){expect(preview.title).toContain(claim.title.split(':')[0]);expect(preview.title).toContain('% der Anlagen');expect(preview.title).toContain('% der Solarleistung');}else expect(preview.title).toBe(claim.title);
  expect(preview.values).toEqual(claim.evidence);expect(preview.comparisonLabel).toBe(formatStoryDate(readableComparison(claim.comparison)));
  expect(preview.social).not.toContain('{');
 });
});
it('does not turn mixed units or census whole-and-parts into length comparisons',()=>{
 const report=reports.find(r=>r.name==='Trier') as DiscoveryReport;
 const pool=buildStoryPool(report);
 for(const family of ['Wohnstruktur','Jahresertrag als Modell']){
  const topic=pool.topics.find(t=>t.observations[0].family===family)!;
  const preview=conceptFromFinding(report,topic);
  expect(preview.kind).toBe('facts');
  if(family==='Wohnstruktur'){expect(preview.social).toContain('Zensus');expect(preview.sourceCaption).not.toContain('Marktstammdatenregister');}
 }
});
