import type {StoryConcept} from './story-konzepte';
import {DATA_SOURCES,mitLizenzangaben,type DataSource} from './data-sources';
import {WIDGETS,widgetFuerMeldung,type WidgetDef} from './widget-registry';
import {storyVisualTemplate,storyVisualTemplateDef} from './story-approved-visual';
/** Shared identity and attribution for dashboard, reader and downloaded snapshots. */
export function storyWidgetDefinition(story:StoryConcept):WidgetDef {
 const template=storyVisualTemplateDef(storyVisualTemplate(story));
 const registered=template?.widget?WIDGETS[template.widget]:undefined;
 const verified=registered&&(!template?.exportProvenance||template.exportProvenance(story));
 const sources:DataSource[]=verified?registered.sources:story.sources?.length?story.sources.map(source=>{
  const known=Object.values(DATA_SOURCES).find(candidate=>candidate.url===source.url);
  return known??{name:mitLizenzangaben(source.label),url:source.url};
 }):[{name:mitLizenzangaben(story.sourceCaption??'Marktstammdatenregister · eigene Auswertung')}];
 return {...widgetFuerMeldung(registered??WIDGETS.gemeindeMeldung,story.town,story.title),sources};
}
