'use client';
import type {StoryConcept} from '../../lib/story-konzepte';
import {WIDGETS} from '../../lib/widget-registry';
import {storyVisualTemplateDef,storyVisualTemplate} from '../../lib/story-approved-visual';
import {MunicipalWidgetVisual} from './MunicipalWidgetVisual';
import {storyWidgetDefinition} from '../../lib/story-widget-definition';
import {useWidgetHost} from './WidgetHost';
import {ExportableWidgetFrame} from './ExportableWidgetFrame';
import {useWidgetPresentation} from './WidgetPresentationContext';
import chart from '../social/StoryConceptLab.module.css';

/** Adapt an existing story visual; geometry and interactions stay with its renderer. */
export default function StorySingleWidget({story,ags,query:initialQuery={}}:{story:StoryConcept;ags:string;query?:Record<string,string|undefined>}) {
 const appearance=useWidgetPresentation();
 const template=storyVisualTemplate(story)!;
 const title=storyVisualTemplateDef(template)?.name??'Geschichte vor Ort';
 const widget={...storyWidgetDefinition(story),id:WIDGETS.gemeindeMeldung.id,title};
 const sources=widget.sources;
 const query=useWidgetHost()?.query??initialQuery;
 const params={ags,template,story:story.id,view:'single',...(query.presentation?{presentation:query.presentation}:{}),...(query.detail?{detail:query.detail}:{}),...(query.switchable?{switchable:query.switchable}:{})};
 return <ExportableWidgetFrame widget={widget} title={title} kind="composition" place={story.town} stand={story.sourceDate??''} stateLabel={story.period} exportUnit={story.unit} filename={`story-${story.id}`} shareParams={params} einbetten={{params,height:640}} help={<><p>{story.teaser}</p>{sources.map(source=><p key={source.name}>{source.url?<a href={source.url}>{source.name}</a>:source.name}</p>)}</>} helpExportNote={false}>
  <div className={chart.visualTheme} style={{background:'transparent'}} data-story-scheme={appearance.theme==='hero'?'highlight':appearance.theme??'dark'}><MunicipalWidgetVisual story={story} view={{detail:query?.detail==='reduced'?'reduced':'full',controls:query?.switchable!=='0',autoplay:appearance.autoplay!==false}}/></div>
 </ExportableWidgetFrame>;
}
