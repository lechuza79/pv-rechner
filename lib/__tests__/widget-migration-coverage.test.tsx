import React from 'react';
import homepageStories from '../../scripts/homepage-stories/approved-stories.json';
import type {StoryConcept} from '../story-konzepte';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {MunicipalWidgetVisual} from '../../components/dashboard/MunicipalWidgetVisual';
import {EditorialStoryVisual} from '../../components/social/EditorialStoryVisual';
import {STORY_CONCEPTS} from '../story-konzepte';
import {storyWidgetTemplates,selectWidgetStory} from '../story-widget-selection';
import {storyVisualTemplate} from '../story-approved-visual';
import {conceptFromFinding} from '../story-finding-concept';
import {buildStoryPool} from '../story-pool';
import {appendAnnualEnergy,appendMonthlySolar} from '../story-monthly-candidate';
import {appendRankingMonth,type RankMonthSnapshot} from '../story-ranking-month';
import reports from '../story-discovery-reports.json';
import ranks from '../story-ranking-month-data.json';
import type {DiscoveryReport} from '../story-discovery';
import KostenrennenMini from '../../components/charts/KostenrennenMini';
import KostenrennenEmbed from '../../app/(embed)/embed/pv-kostenrennen/client';
import {WidgetPresentationProvider} from '../../components/dashboard/WidgetPresentationContext';
import {widgetPresentationSource,widgetVariantFromQuery} from '../widget-appearance';
import OldTrafficLight from '../../app/(embed)/embed/ee-ampel/client';
import TrafficLight from '../../components/energy/EeAmpelWidget';
import OldMetric from '../../app/(embed)/embed/kennzahl/client';
import Metric from '../../components/energy/MastrMetricWidget';
import OldFunding from '../../app/(embed)/embed/foerder-check/client';
import Funding from '../../components/energy/FundingCheckWidget';
import OldTariff from '../../app/(site)/einspeiseverguetung-tabelle/VerlaufMitMeilensteinen';
import Tariff from '../../components/charts/FeedInTimelineWidget';
import {verlaufJahre as oldYears} from '../../app/(site)/einspeiseverguetung-tabelle/VerlaufsChart';
import {verlaufJahre} from '../feedin-timeline';

const stories=(reports as DiscoveryReport[]).flatMap(source=>{
 const report=structuredClone(source);
 appendMonthlySolar(report);appendAnnualEnergy(report);
 const rank=(ranks as Record<string,{current:RankMonthSnapshot;previous?:RankMonthSnapshot}>)[report.regionId];
 if(rank)appendRankingMonth(report,rank.current,rank.previous);
 return buildStoryPool(report).topics.flatMap(topic=>topic.observations.map((_,index)=>conceptFromFinding(report,topic,index)));
});

describe('remaining widget migration',()=>{
 it('exposes the existing mini race without changing the full race or its source',()=>{
  const source='/embed/pv-kostenrennen?theme=dark&autoplay=off';
  const hero=widgetPresentationSource('pv-kostenrennen',source,'hero');
  expect(widgetVariantFromQuery('pv-kostenrennen',new URL(hero,'https://solar-check.io').searchParams)).toBe('hero');
  expect(widgetPresentationSource('pv-kostenrennen',hero,'full')).toBe(source);
  const render=(child:React.ReactNode)=>renderToStaticMarkup(<WidgetPresentationProvider appearance={{autoplay:false}}>{child}</WidgetPresentationProvider>);
  const previous=render(<KostenrennenMini/>),preview=render(<KostenrennenEmbed preview/>),full=render(<KostenrennenEmbed/>);
  const svg=(html:string)=>html.match(/<svg[\s\S]*?<\/svg>/)?.[0];
  expect(svg(preview)).toBe(svg(previous));
  expect(preview).not.toContain('<article');expect(full).toContain('<article');
 });
 it('renders all preserved homepage story snapshots through the shared body',()=>{
  expect(homepageStories).toHaveLength(33);
  for(const {story} of homepageStories){
   expect(storyVisualTemplate(story as StoryConcept),story.id).toBeTruthy();
   for(const detail of ['full','reduced'] as const){
    const html=renderToStaticMarkup(<MunicipalWidgetVisual story={story as StoryConcept} view={{detail,controls:false}}/>);
    expect(html,story.id).not.toBe('');expect(html).not.toMatch(/NaN|Infinity/);
   }
  }
 });
 it('keeps old entry points on the exact shared implementation',()=>{
  expect(OldTrafficLight).toBe(TrafficLight);expect(OldMetric).toBe(Metric);
  expect(OldFunding).toBe(Funding);expect(OldTariff).toBe(Tariff);expect(oldYears).toBe(verlaufJahre);
 });
 it('renders every active story template in full and reduced detail from real existing report data',()=>{
  for(const template of storyWidgetTemplates){
   const story=selectWidgetStory(stories,template.id);
   expect(story,`Missing coverage: ${template.id}`).toBeDefined();
   for(const detail of ['full','reduced'] as const){
    const html=renderToStaticMarkup(<MunicipalWidgetVisual story={story!} view={{detail,controls:false}}/>);
    expect(html,`${template.id}/${detail}`).not.toBe('');
    expect(html).not.toMatch(/NaN|Infinity/);
   }
  }
 });
 it('preserves draft graphics without silently publishing their examples',()=>{
  const drafts=STORY_CONCEPTS.filter(story=>!storyVisualTemplate(story));
  expect(drafts.length).toBeGreaterThan(0);
  for(const story of drafts){
   expect(selectWidgetStory([story])).toBeUndefined();
   expect(renderToStaticMarkup(<MunicipalWidgetVisual story={story}/>)).toBe('');
   for(const compact of [false,true])expect(renderToStaticMarkup(<MunicipalWidgetVisual story={story} view={{detail:compact?'reduced':'full',editorialDraft:true}}/>)).toBe(renderToStaticMarkup(<EditorialStoryVisual story={story} compact={compact}/>));
  }
 });
});
