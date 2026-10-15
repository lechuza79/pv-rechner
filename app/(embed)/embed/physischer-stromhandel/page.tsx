import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import {PhysicalTradeWidget} from '../../../../components/energy/ElectricityFlowWidgets';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
export const metadata={title:'Physischer Stromhandel — Solar Check Widget',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}){
 const query=await searchParams;
 return <WidgetPresentation widgetId="physischer-stromhandel" appearance={parseWidgetAppearance(query)}><PhysicalTradeWidget/></WidgetPresentation>;
}
