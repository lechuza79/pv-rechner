import type {Metadata} from 'next';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import {StrommixRadarEmbed} from '../../../../components/energy/StrommixRadarWidget';
import {parseWidgetAppearance,widgetVariantFromQuery} from '../../../../lib/widget-appearance';

export const metadata:Metadata={title:'Strommix Radar — Solar Check Widget',robots:{index:false,follow:false}};
export default async function StrommixRadarPage({searchParams}:{searchParams:Promise<Record<string,string>>}){
 const query=await searchParams;
 const appearance=parseWidgetAppearance(query);
 return <WidgetPresentation widgetId="strommix-radar" variant={widgetVariantFromQuery('strommix-radar',new URLSearchParams(query))} appearance={{...appearance,theme:appearance.theme??'light'}}><StrommixRadarEmbed query={query}/></WidgetPresentation>;
}
