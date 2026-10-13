import {loadMicrocharts} from '../../../../lib/microchart-server';
import {galleryPlace} from '../../../../lib/widget-gallery-place';
import {WeatherMicroGrid} from '../../../../components/charts/WeatherMicroGrid';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata={title:'Mikrocharts · Vorschau',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{ort?:string}>}){
 const {ort='06440016'}=await searchParams;
 const place=await galleryPlace(ort);if(!place)notFound();
 const data=await loadMicrocharts(place.ags,place.name);
 return <main style={{maxWidth:1000,margin:'0 auto',padding:'32px 24px'}}><a href={`/widget-galerie?ort=${place.ags}&gruppe=microcharts`}>Zur Widgetgalerie</a><h1>Mikrocharts für die Ortskarten</h1><WeatherMicroGrid data={data}/></main>;
}
