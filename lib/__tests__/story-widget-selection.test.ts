import {expect,it} from 'vitest';
import {selectWidgetStory,storyWidgetTemplates} from '../story-widget-selection';
import {storyVisualTemplate} from '../story-approved-visual';
import {conceptFromFinding} from '../story-finding-concept';
import {buildStoryPool} from '../story-pool';
import reports from '../story-discovery-reports.json';
import type {DiscoveryReport} from '../story-discovery';

const stories=(reports as DiscoveryReport[]).flatMap(report=>buildStoryPool(report).topics.flatMap(topic=>topic.observations.map((_,index)=>conceptFromFinding(report,topic,index))));

it('selects original story data for every available registered template',()=>{
 for(const template of storyWidgetTemplates){
  const candidates=stories.filter(story=>storyVisualTemplate(story)===template.id);
  expect(selectWidgetStory(stories,template.id)).toBe(candidates[0]);
  for(const story of candidates.slice(0,3))expect(selectWidgetStory([story],template.id,story.id)).toBe(story);
 }
 expect(storyWidgetTemplates.some(template=>template.id==='umriss')).toBe(false);
});

it('never replaces a shared missing story or mismatched template with another snapshot',()=>{
 const story=stories.find(story=>storyVisualTemplate(story))!;
 const template=storyVisualTemplate(story)!;
 expect(selectWidgetStory([story],template,'missing-story')).toBeUndefined();
 expect(selectWidgetStory([story],'not-a-template',story.id)).toBeUndefined();
 expect(selectWidgetStory([],template)).toBeUndefined();
});
