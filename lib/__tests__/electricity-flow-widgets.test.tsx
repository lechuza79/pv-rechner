import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {PumpedStorageWidget,PhysicalTradeWidget} from '../../components/energy/ElectricityFlowWidgets';
import {widgetDataDependencies} from '../widget-data.server';
import {liveWidgetDataUrl} from '../widget-data-services';
vi.mock('../../components/dashboard/ExportableWidgetFrame',()=>({ExportableWidgetFrame:({children,widget}:{children:React.ReactNode;widget:{id:string}})=><article data-widget={widget.id}>{children}</article>}));
vi.mock('../energy',()=>({usePhysicalFlows:()=>({data:{snapshot:{ts:'2026-10-15T08:00:00Z',importGw:2,exportGw:1}},isStale:false}),useImportMix:()=>({data:{snapshot:null},loading:false,isStale:false})}));
describe('standalone electricity flow widgets',()=>{
 it('keeps absent storage power distinct from zero',()=>{
  const html=renderToStaticMarkup(<PumpedStorageWidget point={{ts:'2026-10-15T08:00:00Z',hydro_pumped_storage:0,solar:0}} renderedAt="2026-10-15T08:00:00Z"/>);
  expect(html).toContain('data-widget="pumpspeicher"');
  expect(html).toContain('–');
  expect(html).toContain('Abgabe');
  expect(html).toContain('>0<');
 });
 it('retains measured totals when category attribution is unavailable',()=>{
  const html=renderToStaticMarkup(<PhysicalTradeWidget/>);
  expect(html).toContain('data-widget="physischer-stromhandel"');
  expect(html).toContain('Aufteilung gerade nicht verfügbar.');
  expect(html).toContain('Gesamt: Import 2 GW, Export 1 GW');
 });
 it('prepares the same public data used by the client hooks',()=>{
  expect(widgetDataDependencies('pumpspeicher',{})).toEqual(['/api/energy/generation?country=de&hours=24']);
  const urls=widgetDataDependencies('physischer-stromhandel',{});
  expect(urls).toEqual(['/api/energy/physical-flows','/api/energy/import-mix']);
  for(const url of urls)expect(liveWidgetDataUrl(url).origin).toBe('https://solar-check.io');
 });
});
