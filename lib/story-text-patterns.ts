import {formatStoryValue} from './story-format';
import {fuelle,pruefeVorlage} from './social-vorlage';
import type {StoryConcept} from './story-konzepte';
/** One reusable text pattern per finding family; values remain supplied by the finding. */
export const DEFAULT_STORY_TEXT='{ort}: {titel}\n\n{werte}\n\n{vergleich}\n\n{einordnung}\n\n{quelle}';
export function storyTextValues(story:StoryConcept):Record<string,string>{return {
 ort:story.town,titel:story.title,
 werte:story.kind==='yield' ? story.teaser : story.values.map(v=>`${v.label}: ${formatStoryValue(v.value)} ${v.unit??story.unit}`).join(' · '),
 vergleich:story.comparisonLabel??'',einordnung:story.marginalia?.[0]??story.copy.map(p=>p.text).join('\n\n'),quelle:story.sourceCaption??'',
};}
export function renderStoryText(story:StoryConcept,template=DEFAULT_STORY_TEXT):string{
 const values=storyTextValues(story),check=pruefeVorlage(template,values);
 if(check.unbekannt.length)throw new Error('Unbekannte Platzhalter: '+check.unbekannt.join(', '));
 return fuelle(template,values).replace(/\n{3,}/g,'\n\n').trim();
}
