import NuclearDailyWidget from '../../../../components/energy/NuclearDailyWidget';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
import {nuclearPreviewData,nuclearEnergyPreviewData} from '../../../../lib/nuclear-preview-server';
export const revalidate=600;
export const metadata={title:'Atomstrom-Import · Tageswerte',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}) {
 const params=await searchParams;
 const now=new Date();
 const energy=params.metric==='energy';
 const data=await (energy?nuclearEnergyPreviewData(now):nuclearPreviewData(now));
 return <WidgetPresentation appearance={parseWidgetAppearance(params)}><NuclearDailyWidget data={data} variant={params.variant==='full'?'full':'teaser'} {...(params.metric==='energy'?{metric:'energy' as const,asOf:now.toISOString()}:{metric:'power' as const})}/></WidgetPresentation>;
}
