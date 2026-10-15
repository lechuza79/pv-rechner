import type {Metadata} from 'next';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import WorldCapacityRaceWidget from '../../../../components/energy/WorldCapacityRaceWidget';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
export const metadata:Metadata={title:'Zubau weltweit: Wind + Solar vs. Atomkraft — Solar Check',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}) {
 const query=await searchParams,appearance=parseWidgetAppearance(query);
 return <WidgetPresentation widgetId="welt-zubaurennen" appearance={{...appearance,theme:appearance.theme??'dark'}}><WorldCapacityRaceWidget onsite={query.onsite==='1'}/></WidgetPresentation>;
}
