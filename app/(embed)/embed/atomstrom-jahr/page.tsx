import {notFound} from 'next/navigation';
import NuclearYearWidget from '../../../../components/energy/NuclearYearWidget';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
import {ARCHIVE_YEARS,getAnnualVariant} from '../../../(site)/atomstrom-import/annual-variant';
export const metadata={title:'Atomstrom-Import · Jahresrückblick',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}) {
 const params=await searchParams;
 const year=Number(params.year??ARCHIVE_YEARS[0]);
 if(!ARCHIVE_YEARS.some(value=>value===year))notFound();
 const view=params.view==='countries'?'countries':params.view==='generation'?'generation':'months';
 return <WidgetPresentation widgetId="atomstrom-jahr" appearance={parseWidgetAppearance(params)}><NuclearYearWidget data={getAnnualVariant(year).annual} view={view} teaser={params.variant==='teaser'&&view==='months'}/></WidgetPresentation>;
}
