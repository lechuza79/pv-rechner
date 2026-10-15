import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ChartViewport} from '../../components/charts/ChartViewport';
import {WidgetPresentationProvider} from '../../components/dashboard/WidgetPresentationContext';
vi.mock('@visx/responsive',()=>({ParentSize:({children}:any)=>children({width:420,height:275})}));
describe('shared plot allocation',()=>{
 it('keeps existing standalone chart heights',()=>{
  const html=renderToStaticMarkup(<ChartViewport height={220}>{size=><span>{size.width}x{size.height}</span>}</ChartViewport>);
  expect(html).toContain('420x220');
 });
 it('measures the remaining plot area instead of reusing the full card height',()=>{
  const html=renderToStaticMarkup(<WidgetPresentationProvider appearance={{layout:'allocated'}}><ChartViewport height={220}>{size=><span>{size.width}x{size.height}</span>}</ChartViewport></WidgetPresentationProvider>);
  expect(html).toContain('420x275');
  expect(html).toContain('data-widget-plot="cartesian"');
 });
});

it('fits detached export geometry into the smaller plot without cropping axes',async()=>{
 const {fitCartesianSnapshot}=await import('../widget-plot-fit');
 const attributes:Record<string,string>={width:'420',height:'275'};
 const inner={style:{width:'420px',height:'275px'}};
 const svg={parentElement:inner,getAttribute:(name:string)=>attributes[name],setAttribute:(name:string,value:string)=>attributes[name]=value};
 fitCartesianSnapshot({querySelector:()=>svg,clientWidth:360,clientHeight:210} as any);
 expect(attributes).toEqual({width:'360',height:'210',viewBox:'0 0 420 275',preserveAspectRatio:'xMidYMid meet'});
 expect(inner.style).toEqual({width:'100%',height:'100%'});
});
