import {notFound} from 'next/navigation';
import {galleryPlace} from '../../../lib/widget-gallery-place';
import WidgetGallery from './WidgetGallery';
export const metadata={title:'Widgetgalerie | Solar Check',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{ort?:string}>}) {
  const {ort='06440016'}=await searchParams;
  const place=await galleryPlace(ort);
  if(!place)notFound();
  return <WidgetGallery place={place}/>;
}
