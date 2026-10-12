import type {Metadata} from 'next';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import WorldElectricityRaceWidget from '../../../../components/energy/WorldElectricityRaceWidget';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
export const metadata:Metadata={title:'Wind + Solar vs. Atomkraft weltweit — Solar Check',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}) {
 const query=await searchParams,appearance=parseWidgetAppearance(query);
 return <WidgetPresentation widgetId="welt-stromrennen" appearance={{...appearance,theme:appearance.theme??'light'}}><WorldElectricityRaceWidget onsite={query.onsite==='1'}/></WidgetPresentation>;
}
