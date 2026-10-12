import {ladeGemeindePaket} from '../../../../lib/gemeinde-paket-server';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import StorySingleWidget from '../../../../components/dashboard/StorySingleWidget';
import {selectWidgetStory,storyWidgetTemplates} from '../../../../lib/story-widget-selection';
import StoryWidget from '../../../../components/dashboard/StoryWidget';
import type {ComponentProps} from 'react';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const query=await searchParams,ags=query.ags??'06440016';
 if(!/^\d{8}$/.test(ags))return <p>Keine gültige Gemeinde angegeben.</p>;
 const paket=await ladeGemeindePaket(ags);
 const stories=(paket?.stories??[]) as ComponentProps<typeof StoryWidget>['stories'];
 if(query.view==='single'){
  if(query.template&&!storyWidgetTemplates.some(template=>template.id===query.template))return <p role="alert">Diese Storyvariante ist nicht verfügbar.</p>;
  const story=selectWidgetStory(stories,query.template,query.story);
  return <WidgetPresentation widgetId="gemeinde-meldung" appearance={parseWidgetAppearance(query)}>{story?<StorySingleWidget story={story} ags={ags} query={query}/>:<p role="status">Für diesen Ort und diese Auswahl liegt keine veröffentlichte Story vor.</p>}</WidgetPresentation>;
 }
 return <WidgetPresentation widgetId="gemeinde-meldung" appearance={parseWidgetAppearance(query)}>{paket&&stories.length?<StoryWidget stories={stories} name={paket.name}/>:<p>Für diesen Ort liegen noch keine veröffentlichten Storys vor.</p>}</WidgetPresentation>;
}
