import type {Metadata} from 'next';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import ElectricityTradeWidget from '../../../../components/energy/ElectricityTradeWidget';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
import {tradeDate} from '../../../../lib/electricity-trade';
export const metadata:Metadata={title:'Stromimport und Stromexport — Solar Check',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}){
 const query=await searchParams;
 const presentation=query.presentation==='hero'?'hero':query.presentation==='compact'?'compact':'full';
 return <WidgetPresentation widgetId="stromhandel" variant={presentation} appearance={parseWidgetAppearance(query)}><ElectricityTradeWidget presentation={presentation} onsite={query.onsite==='1'} period={query.period==='month'?'month':query.period==='seven'?'seven':'year'} year={/^20\d{2}$/.test(query.year??'')?query.year:undefined} month={/^(0[1-9]|1[0-2])$/.test(query.month??'')?query.month:undefined} mode="energy" variant={query.variant==='totals'?'totals':query.variant==='bars'?'bars':query.variant==='radial'?'radial':'auto'} today={tradeDate(Date.now())}/></WidgetPresentation>;
}
