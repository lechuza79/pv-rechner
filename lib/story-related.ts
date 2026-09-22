import type {Candidate} from './story-discovery';
import type {StoryTopic} from './story-pool';

/** Match explicit data segments; sharing a city alone is not a relationship. */
export function storyDataset(claim: Candidate): string | undefined {
  return ['steckersolar','gebaeude','freiflaeche','batterie','sonstige'].find(segment =>
    claim.eventKey.split('-').includes(segment));
}
export function relatedStoryTopics(topics: StoryTopic[], current: Candidate): StoryTopic[] {
  const segment=storyDataset(current);
  if(!segment)return [];
  const seen=new Set<string>([current.family]);
  return topics.filter(topic=>topic.observations.some(claim=>
    claim.status==='ready' && claim.id!==current.id && claim.eventKey!==current.eventKey && storyDataset(claim)===segment))
    .sort((a,b)=>b.observations[0].priority-a.observations[0].priority)
    .filter(topic=>{const family=topic.observations[0].family;if(seen.has(family))return false;seen.add(family);return true;}).slice(0,4);
}
export function readableComparison(text:string):string {
  return text.replace(/Identische Kalendermonate 1–(\d+) in (\d{4}) und (\d{4})/g,(_,month,previous,current)=>{
    const end=new Intl.DateTimeFormat('de-DE',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2000,Number(month)-1,1)));
    const range=Number(month)===1?'Januar':`Januar bis ${end}`;
    return `${range} ${current} im Vergleich zu ${range} ${previous}`;
  });
}
