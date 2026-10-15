import {notFound} from 'next/navigation';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import StateElectricityMap from '../../../../components/StateElectricityMap';
import {stateElectricityGeometry,stateElectricityWater} from '../../../../lib/district-geometry';
import {loadStateElectricity} from '../../../../lib/state-electricity-server';
import {parseWidgetAppearance} from '../../../../lib/widget-appearance';
import {jahrInBerlin} from '../../../../lib/zeit';
export const metadata={title:'Strommix der Bundesländer — Solar Check Widget',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}){
 const query=await searchParams;
 const year=query.jahr===undefined?jahrInBerlin():Number(query.jahr);
 if(!Number.isInteger(year)||year<jahrInBerlin()-2||year>jahrInBerlin())notFound();
 const [shapes,sceneContext,data]=await Promise.all([stateElectricityGeometry(),stateElectricityWater(),loadStateElectricity(year).catch(()=>null)]);
 const selected=shapes.some(shape=>shape.id===query.selected)?query.selected:'';
 return <WidgetPresentation widgetId="state-electricity-map" appearance={{...parseWidgetAppearance(query),theme:'dark'}}><StateElectricityMap standalone initialSelected={selected} initialYear={year} shapes={shapes} sceneContext={sceneContext} initialData={data}/></WidgetPresentation>;
}
