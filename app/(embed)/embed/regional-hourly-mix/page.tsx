import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import RegionalHourlyMap from '../../../../components/RegionalHourlyMap';
import {stateElectricityGeometry,stateElectricityWater} from '../../../../lib/district-geometry';
import {loadRegionalHourly} from '../../../../lib/co2map-server';
import {CO2_REGIONS} from '../../../../lib/co2map';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
export const metadata={title:'Regionaler Strommix — Solar Check Widget',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}){
 const query=await searchParams;
 const [shapes,sceneContext,data]=await Promise.all([stateElectricityGeometry(),stateElectricityWater(),loadRegionalHourly().catch(()=>null)]);
 const selected=CO2_REGIONS.some(([id])=>id===query.selected)?query.selected:'';
 const time=data?.hours.some(hour=>hour.ts===query.time)?query.time:'latest';
 return <WidgetPresentation widgetId="regional-hourly-mix" appearance={{...parseWidgetAppearance(query),theme:'dark'}}><RegionalHourlyMap standalone initialSelected={selected} initialTime={time} shapes={shapes} sceneContext={sceneContext} initialData={data}/></WidgetPresentation>;
}
