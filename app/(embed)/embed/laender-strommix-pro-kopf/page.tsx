import type {Metadata} from 'next';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import CountryElectricityMixRaceWidget from '../../../../components/energy/CountryElectricityMixRaceWidget';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
export const metadata:Metadata={title:'Stromerzeugung pro Kopf — Solar Check',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}) {
 const query=await searchParams,appearance=parseWidgetAppearance(query);
 return <WidgetPresentation widgetId="laender-strommix-pro-kopf" appearance={{...appearance,theme:appearance.theme??'dark'}}><CountryElectricityMixRaceWidget metric="per-capita" onsite={query.onsite==='1'}/></WidgetPresentation>;
}
