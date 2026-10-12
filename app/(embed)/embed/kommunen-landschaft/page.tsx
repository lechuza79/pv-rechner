import {notFound} from 'next/navigation';
import LandscapeWidget from '../../../../components/landscape/LandscapeWidget';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import {landscapePlaces} from '../../../../lib/landscape-places';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const query=await searchParams,ags=query.ags??'03458009';if(!Object.hasOwn(landscapePlaces,ags))notFound();
 return <WidgetPresentation widgetId="kommunen-landschaft" appearance={parseWidgetAppearance(query)}><LandscapeWidget placeId={ags} hero={query.presentation==='hero'} initialStop={query.stop}/></WidgetPresentation>;
}
