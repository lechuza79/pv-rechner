import {it,expect} from 'vitest';
import {approvedStoryVisual} from '../story-approved-visual';
import {conceptFromFinding} from '../story-finding-concept';
import {buildStoryPool} from '../story-pool';
import reports from '../story-discovery-reports.json';
import type {DiscoveryReport} from '../story-discovery';
it('applies approved forms to real Trier findings without changing their values',()=>{
 const report=reports.find(r=>r.name==='Trier') as DiscoveryReport;
 const concepts=buildStoryPool(report).topics.map(t=>conceptFromFinding(report,t));
 const matches=concepts.map(story=>({story,bild:approvedStoryVisual(story)})).filter(v=>v.bild);
 expect(matches.some(v=>v.bild!.art==='saeule')).toBe(true);
 expect(matches.some(v=>v.bild!.art==='donut')).toBe(true);
 for(const {story,bild} of matches)expect(bild!.serien.map(s=>s.wert)).toEqual(story.values.map(v=>v.value));
 const pair=matches.find(v=>v.bild!.art==='saeule')!.story;
 expect(approvedStoryVisual({...pair,values:[pair.values[0],{...pair.values[1],unit:'different'}]})).toBeNull();
 expect(approvedStoryVisual({...pair,kind:'yield'})).toBeNull();
});

it('uses counts plus power share for every supported installation group, never a naked ring pair',()=>{
 for(const report of reports as DiscoveryReport[])for(const topic of buildStoryPool(report).topics)for(let index=0;index<topic.observations.length;index++){
  const story=conceptFromFinding(report,topic,index);
  if(story.label!=='Anzahl und Leistung')continue;
  expect(story.countComparison,`${report.name}: ${story.title}`).toBeDefined();
  expect(approvedStoryVisual(story)?.countComparison).toEqual(story.countComparison);
  expect(approvedStoryVisual({...story,countComparison:undefined})).toBeNull();
 }
});
it('does not turn historical records or arbitrary older year pairs into finished pair charts',()=>{
 const report=reports.find(r=>r.name==='Trier') as DiscoveryReport;
 for(const topic of buildStoryPool(report).topics)for(let i=0;i<topic.observations.length;i++){
  const story=conceptFromFinding(report,topic,i);
  if(story.label==='Jahreshöchstwert'||(['Jahresveränderung','Speicher-Jahresveränderung'].includes(story.label)&&story.period!==String(Number(report.sourceDate.slice(0,4))-1)))expect(approvedStoryVisual(story)).toBeNull();
 }
});

it('accepts a complete two-part stock mix, but not a single-part decoration',()=>{
 const report=reports.find(r=>r.name==='Trier') as DiscoveryReport;
 const topic=buildStoryPool(report).topics.find(t=>t.observations.some(c=>c.family==='Bestandsprofil'))!;
 const story=conceptFromFinding(report,topic,topic.observations.findIndex(c=>c.family==='Bestandsprofil'));
 expect(approvedStoryVisual({...story,values:story.values.slice(0,2)})?.art).toBe('anteilsdonut');
 expect(approvedStoryVisual({...story,values:story.values.slice(0,1)})).toBeNull();
});
