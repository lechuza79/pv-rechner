import type {StoryConcept} from './story-konzepte';
import {STORY_VISUAL_TEMPLATES,storyVisualTemplate} from './story-approved-visual';

/** The existing renderer has no branch producing the retired outline template. */
export const storyWidgetTemplates=STORY_VISUAL_TEMPLATES.filter(template=>template.id!=='umriss');
/** Never substitute a different story when an explicitly shared snapshot is absent. */
export function selectWidgetStory(stories:StoryConcept[],template?:string,storyId?:string):StoryConcept|undefined {
 const matching=stories.filter(story=>{
  const visual=storyVisualTemplate(story);
  return storyWidgetTemplates.some(candidate=>candidate.id===visual)&&(!template||visual===template);
 });
 return storyId?matching.find(story=>story.id===storyId):matching[0];
}
