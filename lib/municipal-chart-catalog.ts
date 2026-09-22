import type {DiscoveryReport} from './story-discovery';
import {buildStoryPool} from './story-pool';
import {conceptFromFinding} from './story-finding-concept';
import type {StoryConcept} from './story-konzepte';
import {storyVisualTemplate} from './story-approved-visual';

/** Data refresh and editorial publication are independent. No entry schedules a post. */
export const MUNICIPAL_CHART_POLICY = {
 verlauf:{section:'Zubau',permanent:true,story:'monthly-context'},
 'electricity-value':{section:'Strom und Wert',permanent:true,story:'monthly-context'},
 'feed-in-value':{section:'Strom und Wert',permanent:true,story:'monthly-context'},
 radial:{section:'Strom und Wert',permanent:true,story:'monthly-context'},
 'energy-year':{section:'Strom und Wert',permanent:true,story:'annual-context'},
 anteilsdonut:{section:'Anlagenbestand',permanent:true,story:'structural-change'},
 anlagenraster:{section:'Anlagenbestand',permanent:true,story:'structural-change'},
 saeule:{section:'Zubau',permanent:false,story:'notable-change'},
 yield:{section:'Ertragsvergleich',permanent:false,story:'record'},
 'rank-month':{section:'Rangliste',permanent:false,story:'ranking-highlight'},
 umriss:{section:'Flächenvergleich',permanent:false,story:'requires-suitable-data'},
} as const;
export type MunicipalChartTemplate=keyof typeof MUNICIPAL_CHART_POLICY;

/** One latest available chart per municipality and template; never fabricate missing data. */
export function municipalCharts(stories:StoryConcept[]) {
 const latest=new Map<string,{template:MunicipalChartTemplate;section:string;story:StoryConcept}>();
 for(const story of stories){
  const template=storyVisualTemplate(story) as MunicipalChartTemplate|null;
  if(!template||!MUNICIPAL_CHART_POLICY[template]?.permanent)continue;
  // Separate structure categories: a building-share chart must not displace a ground-mounted chart.
  const category=template==='anlagenraster'?story.countComparison?.label??'':'';
  const key=[story.town,template,category].join(':');
  const previous=latest.get(key);
  const edition=[story.period,story.sourceDate??''].join(':');
  if(!previous||edition>[previous.story.period,previous.story.sourceDate??''].join(':'))latest.set(key,{template,section:MUNICIPAL_CHART_POLICY[template].section,story});
 }
 return [...latest.values()];
}

/** Uses the complete current report, never an editorial shortlist or published editions. */
export function municipalChartsFromReport(report:DiscoveryReport){
 const concepts=buildStoryPool(report).topics.flatMap(topic=>topic.observations.map((_,index)=>conceptFromFinding(report,topic,index)));
 return {regionId:report.regionId,name:report.name,sourceDate:report.sourceDate,charts:municipalCharts(concepts),availability:report.prepared?.availability??[]};
}
