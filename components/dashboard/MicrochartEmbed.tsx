import {notFound} from 'next/navigation';
import {galleryPlace} from '../../lib/widget-gallery-place';
import {loadMicrocharts} from '../../lib/microchart-server';
import {parseWidgetAppearance} from '../../lib/widget-appearance';
import {WeatherMicroTile} from '../charts/WeatherMicroTile';
import WidgetPresentation from './WidgetPresentation';
/** Thin adapters reuse the finished compact tiles and their modelled values. */
export default async function MicrochartEmbed({kind,query}:{kind:'solar'|'wind';query:Record<string,string|undefined>}) {
 const place=await galleryPlace(query.ags??'06440016');if(!place)notFound();
 const requestedAt=query.at?new Date(query.at):new Date();
 const now=Number.isFinite(requestedAt.getTime())?requestedAt:new Date();
 const data=await loadMicrocharts(place.ags,place.name,now);
 return <WidgetPresentation appearance={parseWidgetAppearance(query)}>
  {kind==='solar'?<WeatherMicroTile place={data.place} validAt={data.at} kind="solar" chart={{power:true,points:data.solar,currentTime:data.at}}/>:
   <WeatherMicroTile place={data.place} validAt={data.at} day={data.wind} layout="separate" kind="wind" chart={{speedMs:data.conditions?.speedMs??null,directionDeg:data.conditions?.directionDeg??null}}/>}
 </WidgetPresentation>;
}
