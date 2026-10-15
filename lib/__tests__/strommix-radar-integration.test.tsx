import EnergyDataNotice from "../../components/energy/EnergyDataNotice";
import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {galleryEntries} from '../widget-gallery';
import {widgetPresentationSource,widgetVariantFromQuery} from '../widget-appearance';
import {widgetDataDependencies} from '../widget-data.server';
import {radarObservation,radarDateRange,radarObservationPoints} from '../strommix-radar-source';
import RadarPage from '../../app/(embed)/embed/strommix-radar/page';
import LegacyPage from '../../app/(embed)/embed/strommix/page';
import {StrommixRadarEmbed} from '../../components/energy/StrommixRadarWidget';
import {WidgetHostProvider} from '../../components/dashboard/WidgetHost';
import {WidgetPresentationProvider} from '../../components/dashboard/WidgetPresentationContext';
import {useGenerationMix} from '../energy';
vi.mock('../energy',()=>({useGenerationMix:vi.fn(()=>({data:{data:[]},loading:false}))}));
vi.mock('../../components/dashboard/ExportableWidgetFrame',()=>({ExportableWidgetFrame:({widget,showHeading,surface,children}:{widget:{id:string};showHeading:boolean;surface:string;children:React.ReactNode})=><article data-surface={surface} data-id={widget.id} data-heading={String(showHeading)}>{children}</article>}));
const at='2026-10-13T17:00:00.000Z';
const points=[{ts:'2026-10-12T17:00:00Z',solar:2},{ts:'2026-10-13T16:45:00Z',solar:3},{ts:'2026-10-13T17:00:00Z',solar:4},{ts:'2026-10-13T17:15:00Z',solar:5}];
describe('registered Strommix radar',()=>{
 it('offers a real hero preview while preserving date and appearance through switches',()=>{
  const entry=galleryEntries({ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'}).find(e=>e.id==='strommix-radar')!;
  expect(entry.variants[0].src).toBe('/embed/strommix-radar');
  expect(entry.variants[0].heroSrc).toContain('presentation=hero');
  const src='/embed/strommix-radar?at='+encodeURIComponent(at)+'&theme=dark';
  const hero=widgetPresentationSource('strommix-radar',src,'hero');
  expect(widgetVariantFromQuery('strommix-radar',new URL(hero,'https://test.local').searchParams)).toBe('hero');
  expect(widgetPresentationSource('strommix-radar',hero,'full')).toBe(src);
 });
 it('hydrates only generation data, identically for full, hero and the legacy alias',()=>{
  for(const query of [{},{presentation:'hero'},{darstellung:'radar'}] as Record<string,string>[])expect(widgetDataDependencies('strommix-radar',query)).toEqual(['/api/energy/generation?country=de&hours=24']);
  expect(widgetDataDependencies('strommix',{darstellung:'radar'})).toEqual(widgetDataDependencies('strommix-radar',{}));
  expect(widgetDataDependencies('strommix',{})).toHaveLength(2);
  expect(widgetDataDependencies('strommix-radar',{at})).toEqual(['/api/energy/generation?country=de&start=2026-10-12&end=2026-10-13']);
 });
 it('does not mistake a share cache key for a frozen observation or substitute missing history',()=>{
  expect(radarObservation({stand:at})).toBeUndefined();
  expect(radarDateRange({at})).toEqual({start:'2026-10-12',end:'2026-10-13'});
  expect(radarObservationPoints(points,at)).toEqual(points.slice(1,3));
  expect(radarObservationPoints(points,'2026-10-13T16:00:00Z')).toEqual([]);
  expect(()=>radarObservation({at:'not-a-date'})).toThrow();
 });
 it('renders the compatibility address through the canonical page without changing its options',async()=>{
  const query={darstellung:'radar',presentation:'hero',theme:'dark'};
  expect(await LegacyPage({searchParams:Promise.resolve(query)})).toEqual(await RadarPage({searchParams:Promise.resolve(query)}));
 });
 it('uses each host selection instead of the surrounding page or another instance',()=>{
  const render=(query:Record<string,string>)=>renderToStaticMarkup(<WidgetHostProvider query={query} appearance={{theme:'dark'}}><WidgetPresentationProvider appearance={{theme:'dark',autoplay:false}}><StrommixRadarEmbed query={{presentation:'hero'}}/></WidgetPresentationProvider></WidgetHostProvider>);
  const full=render({at});
  expect(full).toContain('data-surface="card"');expect(full).toContain('data-id="strommix-radar"');expect(full).toContain('data-heading="true"');
  expect(useGenerationMix).toHaveBeenLastCalledWith('de',24,{start:'2026-10-12',end:'2026-10-13'});
  expect(render({presentation:'hero'})).toContain('data-heading="false"');
  expect(useGenerationMix).toHaveBeenLastCalledWith('de',24,undefined);
 });
});

describe('energy availability notice',()=>{
 it('only warns for stale data while retaining source details for exports',()=>{
  const details='Replacement source, observed at 08:15.';
  const current=renderToStaticMarkup(<EnergyDataNotice stale={false} details={details}/>);
  const stale=renderToStaticMarkup(<EnergyDataNotice stale details={details}/>);
  expect(current).not.toContain('Die Daten sind gerade nur verzögert verfügbar.');
  expect(stale).toContain('Die Daten sind gerade nur verzögert verfügbar.');
  expect(current).toContain(details);
  expect(stale).toContain(details);
 });
});
