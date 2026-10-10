import type {Metadata} from 'next';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import CountryElectricityMixRaceWidget from '../../../../components/energy/CountryElectricityMixRaceWidget';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
export const metadata:Metadata={title:'Strommix im Ländervergleich — Solar Check',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}) {
 const query=await searchParams,appearance=parseWidgetAppearance(query);
 return <WidgetPresentation widgetId="laender-strommixrennen" appearance={{...appearance,theme:appearance.theme??'dark'}}><CountryElectricityMixRaceWidget metric={query.metric==='per-capita'?'per-capita':'share'} onsite={query.onsite==='1'}/></WidgetPresentation>;
}
