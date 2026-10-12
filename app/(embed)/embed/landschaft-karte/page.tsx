import {notFound} from 'next/navigation';
import LandscapeCardWidget from '../../../../components/landscape/LandscapeCardWidget';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import {landscapePlaces} from '../../../../lib/landscape-places';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const query=await searchParams,ags=query.ags??'03458009';if(!Object.hasOwn(landscapePlaces,ags))notFound();
 return <WidgetPresentation widgetId="landschaft-karte" appearance={parseWidgetAppearance(query)}><LandscapeCardWidget placeId={ags} initialStop={query.stop}/></WidgetPresentation>;
}
