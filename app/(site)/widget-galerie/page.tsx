import {notFound} from 'next/navigation';
import {galleryPlace} from '../../../lib/widget-gallery-place';
import WidgetGallery from './WidgetGallery';
export const metadata={title:'Widgetgalerie | Solar Check',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{ort?:string;gruppe?:string;preset?:string;widget?:string}>}) {
  const {ort='06440016',gruppe,preset,widget}=await searchParams;
  const place=await galleryPlace(ort);
  if(!place)notFound();
  return <WidgetGallery snapshotAt={new Date().toISOString()} place={place} initialFilter={widget==='regional-race'?'comparison':gruppe} racePreset={preset==='kaiserslautern'}/>;
}
